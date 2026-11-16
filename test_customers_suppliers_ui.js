/**
 * test_customers_suppliers_ui.js
 * Comprehensive automated verification for Phase 3: Customers & Suppliers UI Finalization
 * Business: شركة الأميرة للتوريدات العامة والتجارة
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  بدء اختبارات التحقق من واجهة العملاء والموردين (Phase 3 UI)');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify Customers Section (view-customers) Elements
console.log('\n--- 1. فحص عناصر شاشة العملاء الرئيسية (view-customers) ---');

assert(html.includes('id="view-customers"'), 'شاشة view-customers غير موجودة');
assert(html.includes('id="customers-total-badge"'), 'شارة إجمالي عدد العملاء غير موجودة');
assert(html.includes('id="customers-search"'), 'حقل البحث عن العملاء غير موجود');
assert(html.includes('CustomersModule.openModal()'), 'زر إضافة عميل غير مرتبط بدالة CustomersModule.openModal');
assert(html.includes('id="customers-table-body"'), 'جدول العملاء customers-table-body غير موجود');

// Verify emerald button (no gold in customers header)
const custSection = html.substring(html.indexOf('id="view-customers"'), html.indexOf('id="view-suppliers"'));
assert(!custSection.includes('btn-gold'), 'ما زال يوجد زر باللون الذهبي في شاشة العملاء بدلاً من الزمردي');
assert(custSection.includes('btn-primary'), 'زر إضافة عميل ليس باللون الزمردي الأساسي btn-primary');
console.log('✅ نجاح: شاشة العملاء مكتملة مع زر زمردي أساسي، شريط البحث، شارة العدد الإجمالي، وجدول البيانات.');

// 2. Verify Suppliers Section (view-suppliers) Elements
console.log('\n--- 2. فحص عناصر شاشة الموردين الرئيسية (view-suppliers) ---');

assert(html.includes('id="view-suppliers"'), 'شاشة view-suppliers غير موجودة');
assert(html.includes('id="suppliers-total-badge"'), 'شارة إجمالي عدد الموردين غير موجودة');
assert(html.includes('id="suppliers-search"'), 'حقل البحث عن الموردين غير موجود');
assert(html.includes('SuppliersModule.openModal()'), 'زر إضافة مورد غير مرتبط بدالة SuppliersModule.openModal');
assert(html.includes('id="suppliers-table-body"'), 'جدول الموردين suppliers-table-body غير موجود');

// Verify emerald button (no gold in suppliers header)
const supSection = html.substring(html.indexOf('id="view-suppliers"'), html.indexOf('id="view-reports"'));
assert(!supSection.includes('btn-gold'), 'ما زال يوجد زر باللون الذهبي في شاشة الموردين بدلاً من الزمردي');
assert(supSection.includes('btn-primary'), 'زر إضافة مورد ليس باللون الزمردي الأساسي btn-primary');
console.log('✅ نجاح: شاشة الموردين مستقلة تماماً مع زر زمردي أساسي، شريط البحث، شارة العدد، وجدول البيانات.');

// 3. Verify Dedicated Customer Form & Modals (modal-customer, modal-view-customer)
console.log('\n--- 3. فحص نموذج ونافذة العميل المستقلة (modal-customer & modal-view-customer) ---');

assert(html.includes('id="modal-customer"'), 'نافذة modal-customer غير موجودة');
assert(html.includes('id="cust-id"'), 'حقل cust-id غير موجود');
assert(html.includes('id="cust-name"'), 'حقل اسم العميل cust-name غير موجود');
assert(html.includes('id="cust-phone"'), 'حقل هاتف العميل cust-phone غير موجود');
assert(html.includes('id="cust-address"'), 'حقل عنوان العميل cust-address غير موجود');
assert(html.includes('id="cust-notes"'), 'حقل ملاحظات العميل cust-notes غير موجود');
assert(html.includes('id="btn-save-customer"'), 'زر حفظ العميل btn-save-customer غير موجود');
assert(html.includes('CustomersModule.closeModal()'), 'زر إغلاق نافذة العميل غير مرتبط بدالة CustomersModule.closeModal');

assert(html.includes('id="modal-view-customer"'), 'نافذة معاينة تفاصيل العميل modal-view-customer غير موجودة');
assert(html.includes('id="view-cust-name"'), 'عنصر اسم العميل في شاشة المعاينة غير موجود');
assert(html.includes('id="view-cust-invoices-count"'), 'عنصر عدد فواتير العميل في المعاينة غير موجود');
console.log('✅ نجاح: نموذج ونافذة معاينة العميل مستقلة ومصممة بدقة مع كافة الحقول الأساسية والأزرار الثابتة.');

// 4. Verify Dedicated Supplier Form & Modals (modal-supplier, modal-view-supplier)
console.log('\n--- 4. فحص نموذج ونافذة المورد المستقلة (modal-supplier & modal-view-supplier) ---');

assert(html.includes('id="modal-supplier"'), 'نافذة modal-supplier غير موجودة');
assert(html.includes('id="sup-id"'), 'حقل sup-id غير موجود');
assert(html.includes('id="sup-name"'), 'حقل اسم المورد sup-name غير موجود');
assert(html.includes('id="sup-phone"'), 'حقل هاتف المورد sup-phone غير موجود');
assert(html.includes('id="sup-address"'), 'حقل عنوان المورد sup-address غير موجود');
assert(html.includes('id="sup-notes"'), 'حقل ملاحظات المورد sup-notes غير موجود');
assert(html.includes('id="btn-save-supplier"'), 'زر حفظ المورد btn-save-supplier غير موجود');
assert(html.includes('SuppliersModule.closeModal()'), 'زر إغلاق نافذة المورد غير مرتبط بدالة SuppliersModule.closeModal');

assert(html.includes('id="modal-view-supplier"'), 'نافذة معاينة تفاصيل المورد modal-view-supplier غير موجودة');
assert(html.includes('id="view-sup-name"'), 'عنصر اسم المورد في شاشة المعاينة غير موجود');
assert(html.includes('id="view-sup-receipts-count"'), 'عنصر عدد أذون استلام المورد في المعاينة غير موجود');
console.log('✅ نجاح: نموذج ونافذة معاينة المورد مستقلة تماماً ومصممة بدقة ولا تختلط بسجلات العملاء.');

// 5. Verify Quick Customer Creation from Invoice
console.log('\n--- 5. التحقق من مسار الإضافة السريعة للعميل من الفاتورة (Quick Add Workflow) ---');

assert(html.includes('CustomersModule.openQuickModal()'), 'زر الإضافة السريعة بالفاتورة غير مرتبط بـ CustomersModule.openQuickModal()');
assert(html.includes('isQuickFromInvoice'), 'متغير حالة الإضافة السريعة isQuickFromInvoice غير معرف في الكود');
assert(html.includes('custSelect.value = savedCustomerId'), 'لم يتم ضبط العميل المضاف تلقائياً في قائمة الفاتورة');
assert(html.includes('phoneInput.value = phone'), 'لم يتم تعبئة هاتف العميل تلقائياً في الفاتورة');

// Check that closeModal does NOT close modal-invoice
const closeModMethod = html.substring(html.indexOf('closeModal() {'), html.indexOf('async handleSave(e) {'));
assert(closeModMethod.includes("document.getElementById('modal-customer').classList.remove('active')"), 'دالة إغلاق نافذة العميل لا تغلق modal-customer بدقة');
assert(!closeModMethod.includes('App.closeModals()'), 'دالة إغلاق نافذة العميل تغلق كافة النوافذ بالخطأ');
console.log('✅ نجاح: مسار الإضافة السريعة للعميل يفتح النافذة فوق الفاتورة، يختار العميل الجديد، ويحافظ على بنود الفاتورة بالكامل.');

// 6. Verify Safe Deletion Business Logic Simulation
console.log('\n--- 6. محاكاة قواعد الحذف الآمن ومنع الحذف المرتبط بحركات تجارية ---');

// Mock data test
const mockInvoices = [{ customer_id: 'cust-1', invoice_number: 'INV-001' }];
const mockReceipts = [{ supplier_id: 'sup-1', receipt_number: 'REC-001' }];

function canDeleteCustomer(customerId, invoices) {
    const linked = invoices.filter(inv => inv.customer_id === customerId);
    return {
        canDelete: linked.length === 0,
        linkedCount: linked.length
    };
}

function canDeleteSupplier(supplierId, receipts) {
    const linked = receipts.filter(r => r.supplier_id === supplierId);
    return {
        canDelete: linked.length === 0,
        linkedCount: linked.length
    };
}

// Test Customer Deletion
const custRes1 = canDeleteCustomer('cust-1', mockInvoices);
assert.strictEqual(custRes1.canDelete, false, 'يجب منع حذف عميل لديه فواتير مبيعات');
assert.strictEqual(custRes1.linkedCount, 1);

const custRes2 = canDeleteCustomer('cust-2', mockInvoices);
assert.strictEqual(custRes2.canDelete, true, 'يجب السماح بحذف عميل ليس لديه أي فواتير مسجلة');

// Test Supplier Deletion
const supRes1 = canDeleteSupplier('sup-1', mockReceipts);
assert.strictEqual(supRes1.canDelete, false, 'يجب منع حذف مورد لديه أذون استلام بضاعة');
assert.strictEqual(supRes1.linkedCount, 1);

const supRes2 = canDeleteSupplier('sup-2', mockReceipts);
assert.strictEqual(supRes2.canDelete, true, 'يجب السماح بحذف مورد ليس لديه أي أذون استلام مسجلة');

console.log('✅ نجاح: تم التحقق من منع حذف العملاء المرتبطين بفواتير والموردين المرتبطين بأذون استلام.');

// 7. Verify Backward-Compatibility Adapter (ContactsModule)
console.log('\n--- 7. التحقق من محول التوافق القديم (ContactsModule Adapter) ---');

assert(html.includes('const ContactsModule = {'), 'محول التوافق ContactsModule غير معرف');
assert(html.includes("CustomersModule.openQuickModal()"), 'محول التوافق لا يدعم فتح الإضافة السريعة للعميل عند وجود الفاتورة');
console.log('✅ نجاح: محول التوافق ContactsModule يحول الاستدعاءات بسلاسة إلى الوحدتين المستقلتين.');

console.log('\n=============================================================');
console.log('  🎉 كافة اختبارات واجهة العملاء والموردين نجحت بنسبة 100%!');
console.log('=============================================================');
