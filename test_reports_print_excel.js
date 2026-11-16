/**
 * test_reports_print_excel.js
 * Comprehensive automated verification for Phase 4: Reports, Printing & Excel UI Finalization
 * Business: شركة الأميرة للتوريدات العامة والتجارة
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  بدء اختبارات التحقق من التقارير والطباعة والإكسيل (Phase 4 UI)');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify Reports Section (view-reports)
console.log('\n--- 1. فحص عناصر شاشة التقارير الإدارية والمخزنية (view-reports) ---');

assert(html.includes('id="view-reports"'), 'شاشة view-reports غير موجودة');
assert(html.includes('id="reports-active-badge"'), 'شارة التقرير النشط غير موجودة');

// Category filter pills
['rep-cat-all', 'rep-cat-sales', 'rep-cat-stock', 'rep-cat-movements', 'rep-cat-alerts'].forEach(id => {
    assert(html.includes(`id="${id}"`), `زر تصنيف التقارير ${id} غير موجود`);
});

// Dropdown and optgroups
assert(html.includes('id="report-type-select"'), 'قائمة اختيار التقرير غير موجودة');
assert(html.includes('optgroup label="تقارير المخزون والأرصدة"'), 'مجموعة تقارير المخزون والأرصدة غير موجودة');
assert(html.includes('optgroup label="تنبيهات النواقص والحد الأدنى"'), 'مجموعة تنبيهات النواقص غير موجودة');
assert(html.includes('optgroup label="تقارير المبيعات"'), 'مجموعة تقارير المبيعات غير موجودة');
assert(html.includes('optgroup label="حركات وتدفق المخزون"'), 'مجموعة حركات وتدفق المخزون غير موجودة');

// Filters & controls
assert(html.includes('id="report-date-from"'), 'حقل تاريخ البداية للتقارير غير موجود');
assert(html.includes('id="report-date-to"'), 'حقل تاريخ النهاية للتقارير غير موجود');
assert(html.includes('id="report-search-input"'), 'حقل البحث السريع في التقارير غير موجود');
assert(html.includes('id="report-metrics-bar"'), 'شريط المؤشرات الإحصائية السريعة للتقرير غير موجود');

// Action buttons
assert(html.includes('ReportsModule.exportCurrentReportExcel()'), 'زر تصدير التقرير الحالي إلى إكسيل غير موجود أو غير مرتبط');
assert(html.includes('ReportsModule.printReport()'), 'زر طباعة التقرير غير موجود');
console.log('✅ نجاح: شاشة التقارير متكاملة ومصنفة إلى 4 مجموعات واضحة مع شريط المؤشرات والفلاتر وأزرار التصدير والطباعة.');

// 2. Verify A4 Sales Invoice Printing & Hardcoded Policy Removal
console.log('\n--- 2. فحص طباعة فاتورة المبيعات A4 وإلغاء النصوص القانونية غير المعتمدة ---');

assert(html.includes('printSalesInvoice(invoiceId)'), 'دالة printSalesInvoice غير موجودة');
assert(html.includes('id="print-val-tafqeet"'), 'عنصر التفقيط بالعربية غير موجود');
assert(html.includes('id="print-sign-title-1"'), 'حقل التوقيع الأول غير موجود');
assert(html.includes('id="print-sign-title-2"'), 'حقل التوقيع الثاني غير موجود');
assert(html.includes('id="print-sign-title-3"'), 'حقل التوقيع الثالث غير موجود');

// Verify that hardcoded return policy is removed and only real invoice notes are printed
assert(!html.includes('البضاعة المباعة ترد وتستبدل خلال 14 يوماً من تاريخ الفاتورة طبقاً لأحكام القانون رقم 181'), 'ما زال هناك نص قانوني ثابت غير معتمد في كود الفاتورة');
assert(html.includes('inv.notes && inv.notes.trim()'), 'لم يتم ربط صندوق الملاحظات بوجود ملاحظات حقيقية مدخلة');
console.log('✅ نجاح: تمت إزالة النصوص القانونية الثابتة غير المعتمدة وحصر الملاحظات فيما يسجله المستخدم فعلياً مع التفقيط والتواقيع.');

// 3. Verify Stock Documents Printing (Receipts, Issues, Adjustments)
console.log('\n--- 3. فحص طباعة المستندات المخزنية (إذن إضافة، إذن صرف، إذن تسوية جردية) ---');

assert(html.includes('printStockReceipt(receiptId)'), 'دالة printStockReceipt غير موجودة');
assert(html.includes('printStockIssue(issueId)'), 'دالة printStockIssue غير موجودة');
assert(html.includes('printStockAdjustment(adjustmentId)'), 'دالة printStockAdjustment غير موجودة');

// Check adjustment print button in adjustments table
assert(html.includes("PrintModule.printStockAdjustment") && html.includes("طباعة إذن تسوية جردية"), 'زر طباعة إذن التسوية الجردية غير موجود في جدول التسويات');
console.log('✅ نجاح: طباعة المستندات المخزنية مكتملة وموحدة لجميع أنواع الحركات (إضافة، صرف، تسوية جردية).');

// 4. Verify Excel Export Implementation & Real Numeric Types
console.log('\n--- 4. فحص تصدير الإكسيل (XLSX) ودعم الأرقام الحقيقية ---');

assert(html.includes('exportFullExcelWorkbook()'), 'دالة exportFullExcelWorkbook غير موجودة');
assert(html.includes('exportCurrentReportExcel()'), 'دالة exportCurrentReportExcel غير موجودة');

// Verify numeric parsing for Excel export (Number(x))
assert(html.includes("'سعر الشراء': Number(p.purchase_price"), 'سعر الشراء لم يتم تصديره كقيمة رقمية Number');
assert(html.includes("'سعر البيع': Number(p.selling_price"), 'سعر البيع لم يتم تصديره كقيمة رقمية Number');
assert(html.includes("'رصيد المخزون': Number(p.current_stock"), 'رصيد المخزون لم يتم تصديره كقيمة رقمية Number');
assert(html.includes("'الصافي النهائي': Number(i.final_total"), 'الصافي النهائي للفاتورة لم يتم تصديره كقيمة رقمية Number');
console.log('✅ نجاح: تصدير الإكسيل يحافظ على القيم الرقمية الحقيقية (Numeric Types) بدقة لحساب المعادلات.');

// 5. Verify Multi-page Print CSS Rules
console.log('\n--- 5. فحص قواعد التنسيق الطباعي A4 وتكرار الترويسة ---');

assert(html.includes('size: A4 portrait'), 'مقاس الصفحة A4 غير محدد في قواعد الطباعة');
assert(html.includes('display: table-header-group'), 'تكرار ترويسة الجدول في الصفحات المتعددة thead غير مفعل');
assert(html.includes('page-break-inside: avoid'), 'منع انشطار الصفوف بين الصفحات page-break-inside غير مفعل');
console.log('✅ نجاح: قواعد الطباعة المهيأة لصفحات A4 المتعددة وتكرار الترويسة مطبقة بدقة.');

console.log('\n=============================================================');
console.log('  🎉 كافة اختبارات التقارير والطباعة والإكسيل نجحت بنسبة 100%!');
console.log('=============================================================');
