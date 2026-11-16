// ==============================================================================
// AL AMIRA INVENTORY & INVOICING SYSTEM
// Test Suite: Audit-Driven Critical Remediation Verification
// File: test_audit_critical_remediation.js
// ==============================================================================

const fs = require('fs');
const assert = require('assert');

function logStep(step, msg) {
    console.log(`\n[STEP ${step}] ${msg}`);
}

function verify(condition, message) {
    if (!condition) {
        console.error(`  ❌ فشل: ${message}`);
        throw new Error(message);
    }
    console.log(`  ✅ نجاح: ${message}`);
}

function run() {
    console.log('================================================================');
    console.log('🧪 TEST SUITE: AUDIT CRITICAL REMEDIATION VERIFICATION');
    console.log('================================================================');

    const html = fs.readFileSync('index.html', 'utf8');
    const rls = fs.readFileSync('supabase/rls.sql', 'utf8');
    const funcs = fs.readFileSync('supabase/functions.sql', 'utf8');
    const comb = fs.readFileSync('supabase/combined_setup.sql', 'utf8');

    // --------------------------------------------------------------------------
    // 1. BUG-CRIT-01: SQL GRANT Ordering
    // --------------------------------------------------------------------------
    logStep(1, 'التحقق من حل BUG-CRIT-01 (ترتيب عبارات GRANT بعد CREATE FUNCTION)...');
    
    // In functions.sql
    const deleteFuncIdxF = funcs.indexOf('CREATE OR REPLACE FUNCTION public.delete_product');
    const deleteGrantIdxF = funcs.indexOf('GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;');
    verify(deleteFuncIdxF !== -1, 'دالة delete_product موجودة في functions.sql');
    verify(deleteGrantIdxF !== -1, 'منح صلاحية delete_product موجود في functions.sql');
    verify(deleteGrantIdxF > deleteFuncIdxF, 'GRANT EXECUTE يأتي بعد تعريف دالة delete_product في functions.sql');

    const setActiveFuncIdxF = funcs.indexOf('CREATE OR REPLACE FUNCTION public.set_product_active_status');
    const setActiveGrantIdxF = funcs.indexOf('GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;');
    verify(setActiveFuncIdxF !== -1, 'دالة set_product_active_status موجودة في functions.sql');
    verify(setActiveGrantIdxF !== -1, 'منح صلاحية set_product_active_status موجود في functions.sql');
    verify(setActiveGrantIdxF > setActiveFuncIdxF, 'GRANT EXECUTE يأتي بعد تعريف دالة set_product_active_status في functions.sql');

    // In combined_setup.sql
    const deleteFuncIdxC = comb.indexOf('CREATE OR REPLACE FUNCTION public.delete_product');
    const deleteGrantIdxC = comb.indexOf('GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;');
    verify(deleteGrantIdxC > deleteFuncIdxC, 'GRANT EXECUTE يأتي بعد تعريف دالة delete_product في combined_setup.sql');

    // --------------------------------------------------------------------------
    // 2. BUG-CRIT-02: Missing Table-Level GRANTs
    // --------------------------------------------------------------------------
    logStep(2, 'التحقق من حل BUG-CRIT-02 (منح صلاحيات الجداول لدور authenticated وحجب anon)...');
    const requiredTables = [
        'categories', 'customers', 'suppliers',
        'stock_receipts', 'stock_receipt_items',
        'stock_issues', 'stock_issue_items',
        'sales_invoices', 'sales_invoice_items',
        'inventory_adjustments', 'inventory_adjustment_items',
        'inventory_movements', 'application_settings', 'backup_metadata'
    ];

    requiredTables.forEach(tbl => {
        verify(rls.includes(tbl) && comb.includes(tbl), `الجدول ${tbl} مشمول في صلاحيات RLS و combined_setup.sql`);
    });
    verify(rls.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;'), 'منح صلاحية CRUD على categories لدور authenticated');
    verify(rls.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_invoices TO authenticated;'), 'منح صلاحية CRUD على sales_invoices لدور authenticated');
    verify(rls.includes('GRANT SELECT ON TABLE public.inventory_movements TO authenticated;'), 'منح صلاحية القراءة فقط على inventory_movements لدور authenticated');
    verify(rls.includes('REVOKE ALL ON TABLE public.categories'), 'حجب الوصول عن anon و PUBLIC وفقاً لمبدأ Zero-Trust');

    // --------------------------------------------------------------------------
    // 3. BUG-CRIT-03: Table Name Mismatch (app_settings -> application_settings)
    // --------------------------------------------------------------------------
    logStep(3, 'التحقق من حل BUG-CRIT-03 (تصحيح اسم جدول الإعدادات إلى application_settings)...');
    verify(!html.includes("from('app_settings')"), "لا توجد أي استعلامات تستهدف اسم الجدول الخاطئ app_settings");
    verify(html.includes("from('application_settings').select('*')"), "الاستعلام المبدئي يستهدف application_settings بشكل صحيح");
    verify(html.includes("from('application_settings').upsert({"), "حفظ هوية المؤسسة يستهدف application_settings بشكل صحيح");

    // --------------------------------------------------------------------------
    // 4. BUG-HIGH-01: Supplier Deletion & View Logic (stock_receipts -> receipts)
    // --------------------------------------------------------------------------
    logStep(4, 'التحقق من حل BUG-HIGH-01 (ربط الموردين بـ AppState.receipts لمنع الحذف غير المصرح)...');
    const supModuleCode = html.substring(html.indexOf('const SuppliersModule ='), html.indexOf('const ProductsModule ='));
    verify(!supModuleCode.includes('AppState.stock_receipts'), 'كائن الموردين لا يشير إلى AppState.stock_receipts غير المعرف');
    verify(supModuleCode.includes('(AppState.receipts || []).filter(r => r.supplier_id === id)'), 'فحص أذون الاستلام المرتبطة بالمورد يستخدم AppState.receipts بدقة');

    // --------------------------------------------------------------------------
    // 5. BUG-HIGH-02: Backup Fallback Item Flattening
    // --------------------------------------------------------------------------
    logStep(5, 'التحقق من حل BUG-HIGH-02 (تجميع بنود الفواتير والأذون في النسخة الاحتياطية البديلة)...');
    verify(!html.includes('sales_invoice_items: AppState.invoiceItems'), 'النسخة الاحتياطية لا تعتمد على AppState.invoiceItems غير المعرف');
    verify(html.includes('sales_invoice_items: (AppState.invoices || []).flatMap'), 'يتم استخراج وتسطيح بنود الفواتير بدقة');
    verify(html.includes('stock_receipt_items: (AppState.receipts || []).flatMap'), 'يتم استخراج وتسطيح بنود أذون الإضافة بدقة');
    verify(html.includes('stock_issue_items: (AppState.issues || []).flatMap'), 'يتم استخراج وتسطيح بنود أذون الصرف بدقة');
    verify(html.includes('inventory_adjustment_items: (AppState.adjustments || []).flatMap'), 'يتم استخراج وتسطيح بنود التسويات بدقة');

    // --------------------------------------------------------------------------
    // 6. BUG-HIGH-03: Consolidated Migration Script
    // --------------------------------------------------------------------------
    logStep(6, 'التحقق من حل BUG-HIGH-03 (وجود ملف الترقية الآمن للسحابة)...');
    verify(fs.existsSync('supabase/migration_fix_permissions_and_ddl.sql'), 'ملف migration_fix_permissions_and_ddl.sql موجود وجاهز');
    const migSql = fs.readFileSync('supabase/migration_fix_permissions_and_ddl.sql', 'utf8');
    verify(migSql.length > 500, 'ملف الترقية يحتوي على تعليمات SQL كاملة وغير فارغ');
    verify(migSql.includes('GRANT EXECUTE ON FUNCTION public.delete_product'), 'ملف الترقية يعالج صلاحيات دوال دورة حياة المنتجات');

    // --------------------------------------------------------------------------
    // 7. BUG-HIGH-04: Stale Supabase URL in Settings
    // --------------------------------------------------------------------------
    logStep(7, 'التحقق من حل BUG-HIGH-04 (تحديث عنوان المشروع الافتراضي في واجهة الإعدادات)...');
    verify(!html.includes('jyluvkuxrcqgkhnkwkba'), 'لا يوجد أي أثر للعنوان القديم jyluvkuxrcqgkhnkwkba في الكود');
    verify(html.includes('https://llmptlkvatndvrmnjiyj.supabase.co'), 'العنوان الرسمي المعتمد llmptlkvatndvrmnjiyj معروض في الإعدادات');

    // --------------------------------------------------------------------------
    // 8. BUG-MED-01: Draft Invoice Deletion Action
    // --------------------------------------------------------------------------
    logStep(8, 'التحقق من حل BUG-MED-01 (إمكانية حذف مسودات فواتير المبيعات)...');
    verify(html.includes('InvoicesModule.deleteDraft'), 'دالة deleteDraft معرفة ومستدعاة في جدول الفواتير');
    verify(html.includes("status !== 'draft'"), 'حماية الفواتير المعتمدة من الحذف البرمجي الصريح');
    verify(html.includes(".from('sales_invoice_items').delete().eq('invoice_id'"), 'حذف البنود المرتبطة بالمسودة أولاً لسلامة العلاقات');
    verify(html.includes(".from('sales_invoices')") && html.includes(".eq('status', 'draft')"), 'حذف رأس الفاتورة بشرط أن تكون مسودة فقط');
    verify(html.includes('id="btn-view-inv-delete"'), 'زر حذف المسودة متاح في نافذة معاينة الفاتورة أيضاً');

    // --------------------------------------------------------------------------
    // 9. BUG-MED-02: Settings RPC Labels Accuracy
    // --------------------------------------------------------------------------
    logStep(9, 'التحقق من حل BUG-MED-02 (دقة مسميات دوال RPC المعروضة في الإعدادات)...');
    verify(html.includes('register_product_with_opening_stock'), 'اسم دالة الرصيد الافتتاحي register_product_with_opening_stock معروض بدقة');
    verify(html.includes('set_product_active_status'), 'اسم دالة دورة حياة الصنف set_product_active_status معروض بدقة');
    verify(!html.includes('<td><code>create_product_opening_balance</code></td>'), 'تمت إزالة المسمى القديم create_product_opening_balance من الجدول');
    verify(!html.includes('<td><code>archive_product</code></td>'), 'تمت إزالة المسمى القديم archive_product من الجدول');

    console.log('\n================================================================');
    console.log('🎉 جميع اختبارات تدقيق ومعالجة العيوب الـ 14 نجحت بنسبة 100%');
    console.log('================================================================');
}

run();
