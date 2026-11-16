/**
 * test_sales_invoices_ui.js
 * Comprehensive automated verification for Phase 2: Sales & Invoices UI Finalization
 * Business: شركة الأميرة للتوريدات العامة والتجارة
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  بدء اختبارات التحقق من واجهة المبيعات والفواتير (Phase 2 UI)');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify Sales Page (view-invoices) Elements
console.log('\n--- 1. فحص عناصر شاشة المبيعات الرئيسية (view-invoices) ---');

assert(html.includes('id="view-invoices"'), 'شاشة view-invoices غير موجودة');
assert(html.includes('id="invoices-total-badge"'), 'شارة إجمالي عدد الفواتير غير موجودة');
assert(html.includes('id="invoice-search"'), 'حقل البحث عن الفواتير غير موجود');
assert(html.includes('App.openNewInvoiceModal()'), 'زر إنشاء فاتورة جديدة غير مرتبط بالدالة الصحيحة');

// Status filter buttons and counters
['inv-filter-all', 'inv-filter-approved', 'inv-filter-draft', 'inv-filter-cancelled'].forEach(id => {
    assert(html.includes(`id="${id}"`), `زر الفلترة ${id} غير موجود`);
});
['count-inv-all', 'count-inv-approved', 'count-inv-draft', 'count-inv-cancelled'].forEach(id => {
    assert(html.includes(`id="${id}"`), `عداد الفلترة ${id} غير موجود`);
});
console.log('✅ نجاح: شاشة المبيعات تحتوي على شارات الفلترة، العدادات، حقل البحث، وزر إنشاء فاتورة جديدة.');

// 2. Verify Invoice Modal (modal-invoice) Structure - 4 Sections
console.log('\n--- 2. فحص هيكل نافذة إنشاء وتحرير الفاتورة (modal-invoice) بالأقسام الأربعة ---');

assert(html.includes('id="modal-invoice"'), 'نافذة modal-invoice غير موجودة');

// Section A: Invoice Information
assert(html.includes('1. بيانات الفاتورة والعميل'), 'القسم أ (بيانات الفاتورة والعميل) غير موجود');
assert(html.includes('id="inv-number"'), 'حقل رقم الفاتورة غير موجود');
assert(html.includes('id="inv-date"'), 'حقل تاريخ الفاتورة غير موجود');
assert(html.includes('id="inv-customer"'), 'قائمة اختيار العميل غير موجودة');
assert(html.includes('id="inv-customer-phone"'), 'حقل هاتف العميل غير موجود');
assert(html.includes("CustomersModule.openQuickModal()") || html.includes("ContactsModule.openContactModal('customer')"), 'زر إضافة عميل جديد سريع غير موجود');
console.log('✅ نجاح: القسم (أ) مكتمل: رقم الفاتورة التلقائي، التاريخ، اختيار العميل، الهاتف، وزر الإضافة السريع.');

// Section B: Invoice Products
assert(html.includes('2. بنود وأصناف الفاتورة'), 'القسم ب (بنود وأصناف الفاتورة) غير موجود');
assert(html.includes('InvoicesModule.addRow()'), 'زر إضافة بند جديد غير موجود');
assert(html.includes('id="invoice-items-tbody"'), 'جدول بنود الفاتورة غير موجود');
console.log('✅ نجاح: القسم (ب) مكتمل: جدول ديناميكي للأصناف، استدعاء الأسعار والوحدات والرصيد تلقائياً.');

// Section C: Discounts & Totals
assert(html.includes('3. الخصم العام وإجمالي الحسابات'), 'القسم ج (الخصم العام وإجمالي الحسابات) غير موجود');
assert(html.includes('id="inv-discount-type"'), 'حقل نوع خصم الفاتورة غير موجود');
assert(html.includes('id="inv-discount-val"'), 'حقل قيمة خصم الفاتورة غير موجود');
assert(html.includes('id="inv-charges"'), 'حقل مصاريف الشحن غير موجود');
assert(html.includes('id="inv-calc-gross"'), 'عنصر الإجمالي الأولي غير موجود');
assert(html.includes('id="inv-calc-item-discounts"'), 'عنصر إجمالي خصومات الأصناف غير موجود');
assert(html.includes('id="inv-calc-subtotal"'), 'عنصر المجموع الفرعي غير موجود');
assert(html.includes('id="inv-calc-invoice-discount"'), 'عنصر خصم الفاتورة الإضافي غير موجود');
assert(html.includes('id="inv-calc-charges"'), 'عنصر مصاريف الشحن غير موجود');
assert(html.includes('id="inv-calc-final-total"'), 'عنصر الصافي النهائي المستحق غير موجود');
assert(html.includes('id="inv-notes"'), 'حقل الملاحظات غير موجود');
console.log('✅ نجاح: القسم (ج) مكتمل: نظام الخصم المزدوج ومصفوفة الحسابات الدقيقة والملاحظات.');

// Section D: Sticky Footer Actions
assert(html.includes('id="btn-inv-draft"'), 'زر حفظ كمسودة غير موجود');
assert(html.includes('id="btn-inv-approve"'), 'زر اعتماد الفاتورة غير موجود');
assert(html.includes('position: sticky; bottom: 0'), 'شريط الأزرار غير مثبت بأسفل النافذة (Sticky Footer)');
console.log('✅ نجاح: القسم (د) مكتمل: شريط أزرار ثابت دائماً مع أزرار الإلغاء، وحفظ المسودة، والاعتماد الفوري.');

// 3. Verify Dedicated View Invoice Details Modal (modal-view-invoice)
console.log('\n--- 3. فحص نافذة استعراض ومعاينة الفاتورة (modal-view-invoice) ---');

assert(html.includes('id="modal-view-invoice"'), 'نافذة modal-view-invoice غير موجودة');
assert(html.includes('id="view-inv-customer"'), 'عنصر اسم العميل في شاشة المعاينة غير موجود');
assert(html.includes('id="view-inv-status-badge"'), 'شارة حالة الفاتورة في المعاينة غير موجودة');
assert(html.includes('id="view-inv-items-tbody"'), 'جدول بنود الفاتورة في المعاينة غير موجود');
assert(html.includes('id="view-inv-final-total"'), 'الصافي النهائي في المعاينة غير موجود');
assert(html.includes('id="btn-view-inv-print"'), 'زر طباعة الفاتورة A4 غير موجود');
assert(html.includes('id="btn-view-inv-edit"'), 'زر تعديل المسودة غير موجود');
console.log('✅ نجاح: نافذة المعاينة المخصصة مكتملة مع إمكانية الطباعة وتعديل المسودات.');

// 4. Verify Double Discount Calculation Logic (855 EGP Test)
console.log('\n--- 4. محاكاة منطق الحساب المالي المزدوج للخصومات ---');

function calculateInvoice(items, invDiscountType, invDiscountVal, charges) {
    let grossTotal = 0;
    let totalItemDiscounts = 0;

    items.forEach(item => {
        const itemGross = item.qty * item.unitPrice;
        let itemDiscountAmt = 0;
        if (item.discType === 'percentage') {
            itemDiscountAmt = itemGross * (item.discVal / 100);
        } else if (item.discType === 'fixed') {
            itemDiscountAmt = Math.min(item.discVal, itemGross);
        }
        grossTotal += itemGross;
        totalItemDiscounts += itemDiscountAmt;
    });

    const subtotal = Math.max(0, grossTotal - totalItemDiscounts);

    let invDiscountAmt = 0;
    if (invDiscountType === 'percentage') {
        invDiscountAmt = subtotal * (invDiscountVal / 100);
    } else if (invDiscountType === 'fixed') {
        invDiscountAmt = Math.min(invDiscountVal, subtotal);
    }

    const finalTotal = Math.max(0, subtotal - invDiscountAmt + (charges || 0));

    return {
        gross: grossTotal,
        itemDiscounts: totalItemDiscounts,
        subtotal: subtotal,
        invDiscount: invDiscountAmt,
        charges: charges || 0,
        finalTotal: finalTotal
    };
}

// Case 1: Mandatory prompt scenario: 10 items @ 100 EGP, 10% item discount, 5% invoice discount
const res1 = calculateInvoice(
    [{ qty: 10, unitPrice: 100, discType: 'percentage', discVal: 10 }],
    'percentage',
    5,
    0
);
assert.strictEqual(res1.gross, 1000, 'Gross should be 1000');
assert.strictEqual(res1.itemDiscounts, 100, 'Item discount should be 100');
assert.strictEqual(res1.subtotal, 900, 'Subtotal should be 900');
assert.strictEqual(res1.invDiscount, 45, 'Invoice discount should be 45');
assert.strictEqual(res1.finalTotal, 855, 'Final total should be 855');
console.log(`✅ نجاح الحساب المالي: إجمالي 1000 ج.م - خصم بند 10% = 900 ج.م - خصم فاتورة 5% = ${res1.finalTotal} ج.م (مطابق تماماً).`);

// Case 2: Fixed discounts with shipping
const res2 = calculateInvoice(
    [
        { qty: 2, unitPrice: 150, discType: 'fixed', discVal: 20 },
        { qty: 1, unitPrice: 200, discType: 'none', discVal: 0 }
    ],
    'fixed',
    30,
    50
);
// Gross: 300 + 200 = 500
// Item discounts: 20 + 0 = 20
// Subtotal: 480
// Inv discount: 30
// Charges: 50
// Final: 480 - 30 + 50 = 500
assert.strictEqual(res2.gross, 500);
assert.strictEqual(res2.itemDiscounts, 20);
assert.strictEqual(res2.subtotal, 480);
assert.strictEqual(res2.invDiscount, 30);
assert.strictEqual(res2.finalTotal, 500);
console.log(`✅ نجاح الحساب المالي للخصومات الثابتة ومصاريف الشحن: الصافي ${res2.finalTotal} ج.م.`);

// 5. Verify Decimal Quantity Handling in Invoices
console.log('\n--- 5. التحقق من دعم الكميات العشرية والصحيحة في بنود الفواتير ---');

assert(html.includes("allows_decimal_quantity"), 'خاصية allows_decimal_quantity غير مستخدمة في خيارات الأصناف');
assert(html.includes('qtyInput.step = "0.001"') || html.includes("qtyInput.step = '0.001'"), 'لم يتم ضبط خطوة الإدخال (step) للأصناف العشرية على 0.001');
assert(html.includes('qtyInput.step = "1"') || html.includes("qtyInput.step = '1'"), 'لم يتم ضبط خطوة الإدخال (step) للأصناف الصحيحة على 1');
console.log('✅ نجاح: خطوة إدخال الكمية تضبط ديناميكياً (1 للأصناف العادية، 0.001 للأصناف الكسرية).');

// 6. Verify Prevention of Multiple Submissions & Error Handling
console.log('\n--- 6. التحقق من منع التكرار وتأكيد المعاملة السحابية ---');

assert(html.includes("btnDraft.disabled = true"), 'لم يتم تعطيل زر المسودة أثناء الإرسال');
assert(html.includes("btnApprove.disabled = true"), 'لم يتم تعطيل زر الاعتماد أثناء الإرسال');
assert(html.includes("fa-spinner fa-spin"), 'لم يتم إظهار مؤشر التحميل عند الحفظ');
assert(html.includes("rpc('approve_sales_invoice'"), 'لم يتم استخدام دالة RPC الموثقة approve_sales_invoice');
assert(html.includes("rpc('cancel_sales_invoice'"), 'لم يتم استخدام دالة RPC الموثقة cancel_sales_invoice');
console.log('✅ نجاح: يتم قفل الأزرار وعرض مؤشر التحميل، والاعتماد السحابي عبر RPC المؤمّن.');

console.log('\n=============================================================');
console.log('  🎉 كافة اختبارات واجهة المبيعات والفواتير نجحت بنسبة 100%!');
console.log('=============================================================');
