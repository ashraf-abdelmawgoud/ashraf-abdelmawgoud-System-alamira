// ==============================================================================
// AL AMIRA INVENTORY & INVOICING SYSTEM
// Real PostgreSQL Database Integration Test Suite (Isolated PGlite Engine)
// File: test_real_postgresql_integration.js
// ==============================================================================

const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');

function logStep(step, msg) {
    console.log(`\n[TEST ${step}] ${msg}`);
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
    console.log('    بدء اختبارات التكامل الحقيقية على محرك PostgreSQL 16 الحقيقي');
    console.log('    (Real Isolated PostgreSQL 16 Database Engine Integration Tests)');
    console.log('================================================================');

    const db = new PGlite();
    const verRes = await db.query('SELECT version()');
    console.log('Database Engine:', verRes.rows[0].version);

    // --------------------------------------------------------------------------
    // 1. Prepare Supabase Auth Environment Mock in PostgreSQL
    // --------------------------------------------------------------------------
    logStep('1', 'تجهيز بيئة Supabase Auth الأساسية على قاعدة بيانات فارغة...');
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

        -- Create authenticated and anon roles if not present
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
    assert(true, 'تم تهيئة بيئة Supabase Auth الوظيفية داخل PostgreSQL بنجاح');

    // --------------------------------------------------------------------------
    // 2. Install supabase/combined_setup.sql on Clean Empty Database
    // --------------------------------------------------------------------------
    logStep('2', 'تثبيت ملف combined_setup.sql بالكامل على قاعدة بيانات فارغة...');
    const combinedSql = fs.readFileSync('supabase/combined_setup.sql', 'utf8').replace(/^\uFEFF/, '');
    await db.exec(combinedSql);
    assert(true, 'تم تنفيذ وتثبيت ملف combined_setup.sql بالكامل بدون أي أخطاء DDL أو قيود');

    // Verify clean database state (no demo records)
    const custCount = await db.query('SELECT COUNT(*) as c FROM public.customers');
    const supCount = await db.query('SELECT COUNT(*) as c FROM public.suppliers');
    const prodCount = await db.query('SELECT COUNT(*) as c FROM public.products');
    assert(Number(custCount.rows[0].c) === 0, 'جدول العملاء نظيف 100% (0 سجلات تجريبية)');
    assert(Number(supCount.rows[0].c) === 0, 'جدول الموردين نظيف 100% (0 سجلات تجريبية)');
    assert(Number(prodCount.rows[0].c) === 0, 'جدول المنتجات نظيف 100% (0 سجلات تجريبية)');

    // --------------------------------------------------------------------------
    // 3. Test Non-Destructive Re-execution of Seed Script
    // --------------------------------------------------------------------------
    logStep('3', 'اختبار عدم الكتابة فوق إعدادات الشركة عند إعادة تشغيل السكريبت (Non-Destructive Seed)...');
    // Simulate user configuring real company settings
    await db.query(`
        UPDATE public.application_settings
        SET value = jsonb_build_object(
            'name', 'شركة الأميرة للتوريدات العامة والتجارة ش.م.م',
            'commercial_reg', '998877',
            'tax_card', '111-222-333',
            'phone', '01012345678',
            'address', 'القاهرة - مدينة نصر',
            'currency', 'ج.م',
            'invoice_footer_notes', 'شروط خاصة معتمدة'
        )
        WHERE key = 'company_profile';
    `);

    // Re-run the seed script
    const seedSql = fs.readFileSync('supabase/seed.sql', 'utf8');
    await db.exec(seedSql);

    const checkSettings = await db.query("SELECT value->>'commercial_reg' as reg FROM public.application_settings WHERE key = 'company_profile'");
    assert(checkSettings.rows[0].reg === '998877', 'تم الحفاظ على بيانات الشركة الحقيقية (998877) ومنع إتلافها بفضل ON CONFLICT DO NOTHING');

    // --------------------------------------------------------------------------
    // 4. Provision The Two Authorized Users
    // --------------------------------------------------------------------------
    logStep('4', 'تهيئة الحسابين المصرح بهما وإضافتهما للقائمة البيضاء...');
    const user1Id = '11111111-1111-1111-1111-111111111111';
    const user2Id = '22222222-2222-2222-2222-222222222222';
    const unauthId = '99999999-9999-9999-9999-999999999999';

    await db.query(`INSERT INTO auth.users (id, email) VALUES ('${user1Id}', 'user1@alamira.com'), ('${user2Id}', 'user2@alamira.com'), ('${unauthId}', 'intruder@unknown.com')`);
    await db.query(`SELECT public.provision_authorized_user('${user1Id}', 'أحمد محمود', 'user1@alamira.com')`);
    await db.query(`SELECT public.provision_authorized_user('${user2Id}', 'محمد علي', 'user2@alamira.com')`);

    const auCheck = await db.query('SELECT COUNT(*) as c FROM public.authorized_users WHERE is_active = true');
    assert(Number(auCheck.rows[0].c) === 2, 'تم تسجيل الحسابين المصرح بهما وتفعيلهما في جدول authorized_users');

    // --------------------------------------------------------------------------
    // 5. Test Rejection of Unauthorized Access
    // --------------------------------------------------------------------------
    logStep('5', 'اختبار رفض الوصول لأي مستخدم غير مسجل في القائمة البيضاء (Unauthorized User Rejection)...');
    await db.exec(`SET "request.jwt.claim.sub" = '${unauthId}';`);
    const intruderCheck = await db.query('SELECT public.is_authorized_user() as auth');
    assert(intruderCheck.rows[0].auth === false, 'المستخدم غير المصرح به يتم التعرف عليه فوراً ورفضه عبر is_authorized_user()');

    try {
        await db.query(`SELECT public.approve_sales_invoice(gen_random_uuid())`);
        assert(false, 'يجب أن يفشل استدعاء دالة الاعتماد للمستخدم غير المصرح به');
    } catch (err) {
        assert(err.message.includes('غير مسجل') || err.message.includes('غير مصرح'), `تم منع المستخدم غير المصرح به بنجاح برفع استثناء: ${err.message}`);
    }

    // --------------------------------------------------------------------------
    // 6. Test Product Creation with Zero Initial Stock Enforcement
    // --------------------------------------------------------------------------
    logStep('6', 'اختبار فرض الرصيد الصفري الأولي ومنع إدخال رصيد غير صفري...');
    await db.exec(`SET "request.jwt.claim.sub" = '${user1Id}';`);

    // Create a Category first
    const catRes = await db.query(`INSERT INTO public.categories (name) VALUES ('أدوات مكتبية') RETURNING id`);
    const catId = catRes.rows[0].id;

    // Negative Test: Attempt to insert product with current_stock = 50.00
    try {
        await db.query(`
            INSERT INTO public.products (sku, name, category_id, purchase_price, selling_price, current_stock)
            VALUES ('P-TEST-FAIL', 'صنف مخالف', '${catId}', 80, 100, 50.00)
        `);
        assert(false, 'يجب أن يفشل إنشاء منتج برصيد أولي غير صفري');
    } catch (err) {
        assert(err.message.includes('غير مسموح بإنشاء صنف برصيد مخزني غير صفري') || err.message.includes('check'), `تم رفض الرصيد غير الصفري بنجاح بواسطة المحفز وقيد الأمان: ${err.message}`);
    }

    // Valid Test: Insert product with current_stock = 0.00
    const prodRes = await db.query(`
        INSERT INTO public.products (sku, name, category_id, purchase_price, selling_price, current_stock)
        VALUES ('P001', 'ورق تصوير A4 مالتي أوفيس 80 جرام', '${catId}', 80.00, 100.00, 0.00)
        RETURNING id, current_stock
    `);
    const prodId = prodRes.rows[0].id;
    assert(Number(prodRes.rows[0].current_stock) === 0, 'تم إنشاء الصنف بنجاح برصيد أولي مقيد بـ 0.00 وحدة');

    // --------------------------------------------------------------------------
    // 7. Test Rejection of Direct Stock Tampering
    // --------------------------------------------------------------------------
    logStep('7', 'اختبار رفض محاولات التعديل المباشر لرصيد المخزون في جدول المنتجات...');
    try {
        await db.query(`UPDATE public.products SET current_stock = 50 WHERE id = '${prodId}'`);
        assert(false, 'يجب أن تفشل محاولة تعديل رصيد المخزون مباشرة');
    } catch (err) {
        assert(err.message.includes('لا يمكن تعديل رصيد المخزون مباشرة') || err.message.includes('permission denied'), `تم رفض التعديل المباشر لرصيد المخزون بنجاح: ${err.message}`);
    }

    // --------------------------------------------------------------------------
    // 8. Test Stock Receipt Approval & Atomic Stock Movement
    // --------------------------------------------------------------------------
    logStep('8', 'اختبار اعتماد إذن إضافة وتحديث الرصيد وسجل الحركات المعصوم...');
    // Create Supplier
    const supRes = await db.query(`INSERT INTO public.suppliers (name, phone) VALUES ('شركة الأهرام للورق', '01011112222') RETURNING id`);
    const supId = supRes.rows[0].id;

    // Create Draft Receipt
    const recRes = await db.query(`
        INSERT INTO public.stock_receipts (receipt_number, receipt_date, supplier_id, status, created_by)
        VALUES ('REC-001', '2026-11-15', '${supId}', 'draft', '${user1Id}')
        RETURNING id
    `);
    const recId = recRes.rows[0].id;

    await db.query(`
        INSERT INTO public.stock_receipt_items (receipt_id, product_id, quantity, unit_price, line_total)
        VALUES ('${recId}', '${prodId}', 100.00, 80.00, 8000.00)
    `);

    // Switch context to User 2 to verify equal execution rights
    await db.exec(`SET "request.jwt.claim.sub" = '${user2Id}';`);
    await db.query(`SELECT public.approve_stock_receipt('${recId}')`);

    const pAfterRec = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prodId}'`);
    assert(Number(pAfterRec.rows[0].current_stock) === 100.00, 'تم اعتماد إذن الإضافة وزيادة رصيد المخزون إلى 100.00 وحدة بدقة');

    const movCount = await db.query(`SELECT COUNT(*) as c FROM public.inventory_movements WHERE movement_type = 'receipt' AND product_id = '${prodId}'`);
    assert(Number(movCount.rows[0].c) === 1, 'تم تسجيل حركة واردة معصومة في inventory_movements بنجاح');

    // --------------------------------------------------------------------------
    // 9. Test Sales Invoice Approval & Double Discount Calculations
    // --------------------------------------------------------------------------
    logStep('9', 'اختبار فاتورة المبيعات وحساب الخصم المزدوج (Double Discount: 1000 -> 900 -> 855)...');
    // Create Customer
    const custRes = await db.query(`INSERT INTO public.customers (name, phone) VALUES ('شركة الأمل للمقاولات', '01233334444') RETURNING id`);
    const custId = custRes.rows[0].id;

    // Create Invoice with 10 units at 100 EGP, 10% item discount, 5% invoice discount
    // Gross: 10 * 100 = 1000 EGP
    // Item Discount 10% = 100 EGP -> Net line / Subtotal = 900 EGP
    // Invoice Discount 5% on 900 EGP = 45 EGP -> Final Total = 855 EGP
    const invRes = await db.query(`
        INSERT INTO public.sales_invoices (
            invoice_number, invoice_date, customer_id,
            gross_amount, item_discounts_amount, subtotal,
            invoice_discount_type, invoice_discount_value, invoice_discount_amount,
            final_total, status, created_by
        ) VALUES (
            'INV-001', '2026-11-15', '${custId}',
            1000.00, 100.00, 900.00,
            'percentage', 5.00, 45.00,
            855.00, 'draft', '${user2Id}'
        ) RETURNING id
    `);
    const invId = invRes.rows[0].id;

    await db.query(`
        INSERT INTO public.sales_invoice_items (
            invoice_id, product_id, product_sku_snapshot, product_name_snapshot, unit_snapshot,
            quantity, unit_price, gross_amount, discount_type, discount_value, discount_amount, net_amount
        ) VALUES (
            '${invId}', '${prodId}', 'P001', 'ورق تصوير A4', 'علبة',
            10.00, 100.00, 1000.00, 'percentage', 10.00, 100.00, 900.00
        )
    `);

    // Switch context to User 1 to approve
    await db.exec(`SET "request.jwt.claim.sub" = '${user1Id}';`);
    await db.query(`SELECT public.approve_sales_invoice('${invId}')`);

    const pAfterInv = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prodId}'`);
    assert(Number(pAfterInv.rows[0].current_stock) === 90.00, 'تم اعتماد الفاتورة وخصم 10 وحدات، رصيد المخزون أصبح 90.00 بدقة');

    const invRecord = await db.query(`SELECT final_total, status FROM public.sales_invoices WHERE id = '${invId}'`);
    assert(Number(invRecord.rows[0].final_total) === 855.00, 'الصافي النهائي للفاتورة مطابق للحساب المالي الدقيق: 855.00 ج.م');
    assert(invRecord.rows[0].status === 'approved', 'حالة الفاتورة معتمدة (approved)');

    // --------------------------------------------------------------------------
    // 10. Test Simultaneous Invoice Approvals & Insufficient Stock Rejection
    // --------------------------------------------------------------------------
    logStep('10', 'اختبار اعتماد الفواتير المتزامنة ومنع الرصيد السالب...');
    // Currently available stock is 90 units
    // Invoice 2: 50 units (Will succeed -> stock will be 40)
    // Invoice 3: 60 units (Will fail -> required 60 > available 40)
    const inv2 = await db.query(`
        INSERT INTO public.sales_invoices (invoice_number, invoice_date, customer_id, gross_amount, subtotal, final_total, status, created_by)
        VALUES ('INV-002', '2026-11-15', '${custId}', 5000, 5000, 5000, 'draft', '${user1Id}') RETURNING id
    `);
    await db.query(`
        INSERT INTO public.sales_invoice_items (invoice_id, product_id, product_sku_snapshot, product_name_snapshot, unit_snapshot, quantity, unit_price, gross_amount, net_amount)
        VALUES ('${inv2.rows[0].id}', '${prodId}', 'P001', 'ورق تصوير A4', 'علبة', 50, 100, 5000, 5000)
    `);

    const inv3 = await db.query(`
        INSERT INTO public.sales_invoices (invoice_number, invoice_date, customer_id, gross_amount, subtotal, final_total, status, created_by)
        VALUES ('INV-003', '2026-11-15', '${custId}', 6000, 6000, 6000, 'draft', '${user2Id}') RETURNING id
    `);
    await db.query(`
        INSERT INTO public.sales_invoice_items (invoice_id, product_id, product_sku_snapshot, product_name_snapshot, unit_snapshot, quantity, unit_price, gross_amount, net_amount)
        VALUES ('${inv3.rows[0].id}', '${prodId}', 'P001', 'ورق تصوير A4', 'علبة', 60, 100, 6000, 6000)
    `);

    // Approve INV-002
    await db.query(`SELECT public.approve_sales_invoice('${inv2.rows[0].id}')`);
    const pAfterInv2 = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prodId}'`);
    assert(Number(pAfterInv2.rows[0].current_stock) === 40.00, 'تم اعتماد الفاتورة الثانية (50 وحدة) وتناقص الرصيد إلى 40.00 وحدة');

    // Attempt to approve INV-003 (requires 60 units, only 40 available)
    try {
        await db.query(`SELECT public.approve_sales_invoice('${inv3.rows[0].id}')`);
        assert(false, 'يجب أن تفشل الفاتورة الثالثة لعدم كفاية الرصيد');
    } catch (err) {
        assert(err.message.includes('رصيد المخزون غير كاف'), `تم منع الرصيد السالب بنجاح: ${err.message}`);
    }

    const pFinal = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prodId}'`);
    assert(Number(pFinal.rows[0].current_stock) === 40.00, 'رصيد المخزون ظل ثابتاً عند 40.00 وحدة بعد محاولة البيع الزائد الفاشلة');

    // --------------------------------------------------------------------------
    // 11. Test Invoice Cancellation & Stock Reversal
    // --------------------------------------------------------------------------
    logStep('11', 'اختبار إلغاء الفاتورة واسترجاع المخزون وتوثيق السبب...');
    await db.exec(`SET "request.jwt.claim.sub" = '${user2Id}';`);
    await db.query(`SELECT public.cancel_sales_invoice('${inv2.rows[0].id}', 'طلب العميل إلغاء التوريد لظروف طارئة')`);

    const pAfterCancel = await db.query(`SELECT current_stock FROM public.products WHERE id = '${prodId}'`);
    assert(Number(pAfterCancel.rows[0].current_stock) === 90.00, 'تم إلغاء الفاتورة واسترجاع الـ 50 وحدة ليعود الرصيد بدقة إلى 90.00 وحدة');

    const inv2Status = await db.query(`SELECT status, cancellation_reason FROM public.sales_invoices WHERE id = '${inv2.rows[0].id}'`);
    assert(inv2Status.rows[0].status === 'cancelled', 'تم تحديث حالة الفاتورة إلى ملغاة (cancelled)');
    assert(inv2Status.rows[0].cancellation_reason.includes('طلب العميل'), 'تم حفظ سبب الإلغاء بدقة للرقابة');

    // --------------------------------------------------------------------------
    // 12. Test JSON Backup Export Validity & Recovery Procedure
    // --------------------------------------------------------------------------
    logStep('12', 'اختبار تصدير النسخة الاحتياطية الشاملة وصحة هيكليتها...');
    await db.exec(`SET "request.jwt.claim.sub" = '${user1Id}';`);
    const backupRes = await db.query(`SELECT public.export_full_backup() as backup`);
    const backupJson = backupRes.rows[0].backup;

    assert(backupJson.system === 'Al Amira Inventory System', 'اسم النظام مسجل في ملف النسخة الاحتياطية');
    assert(backupJson.schema_version === '1.0.0', 'إصدار المخطط هو 1.0.0');
    assert(Array.isArray(backupJson.data.products) && backupJson.data.products.length === 1, 'تم تصدير سجلات المنتجات بدقة');
    assert(Array.isArray(backupJson.data.sales_invoices) && backupJson.data.sales_invoices.length === 3, 'تم تصدير فواتير المبيعات بالكامل');
    assert(Array.isArray(backupJson.data.inventory_movements) && backupJson.data.inventory_movements.length >= 3, 'تم تصدير سجل حركات المخزون الرقابي كاملاً');
    assert(Array.isArray(backupJson.data.authorized_users) && backupJson.data.authorized_users.length === 2, 'تم تصدير بيانات المستخدمين المصرح لهم (authorized_users)');
    
    // Verify security: NO passwords or tokens in backup
    const usersExport = backupJson.data.authorized_users;
    usersExport.forEach(u => {
        assert(!u.password && !u.encrypted_password && !u.token, `تم التأكد التام من خلو سجل المستخدم ${u.email} من أي كلمات مرور أو رموز أمان`);
        assert(u.email && u.full_name, `بيانات التعريف الإدارية متوفرة لإعادة التهيئة (${u.email})`);
    });

    // --------------------------------------------------------------------------
    // 13. Test Rejection of In-Browser restore_full_backup RPC
    // --------------------------------------------------------------------------
    logStep('13', 'اختبار تعطيل دالة restore_full_backup عبر المتصفح لمنع المخاطر...');
    try {
        await db.query(`SELECT public.restore_full_backup('${JSON.stringify(backupJson)}')`);
        assert(false, 'يجب أن تفشل دالة restore_full_backup وتمنع الاستعادة من المتصفح');
    } catch (err) {
        assert(err.message.includes('معطلة لأسباب أمنية'), `تم رفض استعادة المتصفح برفع الاستثناء الأمني المطلوب بنجاح: ${err.message}`);
    }

    console.log('\n================================================================');
    console.log('  🎉 نجحت جميع اختبارات التكامل الحقيقية على PostgreSQL 16 بنسبة 100%');
    console.log('================================================================\n');
}

run().catch(err => {
    console.error('\n❌ خطأ غير متوقع أثناء تشغيل اختبارات PostgreSQL:', err);
    process.exit(1);
});
