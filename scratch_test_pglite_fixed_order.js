const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');

async function testPostgresExecution() {
    console.log('--- Testing PostgreSQL Execution with fixed GRANT order (in-memory) ---');
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

    let sql = fs.readFileSync('supabase/combined_setup.sql', 'utf8').replace(/^\uFEFF/, '');
    
    // Remove premature grants at line 50546
    sql = sql.replace(
        'GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;\nGRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;',
        '-- Premature grants removed for ordering test'
    );
    // Add grants after function definitions
    sql += `
        GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;
    `;

    try {
        await db.exec(sql);
        console.log('✅ Success! With GRANTs moved after functions, combined_setup.sql parsed and executed cleanly!');
        
        // Now let's test executing the core RPCs in PostgreSQL!
        // 1. Provision user
        const testUserId = '00000000-0000-0000-0000-000000000001';
        await db.query(`SELECT public.provision_authorized_user($1, 'المستخدم التجريبي', 'test@alamira.com')`, [testUserId]);
        console.log('✅ provision_authorized_user works');

        // Set JWT auth claim to testUserId
        await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

        // Test register_product_with_opening_stock
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

        // Check movement
        const movRes = await db.query(`SELECT movement_type, quantity_in, stock_balance_after FROM public.inventory_movements WHERE product_id = (SELECT id FROM public.products WHERE sku = 'TEST-SKU-001')`);
        console.log('✅ Movement recorded:', movRes.rows[0]);

        // Test delete_product on product with transactions (should fail!)
        try {
            await db.query(`SELECT public.delete_product((SELECT id FROM public.products WHERE sku = 'TEST-SKU-001'))`);
            console.log('❌ Error: delete_product should have failed due to opening balance movement!');
        } catch (delErr) {
            console.log('✅ delete_product correctly blocked product with opening balance movement:', delErr.message);
        }

        // Test archiving product
        const archRes = await db.query(`SELECT public.set_product_active_status((SELECT id FROM public.products WHERE sku = 'TEST-SKU-001'), false) as res`);
        console.log('✅ set_product_active_status (archive) result:', archRes.rows[0].res);

        // Test reactivating product
        const reactRes = await db.query(`SELECT public.set_product_active_status((SELECT id FROM public.products WHERE sku = 'TEST-SKU-001'), true) as res`);
        console.log('✅ set_product_active_status (reactivate) result:', reactRes.rows[0].res);

    } catch (err) {
        console.log('❌ Failed even with fixed order:', err.message);
        console.log('   Code:', err.code, 'Routine:', err.routine);
    }
}

testPostgresExecution();
