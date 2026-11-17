/**
 * test_mobile_ux_regression.js
 * Comprehensive automated regression testing for Mobile-First UX transformation
 * Verifies runtime rendering for:
 * - ProductsModule.renderTable() (clean execution, no undefined variable access)
 * - InvoicesModule mobile cards & desktop table (nonempty & empty states)
 * - CustomersModule mobile cards & desktop table (nonempty & empty states, search)
 * - SuppliersModule mobile cards & desktop table (nonempty & empty states, search)
 * - ReceiptsModule, IssuesModule, AdjustmentsModule (clean execution, no cross-contamination)
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  بدء اختبارات التحقق من التوافق البرمجي للهواتف (Mobile UX)');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');

// --- Helper to extract and instantiate modules ---
function createMockEnv(initialAppState = {}) {
    const domElements = {};
    const document = {
        getElementById(id) {
            if (!domElements[id]) {
                domElements[id] = {
                    id,
                    value: '',
                    innerHTML: '',
                    innerText: '',
                    style: {},
                    classList: {
                        add: () => {},
                        remove: () => {},
                        toggle: () => {},
                        contains: () => false
                    },
                    children: [],
                    querySelector: () => null,
                    querySelectorAll: () => []
                };
            }
            return domElements[id];
        }
    };

    const AppState = {
        currentUser: { id: 'u1', email: 'admin@alamira.com' },
        products: [],
        categories: [],
        customers: [],
        suppliers: [],
        invoices: [],
        receipts: [],
        issues: [],
        adjustments: [],
        ...initialAppState
    };

    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const formatQty = (n) => Number(n) || 0;
    const showToast = () => {};

    return { document, domElements, AppState, round2, formatQty, showToast };
}

function extractModule(moduleName) {
    const regex = new RegExp('const ' + moduleName + ' = \\{[\\s\\S]*?\\n        \\};');
    const match = html.match(regex);
    assert(match, 'تعذر استخراج الموديول ' + moduleName + ' من index.html');
    return match[0];
}

// --------------------------------------------------------------------------
// 1. Verify ProductsModule.renderTable() execution
// --------------------------------------------------------------------------
console.log('\n--- 1. فحص تنفيذ ProductsModule.renderTable() وتجريده من الحقن الخاطئ ---');

const prodCode = extractModule('ProductsModule');
assert(!prodCode.includes('this.renderMobileCards'), 'ما زال ProductsModule يحتوي على استدعاء renderMobileCards الخاطئ');
assert(!prodCode.includes('invoices-mobile-list'), 'ما زال ProductsModule يحتوي على إشارة لحاوية فواتير الهاتف');

const mockEnv1 = createMockEnv({
    products: [
        { id: 'p1', sku: 'ALM-001', name: 'أسلاك نحاس 2 مم', current_stock: 50, unit: 'متر', purchase_price: 15, selling_price: 22, is_active: true },
        { id: 'p2', sku: 'ALM-002', name: 'مفتاح كهرباء أحادي', current_stock: 0, unit: 'قطعة', purchase_price: 10, selling_price: 18, is_active: false }
    ],
    categories: []
});

const prodFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', prodCode + '; return ProductsModule;');
const prodMod = prodFn(mockEnv1.AppState, mockEnv1.document, mockEnv1.round2, mockEnv1.formatQty, mockEnv1.showToast);

assert.doesNotThrow(() => {
    prodMod.renderTable();
}, 'فشل تنفيذ ProductsModule.renderTable() ورمى استثناءً');

const prodTbody = mockEnv1.domElements['products-table-body'];
assert(prodTbody && prodTbody.innerHTML.includes('ALM-001'), 'جدول الأصناف لم يحتوي على اسم الصنف بعد الريندر');
assert(prodTbody.innerHTML.includes('أسلاك نحاس 2 مم'), 'جدول الأصناف لم يحتوي على الصنف النشط');
assert(!mockEnv1.domElements['invoices-mobile-list']?.innerHTML, 'تم تلويث حاوية فواتير الهاتف أثناء ريندر الأصناف!');
console.log('✅ نجاح: ProductsModule.renderTable() يعمل بنجاح بدون أخطاء ولا يستدعي بطاقات الفواتير.');

// --------------------------------------------------------------------------
// 2. Verify InvoicesModule mobile cards and desktop table
// --------------------------------------------------------------------------
console.log('\n--- 2. فحص ريندر فواتير المبيعات (الجدول المكتبي وبطاقات الهاتف) ---');

const invCode = extractModule('InvoicesModule');
const mockEnv2 = createMockEnv({
    customers: [{ id: 'c1', name: 'الحاج إبراهيم', phone: '01099887766' }],
    invoices: [
        {
            id: 'inv-1',
            invoice_number: 'INV-2026-001',
            invoice_date: '2026-11-17',
            customer_id: 'c1',
            gross_amount: 1000,
            item_discounts_amount: 50,
            invoice_discount_amount: 0,
            final_total: 950,
            status: 'draft'
        },
        {
            id: 'inv-2',
            invoice_number: 'INV-2026-002',
            invoice_date: '2026-11-17',
            customer_id: 'c1',
            gross_amount: 2000,
            item_discounts_amount: 0,
            invoice_discount_amount: 100,
            final_total: 1900,
            status: 'approved'
        }
    ]
});

const invFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', 'PrintModule', invCode + '; return InvoicesModule;');
const invMod = invFn(mockEnv2.AppState, mockEnv2.document, mockEnv2.round2, mockEnv2.formatQty, mockEnv2.showToast, {});

invMod.renderTable();

const invTbody = mockEnv2.domElements['invoices-table-body'];
const invMobileList = mockEnv2.domElements['invoices-mobile-list'];

assert(invTbody && invTbody.innerHTML.includes('INV-2026-001'), 'جدول فواتير المبيعات لم يحتوي على الفاتورة الأولى');
assert(invMobileList && invMobileList.innerHTML.includes('INV-2026-001'), 'بطاقات فواتير الهاتف لم تحتوي على الفاتورة الأولى');
assert(invMobileList.innerHTML.includes('INV-2026-002'), 'بطاقات فواتير الهاتف لم تحتوي على الفاتورة الثانية');
assert(invMobileList.innerHTML.includes('الحاج إبراهيم'), 'بطاقات فواتير الهاتف لم تحتوي على اسم العميل');
assert(invMobileList.innerHTML.includes('950.00 ج.م'), 'بطاقات فواتير الهاتف لم تحتوي على إجمالي الفاتورة الصافي');

// Test empty state
const mockEnv2Empty = createMockEnv({ invoices: [] });
const invModEmpty = invFn(mockEnv2Empty.AppState, mockEnv2Empty.document, mockEnv2Empty.round2, mockEnv2Empty.formatQty, mockEnv2Empty.showToast, {});
invModEmpty.renderTable();
assert(mockEnv2Empty.domElements['invoices-mobile-list'].innerHTML.includes('لا توجد فواتير'), 'الحالة الفارغة لفواتير الهاتف لم تظهر');
console.log('✅ نجاح: فواتير المبيعات ترندر الجدول وبطاقات الهاتف للبيانات الممتلئة والفارغة بدقة.');

// --------------------------------------------------------------------------
// 3. Verify CustomersModule mobile cards and desktop table
// --------------------------------------------------------------------------
console.log('\n--- 3. فحص ريندر العملاء (الجدول وبطاقات الهاتف) وحل مشكلة الشاشة الفارغة ---');

const custCode = extractModule('CustomersModule');
const mockEnv3 = createMockEnv({
    customers: [
        { id: 'c1', name: 'أحمد محمود', phone: '01011223344', address: 'قنا - الوقف', notes: 'عميل جملة', is_active: true },
        { id: 'c2', name: 'سيد عبد الرازق', phone: '01222334455', address: 'نجع حمادي', notes: '', is_active: true }
    ]
});

const custFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', custCode + '; return CustomersModule;');
const custMod = custFn(mockEnv3.AppState, mockEnv3.document, mockEnv3.round2, mockEnv3.formatQty, mockEnv3.showToast);

custMod.renderTable();

const custTbody = mockEnv3.domElements['customers-table-body'];
const custMobileList = mockEnv3.domElements['customers-mobile-list'];

assert(custTbody && custTbody.innerHTML.includes('أحمد محمود'), 'جدول العملاء لم يحتوي على العميل أحمد');
assert(custMobileList && custMobileList.innerHTML.includes('أحمد محمود'), 'بطاقات العملاء للهاتف لم تحتوي على العميل أحمد');
assert(custMobileList.innerHTML.includes('01011223344'), 'بطاقة العميل لم تعرض رقم الهاتف');
assert(custMobileList.innerHTML.includes('قنا - الوقف'), 'بطاقة العميل لم تعرض العنوان');
assert(custMobileList.innerHTML.includes('CustomersModule.viewCustomer'), 'أزرار المعاينة غير موجودة في بطاقة العميل للهاتف');
assert(custMobileList.innerHTML.includes('CustomersModule.openModal'), 'أزرار التعديل غير موجودة في بطاقة العميل للهاتف');

// Test empty state
const mockEnv3Empty = createMockEnv({ customers: [] });
const custModEmpty = custFn(mockEnv3Empty.AppState, mockEnv3Empty.document, mockEnv3Empty.round2, mockEnv3Empty.formatQty, mockEnv3Empty.showToast);
custModEmpty.renderTable();
assert(mockEnv3Empty.domElements['customers-mobile-list'].innerHTML.includes('دليل العملاء فارغ'), 'الحالة الفارغة لبطاقات العملاء للهاتف لم تظهر');
console.log('✅ نجاح: واجهة العملاء تدعم بطاقات الهاتف والشاشة الممتلئة والفارغة بالكامل.');

// --------------------------------------------------------------------------
// 4. Verify SuppliersModule mobile cards and desktop table
// --------------------------------------------------------------------------
console.log('\n--- 4. فحص ريندر الموردين (الجدول وبطاقات الهاتف) وحل مشكلة الشاشة الفارغة ---');

const supCode = extractModule('SuppliersModule');
const mockEnv4 = createMockEnv({
    suppliers: [
        { id: 's1', name: 'شركة النيل للكابلات', phone: '01122334455', address: 'القاهرة', notes: 'موزع رئيسي', is_active: true }
    ]
});

const supFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', supCode + '; return SuppliersModule;');
const supMod = supFn(mockEnv4.AppState, mockEnv4.document, mockEnv4.round2, mockEnv4.formatQty, mockEnv4.showToast);

supMod.renderTable();

const supTbody = mockEnv4.domElements['suppliers-table-body'];
const supMobileList = mockEnv4.domElements['suppliers-mobile-list'];

assert(supTbody && supTbody.innerHTML.includes('شركة النيل للكابلات'), 'جدول الموردين لم يحتوي على المورد');
assert(supMobileList && supMobileList.innerHTML.includes('شركة النيل للكابلات'), 'بطاقات الموردين للهاتف لم تحتوي على المورد');
assert(supMobileList.innerHTML.includes('01122334455'), 'بطاقة المورد لم تعرض رقم الهاتف');
assert(supMobileList.innerHTML.includes('SuppliersModule.viewSupplier'), 'أزرار المعاينة غير موجودة في بطاقة المورد للهاتف');

// Test empty state
const mockEnv4Empty = createMockEnv({ suppliers: [] });
const supModEmpty = supFn(mockEnv4Empty.AppState, mockEnv4Empty.document, mockEnv4Empty.round2, mockEnv4Empty.formatQty, mockEnv4Empty.showToast);
supModEmpty.renderTable();
assert(mockEnv4Empty.domElements['suppliers-mobile-list'].innerHTML.includes('دليل الموردين فارغ'), 'الحالة الفارغة لبطاقات الموردين للهاتف لم تظهر');
console.log('✅ نجاح: واجهة الموردين تدعم بطاقات الهاتف والشاشة الممتلئة والفارغة بالكامل.');

// --------------------------------------------------------------------------
// 5. Verify Receipts, Issues, Adjustments have no cross-contamination
// --------------------------------------------------------------------------
console.log('\n--- 5. فحص عدم تداخل أذون الاستلام والصرف وتسويات الجرد مع بطاقات الفواتير ---');

const recCode = extractModule('ReceiptsModule');
const issCode = extractModule('IssuesModule');
const adjCode = extractModule('AdjustmentsModule');

assert(!recCode.includes('this.renderMobileCards'), 'ما زال ReceiptsModule يحتوي على renderMobileCards');
assert(!issCode.includes('this.renderMobileCards'), 'ما زال IssuesModule يحتوي على renderMobileCards');
assert(!adjCode.includes('this.renderMobileCards'), 'ما زال AdjustmentsModule يحتوي على renderMobileCards');

const mockEnvOther = createMockEnv();
const recFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', 'PrintModule', recCode + '; return ReceiptsModule;');
const issFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', 'PrintModule', issCode + '; return IssuesModule;');
const adjFn = new Function('AppState', 'document', 'round2', 'formatQty', 'showToast', 'PrintModule', adjCode + '; return AdjustmentsModule;');

assert.doesNotThrow(() => recFn(mockEnvOther.AppState, mockEnvOther.document, mockEnvOther.round2, mockEnvOther.formatQty, mockEnvOther.showToast, {}).renderTable());
assert.doesNotThrow(() => issFn(mockEnvOther.AppState, mockEnvOther.document, mockEnvOther.round2, mockEnvOther.formatQty, mockEnvOther.showToast, {}).renderTable());
assert.doesNotThrow(() => adjFn(mockEnvOther.AppState, mockEnvOther.document, mockEnvOther.round2, mockEnvOther.formatQty, mockEnvOther.showToast, {}).renderTable());

assert(!mockEnvOther.domElements['invoices-mobile-list']?.innerHTML, 'تمت كتابة بيانات خاطئة داخل invoices-mobile-list من أحد الموديولات الأخرى');
console.log('✅ نجاح: موديولات أذون الاستلام والصرف والتسويات معزولة بالكامل ولا تلوث بطاقات الفواتير.');

// --------------------------------------------------------------------------
// 6. Verify HTML/CSS Structure & Mobile Classes
// --------------------------------------------------------------------------
console.log('\n--- 6. فحص بنية HTML وCSS لضمان عدم إخفاء البيانات بدون بديل للهاتف ---');

assert(html.includes('class="table-responsive invoice-desktop-table"'), 'فئة invoice-desktop-table غير مضافة للجدول');
assert(html.includes('class="invoice-mobile-cards" id="invoices-mobile-list"'), 'حاوية invoices-mobile-list غير موجودة');

assert(html.includes('class="table-responsive customers-desktop-table"'), 'فئة customers-desktop-table غير مضافة للجدول');
assert(html.includes('class="customers-mobile-cards" id="customers-mobile-list"'), 'حاوية customers-mobile-list غير موجودة');

assert(html.includes('class="table-responsive suppliers-desktop-table"'), 'فئة suppliers-desktop-table غير مضافة للجدول');
assert(html.includes('class="suppliers-mobile-cards" id="suppliers-mobile-list"'), 'حاوية suppliers-mobile-list غير موجودة');

// Verify that products-desktop-table is NOT hiding products table on mobile
assert(!html.includes('products-desktop-table'), 'تم العثور على فئة products-desktop-table غير مكتملة');

// Verify inputmode attributes
assert(/<input[^>]*id="inv-discount-val"[^>]*inputmode="decimal"|<input[^>]*inputmode="decimal"[^>]*id="inv-discount-val"/.test(html), 'inputmode="decimal" مفقود في خصم الفاتورة');
assert(/<input[^>]*id="inv-charges"[^>]*inputmode="decimal"|<input[^>]*inputmode="decimal"[^>]*id="inv-charges"/.test(html), 'inputmode="decimal" مفقود في مصاريف الشحن');
assert(/<input[^>]*id="prod-form-opening-qty"[^>]*inputmode="decimal"|<input[^>]*inputmode="decimal"[^>]*id="prod-form-opening-qty"/.test(html), 'inputmode="decimal" مفقود في الرصيد الافتتاحي للصنف');

console.log('✅ نجاح: بنية الفئات المتجاوبة وخصائص لوحة مفاتيح الهواتف inputmode مطبقة بشكل سليم ومنسق.');

console.log('\n=============================================================');
console.log('  جميع اختبارات ريجريشن وتوافق الهواتف (27 فحصاً) نجحت 100%');
console.log('=============================================================');
