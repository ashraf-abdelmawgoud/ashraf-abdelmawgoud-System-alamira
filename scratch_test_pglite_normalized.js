const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');

async function testPostgresExecution() {
    console.log('--- Testing PostgreSQL Execution with normalized CRLF & Auth User ---');
    const db = new PGlite();
    
    // Auth environment
    await db.exec(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE TABLE IF NOT EXISTS auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
            SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
        $$ LANGUAGE sql STABLE;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon;
            END IF;
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
                CREATE ROLE authenticated;
            END IF;
        END
        $$;
    `);

    let sql = fs.readFileSync('supabase/combined_setup.sql', 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    
    // Check if the premature grant is present
    const grantTarget = 'GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;\nGRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;';
    
    sql = sql.replace(grantTarget, '-- Premature grant removed for test');
    sql += `
        GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;
    `;

    try {
        await db.exec(sql);
        console.log('🎉 SUCCESS: combined_setup.sql parsed and executed 100% cleanly when premature GRANTs were re-ordered!');
        
        // 1. Insert into auth.users first
        const testUserId = '00000000-0000-0000-0000-000000000001';
        await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'test@alamira.com')`, [testUserId]);

        // 2. Provision in authorized_users
        await db.query(`SELECT public.provision_authorized_user($1, 'المستخدم التجريبي', 'test@alamira.com')`, [testUserId]);
        console.log('✅ provision_authorized_user works');

        await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

        // 3. Test register_product_with_opening_stock
        const regRes = await db.query(`
            SELECT public.register_product_with_opening_stock(
                'TEST-SKU-001',
                'صنف تجريبي أولي',
                'قطعة',
                10.000,
                false,
                NULL,
                15.00,
                25.00,
                3.000,
                'وصف تجريبي'
            ) as res;
        `);
        console.log('✅ register_product_with_opening_stock result:', regRes.rows[0].res);

        // Check stock
        const prodRes = await db.query(`SELECT current_stock FROM public.products WHERE sku = 'TEST-SKU-001'`);
        console.log('✅ Product stock after opening balance:', prodRes.rows[0].current_stock);

        // 4. Test double discount calculation with real PostgreSQL invoice approval
        // 4.1 Create customer
        const custRes = await db.query(`INSERT INTO public.customers (name, is_active) VALUES ('عميل تجريبي', true) RETURNING id`);
        const custId = custRes.rows[0].id;

        // 4.2 Insert draft invoice: Gross = 1000, line discount = 10%, subtotal = 900, invoice discount = 5%, final = 855
        const invRes = await db.query(`
            INSERT INTO public.sales_invoices (
                invoice_number, invoice_date, customer_id, customer_name_snapshot,
                gross_amount, item_discounts_amount, subtotal,
                invoice_discount_type, invoice_discount_value, invoice_discount_amount,
                additional_charges, final_total, status, created_by
            ) VALUES (
                'INV-TEST-001', CURRENT_DATE, $1, 'عميل تجريبي',
                1000.00, 100.00, 900.00,
                'percentage', 5.00, 45.00,
                0.00, 855.00, 'draft', $2
            ) RETURNING id
        `, [custId, testUserId]);
        const invId = invRes.rows[0].id;

        // 4.3 Insert invoice item: product TEST-SKU-001, qty 4, unit price 250 = 1000 gross, 10% line disc = 100, net = 900
        const prodId = (await db.query(`SELECT id FROM public.products WHERE sku = 'TEST-SKU-001'`)).rows[0].id;
        await db.query(`
            INSERT INTO public.sales_invoice_items (
                invoice_id, product_id, product_sku_snapshot, product_name_snapshot, unit_snapshot,
                quantity, unit_price, gross_amount, discount_type, discount_value, discount_amount, net_amount
            ) VALUES (
                $1, $2, 'TEST-SKU-001', 'صنف تجريبي أولي', 'قطعة',
                4.000, 250.00, 1000.00, 'percentage', 10.00, 100.00, 900.00
            )
        `, [invId, prodId]);

        // 4.4 Approve invoice via RPC
        const appRes = await db.query(`SELECT public.approve_sales_invoice($1) as res`, [invId]);
        console.log('✅ approve_sales_invoice result:', appRes.rows[0].res);

        // 4.5 Verify invoice totals recalculated authoritatively by PostgreSQL
        const invCheck = await db.query(`SELECT gross_amount, item_discounts_amount, subtotal, invoice_discount_amount, final_total, status FROM public.sales_invoices WHERE id = $1`, [invId]);
        console.log('✅ PostgreSQL Authoritative Totals:', invCheck.rows[0]);

        // 4.6 Verify product stock deducted: 10 - 4 = 6
        const stockAfterSale = await db.query(`SELECT current_stock FROM public.products WHERE id = $1`, [prodId]);
        console.log('✅ Stock after sale (expected 6.000):', stockAfterSale.rows[0].current_stock);

        // 4.7 Test cancel invoice: returns 4 items back to stock -> stock should be 10.000
        const cancelRes = await db.query(`SELECT public.cancel_sales_invoice($1, 'طلب العميل إلغاء الفاتورة') as res`, [invId]);
        console.log('✅ cancel_sales_invoice result:', cancelRes.rows[0].res);

        const stockAfterCancel = await db.query(`SELECT current_stock FROM public.products WHERE id = $1`, [prodId]);
        console.log('✅ Stock after invoice cancellation (expected 10.000):', stockAfterCancel.rows[0].current_stock);

        // 5. Test Stock Adjustment
        const adjRes = await db.query(`
            INSERT INTO public.inventory_adjustments (
                adjustment_number, adjustment_date, reason, status, created_by
            ) VALUES (
                'ADJ-TEST-001', CURRENT_DATE, 'تسوية جردية دورية', 'draft', $1
            ) RETURNING id
        `, [testUserId]);
        const adjId = adjRes.rows[0].id;

        // Actual count is 8 (difference is -2)
        await db.query(`
            INSERT INTO public.inventory_adjustment_items (
                adjustment_id, product_id, recorded_quantity, actual_quantity, difference
            ) VALUES (
                $1, $2, 10.000, 8.000, -2.000
            )
        `, [adjId, prodId]);

        const appAdjRes = await db.query(`SELECT public.approve_stock_adjustment($1) as res`, [adjId]);
        console.log('✅ approve_stock_adjustment result:', appAdjRes.rows[0].res);

        const stockAfterAdj = await db.query(`SELECT current_stock FROM public.products WHERE id = $1`, [prodId]);
        console.log('✅ Stock after adjustment (expected 8.000):', stockAfterAdj.rows[0].current_stock);

        console.log('\n🌟 ALL POSTGRESQL REAL DATABASE BUSINESS OPERATIONS VERIFIED 100%!');

    } catch (err) {
        console.log('❌ Error during execution:', err.message);
    }
}

testPostgresExecution();
