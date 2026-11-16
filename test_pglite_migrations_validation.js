// ==============================================================================
// AL AMIRA INVENTORY & INVOICING SYSTEM
// Real PostgreSQL Engine Comprehensive Validation Suite for SQL Migrations (PGlite)
// File: test_pglite_migrations_validation.js
// ==============================================================================

const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');

function logStep(step, msg) {
    console.log(`\n[TEST STEP ${step}] ${msg}`);
}

function assert(condition, message) {
    if (!condition) {
        console.error(`  ❌ فشل: ${message}`);
        throw new Error(message);
    }
    console.log(`  ✅ نجاح: ${message}`);
}

async function run() {
    console.log('================================================================');
    console.log('    بدء اختبارات التحقق من صحة ملفات الهجرة وقواعد الأمان');
    console.log('    PostgreSQL Engine Migration Validation & Security Audit (PGlite)');
    console.log('================================================================');

    const db = new PGlite();
    const versionRes = await db.query('SELECT version();');
    console.log(`محرك قاعدة البيانات المعزول: ${versionRes.rows[0].version}\n`);

    // --------------------------------------------------------------------------
    // 1. SETUP BASE ENVIRONMENT (Supabase Auth Mock & Core Schema)
    // --------------------------------------------------------------------------
    logStep(1, 'تهيئة بيئة Supabase Auth والمخطط المبدئي...');
    await db.exec(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE TABLE IF NOT EXISTS auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT now()
        );

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon NOLOGIN;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                CREATE ROLE authenticated NOLOGIN;
            END IF;
        END $$;

        CREATE OR REPLACE FUNCTION auth.uid()
        RETURNS UUID
        LANGUAGE sql STABLE
        AS $$
            SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
        $$;
    `);

    // Install base schema.sql
    const schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');
    await db.exec(schemaSql);

    // Install base functions & RLS
    const funcsSql = fs.readFileSync('supabase/functions.sql', 'utf8');
    await db.exec(funcsSql);
    const rlsSql = fs.readFileSync('supabase/rls.sql', 'utf8');
    await db.exec(rlsSql);

    assert(true, 'تم تثبيت المخطط الأساسي والدوال المرجعية وقواعد RLS بنجاح');

    // --------------------------------------------------------------------------
    // 2. POPULATE INITIAL REALISTIC BUSINESS DATA & SIMULATE EXISTING PRODUCTION GRANTS
    // --------------------------------------------------------------------------
    logStep(2, 'إدخال بيانات تجارية واقعية ومحاكاة صلاحيات الأعمدة السابقة بدقة...');
    const user1Id = '11111111-1111-1111-1111-111111111111';
    const user2Id = '22222222-2222-2222-2222-222222222222';

    await db.exec(`
        INSERT INTO auth.users (id, email) VALUES
        ('${user1Id}', 'manager@alamira.com'),
        ('${user2Id}', 'accountant@alamira.com')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.authorized_users (user_id, email, full_name, is_active) VALUES
        ('${user1Id}', 'manager@alamira.com', 'مدير النظام الأول', true),
        ('${user2Id}', 'accountant@alamira.com', 'مدير النظام الثاني', true)
        ON CONFLICT (user_id) DO NOTHING;
    `);

    // Deliberately reproduce legacy production baseline:
    // authenticated previously had column-level UPDATE on is_active and table DELETE
    await db.exec(`
        GRANT UPDATE (sku, name, category_id, unit, purchase_price, selling_price, min_stock_level, description, is_active, updated_at) 
        ON public.products TO authenticated;
        GRANT SELECT, INSERT, DELETE ON public.products TO authenticated;
    `);

    const preCheckActive = await db.query(`SELECT has_column_privilege('authenticated', 'public.products', 'is_active', 'UPDATE') as priv;`);
    assert(preCheckActive.rows[0].priv === true, 'تأكيد خط الأساس الإنتاجي السابق: authenticated يملك صلاحية UPDATE على is_active قبل الترقية');

    const preCheckDelete = await db.query(`SELECT has_table_privilege('authenticated', 'public.products', 'DELETE') as priv;`);
    assert(preCheckDelete.rows[0].priv === true, 'تأكيد خط الأساس الإنتاجي السابق: authenticated يملك صلاحية DELETE على products قبل الترقية');

    // Set auth context as User 1
    await db.exec(`SET request.jwt.claim.sub = '${user1Id}';`);

    // Insert category, products, customer, supplier
    const setupData = await db.query(`
        INSERT INTO public.categories (name, description)
        VALUES ('أدوات مكتبية', 'أدوات ومستلزمات مكتبية وتصوير')
        RETURNING id;
    `);
    const catId = setupData.rows[0].id;

    const prod1Res = await db.query(`
        INSERT INTO public.products (sku, name, category_id, unit, purchase_price, selling_price, min_stock_level, current_stock, is_active)
        VALUES ('PAP-A4', 'ورق تصوير A4', '${catId}', 'كرتونة', 100.00, 150.00, 5, 0, true)
        RETURNING id;
    `);
    const prod1Id = prod1Res.rows[0].id;

    const prod2Res = await db.query(`
        INSERT INTO public.products (sku, name, category_id, unit, purchase_price, selling_price, min_stock_level, current_stock, is_active)
        VALUES ('PEN-BLU', 'قلم جاف أزرق', '${catId}', 'علبة', 20.00, 30.00, 10, 0, true)
        RETURNING id;
    `);
    const prod2Id = prod2Res.rows[0].id;

    const custRes = await db.query(`
        INSERT INTO public.customers (name, phone, address)
        VALUES ('شركة الأهرام للتوزيع', '01012345678', 'القاهرة')
        RETURNING id;
    `);
    const custId = custRes.rows[0].id;

    const suppRes = await db.query(`
        INSERT INTO public.suppliers (name, phone, address)
        VALUES ('مصنع أوراق مصر', '01198765432', 'الإسكندرية')
        RETURNING id;
    `);
    const suppId = suppRes.rows[0].id;

    // Approve initial receipt for Product 1 (50 units)
    const receiptRes = await db.query(`
        INSERT INTO public.stock_receipts (receipt_number, receipt_date, supplier_id, created_by)
        VALUES ('REC-INIT-001', CURRENT_DATE, '${suppId}', '${user1Id}')
        RETURNING id;
    `);
    const receiptId = receiptRes.rows[0].id;

    await db.query(`
        INSERT INTO public.stock_receipt_items (receipt_id, product_id, quantity, unit_price, line_total)
        VALUES ('${receiptId}', '${prod1Id}', 50, 100.00, 5000.00);
    `);

    await db.query(`SELECT public.approve_stock_receipt('${receiptId}');`);

    const checkStock1 = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(checkStock1.rows[0].current_stock) === 50, 'تم إثبات رصيد الصنف الأول بـ 50 وحدة عبر إذن إضافة معتمد');

    // --------------------------------------------------------------------------
    // 3. EXECUTE MIGRATION 1: migration_decimal_quantities.sql
    // --------------------------------------------------------------------------
    logStep(3, 'تطبيق ملف الترقية الأول: migration_decimal_quantities.sql...');
    const mig1Sql = fs.readFileSync('supabase/migration_decimal_quantities.sql', 'utf8');
    await db.exec(mig1Sql);
    assert(true, 'تم تنفيذ migration_decimal_quantities.sql بنجاح تام');

    // Verify allows_decimal_quantity column added
    const colCheck = await db.query(`
        SELECT column_name, data_type, numeric_precision, numeric_scale 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'allows_decimal_quantity';
    `);
    assert(colCheck.rows.length === 1, 'تمت إضافة عمود allows_decimal_quantity إلى جدول products');

    // Verify existing stock preserved exactly at 50.000
    const stockAfterMig1 = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(stockAfterMig1.rows[0].current_stock) === 50.000, 'رصيد الصنف لم يتأثر بعملية الترقية وظل 50.000 بدقة');

    // Test Integer Constraint on Integer-Only Product
    let integerCheckFailed = false;
    try {
        await db.query(`UPDATE public.products SET min_stock_level = 5.5 WHERE id = '${prod1Id}';`);
    } catch (err) {
        integerCheckFailed = true;
        assert(err.message.includes('chk_products_integer_stock_if_not_decimal'), 'تم رفض كسر عشري (5.5) في حد أمان صنف يباع بالعدد الصحيح بواسطة قيد CHECK');
    }
    assert(integerCheckFailed, 'قيد الأعداد الصحيحة يمنع الكسور للأصناف غير الكسرية');

    // Test Decimal Product Acceptance
    await db.query(`UPDATE public.products SET allows_decimal_quantity = true, min_stock_level = 10.250 WHERE id = '${prod1Id}';`);
    const decStockCheck = await db.query(`SELECT min_stock_level FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(decStockCheck.rows[0].min_stock_level) === 10.250, 'تم قبول كسر عشري (10.250) لصنف يقبل الكسور العشرية (allows_decimal_quantity = true)');

    // Reset back for standard flow
    await db.query(`UPDATE public.products SET allows_decimal_quantity = false, min_stock_level = 5.000 WHERE id = '${prod1Id}';`);

    // TEST: Document with identical product in multiple lines (Receipt)
    logStep('3-B', 'اختبار اعتماد إذن إضافة يحتوي على نفس الصنف مرتين (التحقق من دقة القفل والجمع وعدم ركود الرصيد)...');
    const multiRecRes = await db.query(`
        INSERT INTO public.stock_receipts (receipt_number, receipt_date, supplier_id, created_by)
        VALUES ('REC-MULTI-001', CURRENT_DATE, '${suppId}', '${user1Id}')
        RETURNING id;
    `);
    const multiRecId = multiRecRes.rows[0].id;
    await db.query(`
        INSERT INTO public.stock_receipt_items (receipt_id, product_id, quantity, unit_price, line_total)
        VALUES 
            ('${multiRecId}', '${prod1Id}', 10.000, 100.00, 1000.00),
            ('${multiRecId}', '${prod1Id}', 5.000, 100.00, 500.00);
    `);
    await db.query(`SELECT public.approve_stock_receipt('${multiRecId}');`);
    const stockAfterMultiRec = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(stockAfterMultiRec.rows[0].current_stock) === 65.000, 'إذن الإضافة متعدد البنود لنفس الصنف تم اعتماده بدقة (50 + 10 + 5 = 65.000)');

    // TEST: Double Approval Prevention on Receipt
    let doubleApproveReceiptBlocked = false;
    try {
        await db.query(`SELECT public.approve_stock_receipt('${multiRecId}');`);
    } catch (err) {
        doubleApproveReceiptBlocked = true;
        assert(err.message.includes('معتمد مسبقاً'), 'رفع استثناء منع الاعتماد المزدوج لإذن الإضافة');
    }
    assert(doubleApproveReceiptBlocked, 'تم منع إعادة اعتماد إذن إضافة معتمد مسبقاً بنجاح');

    // TEST: Stock Issue with Multiple Lines of same product
    logStep('3-C', 'اختبار اعتماد إذن صرف وتجربة تجاوز الرصيد المتاح...');
    const issueRes = await db.query(`
        INSERT INTO public.stock_issues (issue_number, issue_date, recipient_name, reason, created_by)
        VALUES ('ISS-TEST-001', CURRENT_DATE, 'أحمد محمود', 'صرف تجريبي للمشروع', '${user1Id}')
        RETURNING id;
    `);
    const issueId = issueRes.rows[0].id;
    await db.query(`
        INSERT INTO public.stock_issue_items (issue_id, product_id, quantity)
        VALUES ('${issueId}', '${prod1Id}', 15.000);
    `);
    await db.query(`SELECT public.approve_stock_issue('${issueId}');`);
    const stockAfterIssue = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(stockAfterIssue.rows[0].current_stock) === 50.000, 'تم صرف 15 وحدة بنجاح وتناقص الرصيد إلى 50.000 بدقة');

    // Test Insufficient Stock on Issue
    const overIssueRes = await db.query(`
        INSERT INTO public.stock_issues (issue_number, issue_date, recipient_name, reason, created_by)
        VALUES ('ISS-OVER-001', CURRENT_DATE, 'أحمد محمود', 'صرف زائد يتجاوز الرصيد', '${user1Id}')
        RETURNING id;
    `);
    const overIssueId = overIssueRes.rows[0].id;
    await db.query(`
        INSERT INTO public.stock_issue_items (issue_id, product_id, quantity)
        VALUES ('${overIssueId}', '${prod1Id}', 9999.000);
    `);
    let overIssueBlocked = false;
    try {
        await db.query(`SELECT public.approve_stock_issue('${overIssueId}');`);
    } catch (err) {
        overIssueBlocked = true;
        assert(err.message.includes('رصيد غير كاف'), 'رفع استثناء عدم كفاية الرصيد في إذن الصرف');
    }
    assert(overIssueBlocked, 'تم منع صرف كمية تتجاوز رصيد المخزن المتاح');

    // Test repeat execution of Migration 1 (Idempotency)
    await db.exec(mig1Sql);
    assert(true, 'إعادة تنفيذ migration_decimal_quantities.sql نجحت بدون أخطاء (Idempotent)');

    // --------------------------------------------------------------------------
    // 4. EXECUTE MIGRATION 2: migration_product_lifecycle.sql
    // --------------------------------------------------------------------------
    logStep(4, 'تطبيق ملف الترقية الثاني: migration_product_lifecycle.sql...');
    const mig2Sql = fs.readFileSync('supabase/migration_product_lifecycle.sql', 'utf8');
    await db.exec(mig2Sql);
    assert(true, 'تم تنفيذ migration_product_lifecycle.sql بنجاح تام');

    // Test Permanent Deletion: Product 2 (Zero stock, no movements)
    const delRes = await db.query(`SELECT public.delete_product('${prod2Id}');`);
    const delJson = delRes.rows[0].delete_product;
    assert(delJson.success === true, 'تم حذف الصنف ذو الرصيد الصفري وبدون حركات نهائياً بنجاح');

    // Test Deletion BLOCKED on Product 1 (has stock and movements)
    let delBlockedStock = false;
    try {
        await db.query(`SELECT public.delete_product('${prod1Id}');`);
    } catch (err) {
        delBlockedStock = true;
        assert(err.message.includes('لا يمكن حذف الصنف') && err.message.includes('رصيد مخزون'), 'رفع الاستثناء الرقابي المانع لحذف صنف لديه رصيد');
    }
    assert(delBlockedStock, 'تم منع حذف الصنف ذو الرصيد الإيجابي بنجاح');

    // Test Direct SQL Deletion BLOCKED by Trigger
    let directSqlDeleteBlocked = false;
    try {
        await db.query(`DELETE FROM public.products WHERE id = '${prod1Id}';`);
    } catch (err) {
        directSqlDeleteBlocked = true;
        assert(err.message.includes('لا يمكن حذف الصنف'), 'مشغل الحماية trg_prevent_direct_product_deletion حجب الحذف المباشر بنجاح');
    }
    assert(directSqlDeleteBlocked, 'محاولة الحذف المباشر عبر SQL محجوبة بالكامل عبر مشغل الرقابة');

    // Test Archiving & Reactivation
    await db.query(`SELECT public.set_product_active_status('${prod1Id}', false);`);
    const activeCheck = await db.query(`SELECT is_active FROM public.products WHERE id = '${prod1Id}';`);
    assert(activeCheck.rows[0].is_active === false, 'تم أرشفة/تعطيل الصنف بنجاح (is_active = false)');

    // Test that Archived Product CANNOT be used in new approved sales invoice
    const invRes = await db.query(`
        INSERT INTO public.sales_invoices (invoice_number, invoice_date, customer_id, created_by)
        VALUES ('INV-TEST-001', CURRENT_DATE, '${custId}', '${user1Id}')
        RETURNING id;
    `);
    const invId = invRes.rows[0].id;

    await db.query(`
        INSERT INTO public.sales_invoice_items (
            invoice_id, product_id, product_sku_snapshot, product_name_snapshot, unit_snapshot,
            quantity, unit_price, gross_amount, discount_type, discount_value, discount_amount, net_amount
        ) VALUES (
            '${invId}', '${prod1Id}', 'PAP-A4', 'ورق تصوير A4', 'كرتونة',
            5.000, 150.00, 750.00, 'none', 0, 0, 750.00
        );
    `);

    let archivedSaleBlocked = false;
    try {
        await db.query(`SELECT public.approve_sales_invoice('${invId}');`);
    } catch (err) {
        archivedSaleBlocked = true;
        assert(err.message.includes('موقوف/مؤرشف'), 'رفع الاستثناء الرقابي لمنع بيع صنف مؤرشف');
    }
    assert(archivedSaleBlocked, 'تم منع اعتماد فاتورة بيع لصنف مؤرشف بنجاح');

    // Reactivate product and approve invoice
    await db.query(`SELECT public.set_product_active_status('${prod1Id}', true);`);
    await db.query(`SELECT public.approve_sales_invoice('${invId}');`);
    const stockAfterSale = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(stockAfterSale.rows[0].current_stock) === 45.000, 'بعد إعادة التفعيل، تم اعتماد الفاتورة وتناقص الرصيد إلى 45.000 بدقة');

    // Double approval prevention on sales invoice
    let doubleApproveInvBlocked = false;
    try {
        await db.query(`SELECT public.approve_sales_invoice('${invId}');`);
    } catch (err) {
        doubleApproveInvBlocked = true;
        assert(err.message.includes('معتمدة مسبقاً'), 'رفع استثناء منع الاعتماد المزدوج لفاتورة المبيعات');
    }
    assert(doubleApproveInvBlocked, 'تم منع إعادة اعتماد فاتورة مبيعات معتمدة بنجاح');

    // Cancel sales invoice and verify reversal
    logStep('4-B', 'اختبار إلغاء فاتورة مبيعات معتمدة والتحقق من حركة العكس Reversal واسترداد الرصيد...');
    await db.query(`SELECT public.cancel_sales_invoice('${invId}', 'إلغاء تجريبي لفحص استرداد المخزون');`);
    const stockAfterCancel = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prod1Id}';`);
    assert(Number(stockAfterCancel.rows[0].current_stock) === 50.000, 'استرداد رصيد المخزن كاملاً بعد إلغاء الفاتورة (45 + 5 = 50.000)');

    const cancelMovCheck = await db.query(`
        SELECT movement_type, quantity_in, source_doc_type, stock_balance_after 
        FROM public.inventory_movements 
        WHERE source_doc_id = '${invId}' AND movement_type = 'reversal';
    `);
    assert(cancelMovCheck.rows.length === 1 && Number(cancelMovCheck.rows[0].quantity_in) === 5.000, 'تم قيد حركة reversal رسمية في سجل الحركات');

    // Test repeat execution of Migration 2 (Idempotency)
    await db.exec(mig2Sql);
    assert(true, 'إعادة تنفيذ migration_product_lifecycle.sql نجحت بدون أخطاء (Idempotent)');

    // --------------------------------------------------------------------------
    // 5. EXECUTE MIGRATION 3: migration_opening_balance.sql
    // --------------------------------------------------------------------------
    logStep(5, 'تطبيق ملف الترقية الثالث: migration_opening_balance.sql...');
    const mig3Sql = fs.readFileSync('supabase/migration_opening_balance.sql', 'utf8');
    await db.exec(mig3Sql);
    assert(true, 'تم تنفيذ migration_opening_balance.sql بنجاح تام');

    // Test Atomic Product Registration with Positive Opening Stock
    const regRes = await db.query(`
        SELECT public.register_product_with_opening_stock(
            'TONER-85A',
            'حبارة ليزر HP 85A متوافقة',
            'قطعة',
            15.000,
            false,
            '${catId}',
            250.00,
            350.00,
            5.000,
            'حبارة أصلية ومضمونة'
        );
    `);
    const regJson = regRes.rows[0].register_product_with_opening_stock;
    assert(regJson.success === true, 'تم تسجيل صنف جديد برصيد افتتاحي 15 وحدة بنجاح ذري');
    const newProdId = regJson.product_id;

    // Verify balance & audited movements
    const checkNewProd = await db.query(`SELECT current_stock FROM public.products WHERE id = '${newProdId}';`);
    assert(Number(checkNewProd.rows[0].current_stock) === 15.000, 'تم إثبات الرصيد الافتتاحي للصنف الجديد بدقة');

    const checkMov = await db.query(`
        SELECT quantity_in, source_doc_type, stock_balance_after 
        FROM public.inventory_movements 
        WHERE product_id = '${newProdId}';
    `);
    assert(checkMov.rows.length === 1, 'تم قيد حركة مخزنية رسمية معصومة في inventory_movements');
    assert(Number(checkMov.rows[0].quantity_in) === 15 && checkMov.rows[0].source_doc_type === 'inventory_adjustment', 'الحركة منسوبة لتسوية جردية / رصيد افتتاحي');

    // Test Atomic Rollback on Error (Duplicate SKU)
    let dupFailed = false;
    try {
        await db.query(`
            SELECT public.register_product_with_opening_stock(
                'TONER-85A',
                'صنف مكرر',
                'قطعة',
                10.000,
                false,
                '${catId}',
                100, 200, 5, null
            );
        `);
    } catch (err) {
        dupFailed = true;
        assert(err.message.includes('مسجل مسبقاً'), 'رفع استثناء تكرار الكود SKU');
    }
    assert(dupFailed, 'تم منع تسجيل صنف مكرر الكود والعملية تراجعت بالكامل (Rollback)');

    // Test Atomic Rollback on Fractional Quantity for Integer Product
    let fracFailed = false;
    try {
        await db.query(`
            SELECT public.register_product_with_opening_stock(
                'INT-FRAC-FAIL',
                'صنف صحيح برصيد كسري',
                'قطعة',
                3.750,
                false, -- integer only
                '${catId}',
                50, 80, 5, null
            );
        `);
    } catch (err) {
        fracFailed = true;
        assert(err.message.includes('بوحدات صحيحة فقط'), 'رفع استثناء الكسر العشري');
    }
    assert(fracFailed, 'تم رفض الرصيد الكسري لصنف صحيح والتراجع الذري');

    // Confirm that INT-FRAC-FAIL does NOT exist in products (Clean Rollback)
    const ghostCheck = await db.query(`SELECT 1 FROM public.products WHERE sku = 'INT-FRAC-FAIL';`);
    assert(ghostCheck.rows.length === 0, 'التراجع الذري مؤكد: الصنف المرفوض لم يبقَ له أي أثر في جدول المنتجات');

    // Test Duplicate Opening Stock Registration on Existing Product
    let dupOpeningBlocked = false;
    try {
        await db.query(`SELECT public.register_opening_stock('${newProdId}', 20.000);`);
    } catch (err) {
        dupOpeningBlocked = true;
        assert(err.message.includes('لديه رصيد حالي بالفعل') || err.message.includes('حركات سابقة'), 'رفع استثناء منع تكرار تسجيل الرصيد الافتتاحي');
    }
    assert(dupOpeningBlocked, 'تم منع تسجيل رصيد افتتاحي لصنف مسجل له رصيد أو حركات سابقة');

    // Test Zero/Negative Quantity on register_opening_stock
    let zeroOpeningBlocked = false;
    try {
        await db.query(`SELECT public.register_opening_stock('${prod1Id}', 0.000);`);
    } catch (err) {
        zeroOpeningBlocked = true;
    }
    assert(zeroOpeningBlocked, 'تم رفض تمرير رصيد افتتاحي صفري أو سالب');

    // Test repeat execution of Migration 3 (Idempotency)
    await db.exec(mig3Sql);
    assert(true, 'إعادة تنفيذ migration_opening_balance.sql نجحت بدون أخطاء (Idempotent)');

    // --------------------------------------------------------------------------
    // 6. EXECUTE MIGRATION 4: migration_fix_permissions_and_ddl.sql
    // --------------------------------------------------------------------------
    logStep(6, 'تطبيق ملف الترقية الرابع: migration_fix_permissions_and_ddl.sql...');
    const mig4Sql = fs.readFileSync('supabase/migration_fix_permissions_and_ddl.sql', 'utf8');
    await db.exec(mig4Sql);
    assert(true, 'تم تنفيذ migration_fix_permissions_and_ddl.sql بنجاح تام');

    // Test repeat execution of Migration 4 (Idempotency)
    await db.exec(mig4Sql);
    assert(true, 'إعادة تنفيذ migration_fix_permissions_and_ddl.sql نجحت بدون أخطاء (Idempotent)');

    // --------------------------------------------------------------------------
    // 7. SECURITY & PRIVILEGE ENFORCEMENT AUDIT (WITH has_column_privilege)
    // --------------------------------------------------------------------------
    logStep(7, 'تدقيق واختبار أمان الصلاحيات الفعالة عبر has_column_privilege وحماية الرصيد...');

    // Audit Effective Column Privileges via has_column_privilege
    const checkActivePriv = await db.query(`SELECT has_column_privilege('authenticated', 'public.products', 'is_active', 'UPDATE') as priv;`);
    assert(checkActivePriv.rows[0].priv === false, 'تم التحقق عبر has_column_privilege: صلاحية UPDATE على is_active ملغاة ومسحوبة بنجاح (false)');

    const checkStockPriv = await db.query(`SELECT has_column_privilege('authenticated', 'public.products', 'current_stock', 'UPDATE') as priv;`);
    assert(checkStockPriv.rows[0].priv === false, 'تم التحقق عبر has_column_privilege: صلاحية UPDATE على current_stock ملغاة ومسحوبة بنجاح (false)');

    const checkDeletePriv = await db.query(`SELECT has_table_privilege('authenticated', 'public.products', 'DELETE') as priv;`);
    assert(checkDeletePriv.rows[0].priv === false, 'تم التحقق عبر has_table_privilege: صلاحية DELETE على جدول products مسحوبة ومحجوبة بنجاح (false)');

    const checkNamePriv = await db.query(`SELECT has_column_privilege('authenticated', 'public.products', 'name', 'UPDATE') as priv;`);
    assert(checkNamePriv.rows[0].priv === true, 'تم التحقق عبر has_column_privilege: صلاحية UPDATE على الحقول الوصفية المسموحة (name) باقية ونشطة (true)');

    const checkDecimalPriv = await db.query(`SELECT has_column_privilege('authenticated', 'public.products', 'allows_decimal_quantity', 'UPDATE') as priv;`);
    assert(checkDecimalPriv.rows[0].priv === true, 'تم التحقق عبر has_column_privilege: صلاحية UPDATE على allows_decimal_quantity ممنوحة ونشطة (true)');

    // Switch session to role 'authenticated'
    await db.exec(`SET ROLE authenticated;`);
    await db.exec(`SET request.jwt.claim.sub = '${user1Id}';`);

    // A. Attempt DIRECT stock update as authenticated user
    let directUpdateBlocked = false;
    try {
        await db.query(`UPDATE public.products SET current_stock = 9999 WHERE id = '${newProdId}';`);
    } catch (err) {
        directUpdateBlocked = true;
        assert(err.message.includes('permission denied for column') || err.message.includes('permission denied'), 'تم حجب التعديل المباشر على رصيد المخزون برفض الصلاحية (42501)');
    }
    assert(directUpdateBlocked, 'المستخدم الموثق لا يملك صلاحية تعديل رصيد المخزون إطلاقاً (Column-Level DAC)');

    // B. Attempt to tamper via GUC alamira.stock_movement_in_progress
    let gucTamperBlocked = false;
    try {
        await db.exec(`SET LOCAL alamira.stock_movement_in_progress = '1';`);
        await db.query(`UPDATE public.products SET current_stock = 8888 WHERE id = '${newProdId}';`);
    } catch (err) {
        gucTamperBlocked = true;
    }
    assert(gucTamperBlocked, 'محاولة التلاعب بتعيين GUC ثم تعديل الرصيد ظلت محجوبة تماماً بفضل حجب صلاحية العمود وحماية المشغل');

    // C. Attempt DIRECT modification of is_active as authenticated user
    let directActiveUpdateBlocked = false;
    try {
        await db.query(`UPDATE public.products SET is_active = false WHERE id = '${newProdId}';`);
    } catch (err) {
        directActiveUpdateBlocked = true;
        assert(err.message.includes('permission denied for column') || err.message.includes('permission denied'), 'تم حجب التعديل المباشر لحقل is_active برفض الصلاحية (42501)');
    }
    assert(directActiveUpdateBlocked, 'تعديل حالة تفعيل الصنف محظور كلياً عبر UPDATE المباشر ويقتصر على RPC');

    // D. Attempt DIRECT table deletion as authenticated user
    let directTableDeleteBlocked = false;
    try {
        await db.query(`DELETE FROM public.products WHERE id = '${newProdId}';`);
    } catch (err) {
        directTableDeleteBlocked = true;
        assert(err.message.includes('permission denied for table') || err.message.includes('permission denied'), 'تم حجب حذف الأصناف المباشر برفض الصلاحية (42501)');
    }
    assert(directTableDeleteBlocked, 'حذف الأصناف محظور كلياً عبر DELETE المباشر ويقتصر على delete_product RPC');

    // E. Verify legitimate metadata update SUCCEEDS for authenticated user
    await db.query(`UPDATE public.products SET selling_price = 375.00 WHERE id = '${newProdId}';`);
    const priceCheck = await db.query(`SELECT selling_price FROM public.products WHERE id = '${newProdId}';`);
    assert(Number(priceCheck.rows[0].selling_price) === 375.00, 'تحديث سعر البيع (حقل غير رصيدي) مسموح وناجح');

    // F. Verify authorized RPC set_product_active_status SUCCEEDS for authenticated user
    const rpcArchiveRes = await db.query(`SELECT public.set_product_active_status('${newProdId}', false);`);
    assert(rpcArchiveRes.rows[0].set_product_active_status.success === true, 'المستخدم الموثق يستطيع أرشفة الصنف بنجاح عبر RPC المصرح به');

    const rpcReactivateRes = await db.query(`SELECT public.set_product_active_status('${newProdId}', true);`);
    assert(rpcReactivateRes.rows[0].set_product_active_status.success === true, 'المستخدم الموثق يستطيع إعادة تفعيل الصنف بنجاح عبر RPC المصرح به');

    // G. Attempt to tamper with inventory_movements (Immutable Ledger)
    let movementTamperBlocked = false;
    try {
        await db.query(`DELETE FROM public.inventory_movements WHERE product_id = '${newProdId}';`);
    } catch (err) {
        movementTamperBlocked = true;
    }
    assert(movementTamperBlocked, 'سجل حركات المخزون معصوم ومحمي بالكامل من الحذف أو التعديل');

    // H. Test 'anon' role is strictly BLOCKED from tables and RPCs
    await db.exec(`SET ROLE anon;`);
    let anonTableBlocked = false;
    try {
        await db.query(`SELECT * FROM public.products;`);
    } catch (err) {
        anonTableBlocked = true;
    }
    assert(anonTableBlocked, 'المستخدم غير المسجل (anon) محجوب تماماً عن قراءة الجداول وفق مبدأ Zero-Trust');

    // Reset role to postgres
    await db.exec(`RESET ROLE;`);

    // I. Verify core extension functions still work (gen_random_uuid)
    const uuidRes = await db.query(`SELECT gen_random_uuid() AS uuid;`);
    assert(uuidRes.rows[0].uuid.length === 36, 'الدوال المساعدة العامة (gen_random_uuid) سليمة وغير متأثرة بالحجب المستهدف');

    console.log('\n================================================================');
    console.log('🎉 اكتملت جميع اختبارات محرك PostgreSQL لملفات الترقية بنسبة 100%');
    console.log('================================================================');
}

run().catch(err => {
    console.error('\n❌ فشل الاختبار العام:', err);
    process.exit(1);
});
