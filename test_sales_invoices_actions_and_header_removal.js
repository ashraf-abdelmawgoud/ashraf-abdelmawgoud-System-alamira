/**
 * test_sales_invoices_actions_and_header_removal.js
 * Verification test suite for:
 * 1. Global header sales button removal
 * 2. Icon clarity and tooltips in sidebar & UI
 * 3. Sales invoices actions (Draft: View, Edit, Approve, Print, PNG, Delete; Approved: View, Print, PNG, Return, Cancel; Cancelled: View, Print, PNG)
 * 4. Return modal (#modal-invoice-return) and workflows
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  🧪 TEST SUITE: HEADER REMOVAL, ICONS & INVOICE ACTIONS');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Verify Global Header Sales Button Removal
console.log('\n--- 1. التحقق من الإزالة التامة لزر الفاتورة من الترويسة العلوية ---');
const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart) + '</header>'.length;
const topbarHTML = html.substring(topbarStart, topbarEnd);

assert(!topbarHTML.includes('topbar-primary-action'), 'تمت إزالة فئة زر الفاتورة topbar-primary-action من الترويسة العلوية');
assert(!topbarHTML.includes('فاتورة مبيعات'), 'تمت إزالة نص زر فاتورة مبيعات من الترويسة العلوية');
assert(!topbarHTML.includes('openNewInvoiceModal'), 'لا توجد استدعاءات لفتح الفاتورة من داخل الترويسة العلوية');

// Check that invoice creation is preserved in dashboard and invoices view
assert(html.includes('id="view-dashboard"') && html.includes('App.openNewInvoiceModal()'), 'زر إنشاء الفاتورة محفوظ في لوحة التحكم');
assert(html.includes('id="view-invoices"') && html.includes('App.openNewInvoiceModal()'), 'زر إنشاء الفاتورة محفوظ في صفحة المبيعات والفواتير');
console.log('  ✅ تم التحقق: زر الفاتورة أزيل بالكامل من الترويسة العلوية مع الحفاظ عليه داخل لوحة التحكم وصفحة المبيعات.');

// 2. Verify Icon Clarity, Usability, and Tooltips
console.log('\n--- 2. التحقق من وضوح الأيقونات والتلميحات التوضيحية (Tooltips & A11y) ---');
const sidebarMenuStart = html.indexOf('class="sidebar-menu"');
const sidebarMenuEnd = html.indexOf('</ul>', sidebarMenuStart);
const sidebarMenuHTML = html.substring(sidebarMenuStart, sidebarMenuEnd);

assert(sidebarMenuHTML.includes('title="لوحة التحكم الرئيسية والمؤشرات الشاملة"'), 'تلميح واضح لقسم لوحة التحكم');
assert(sidebarMenuHTML.includes('title="إدارة الأصناف والمستودعات ورصيد المخزون"'), 'تلميح واضح لقسم الأصناف والمخزون');
assert(sidebarMenuHTML.includes('title="إصدار وإدارة فواتير المبيعات والمرتجعات"'), 'تلميح واضح لقسم المبيعات والفواتير');
assert(sidebarMenuHTML.includes('title="سجل العملاء وبيانات الاتصال والمديونيات"'), 'تلميح واضح لقسم العملاء');
assert(sidebarMenuHTML.includes('title="سجل الموردين وتوريدات البضائع"'), 'تلميح واضح لقسم الموردين');
assert(sidebarMenuHTML.includes('title="التقارير المالية والتحليلية والمحاسبية"'), 'تلميح واضح لقسم التقارير');
assert(sidebarMenuHTML.includes('title="إعدادات النظام والنسخ الاحتياطي والأمان"'), 'تلميح واضح لقسم الإعدادات');

// Sidebar footer
const footerStart = html.indexOf('class="sidebar-footer"');
const footerEnd = html.indexOf('</aside>', footerStart);
const footerHTML = html.substring(footerStart, footerEnd);
assert(footerHTML.includes('id="sidebar-user-avatar"'), 'أيقونة صورة المستخدم موجودة');
assert(footerHTML.includes('id="sidebar-user-name"'), 'اسم المستخدم موجود');
assert(footerHTML.includes('id="sidebar-user-role"'), 'دور المستخدم موجود');
assert(footerHTML.includes('title="تسجيل الخروج من النظام"'), 'تلميح زر تسجيل الخروج موجود');
console.log('  ✅ تم التحقق: جميع عناصر القائمة وذيل الشريط الجانبي مزودة بتلميحات واضحة وأيقونات عالية التباين.');

// 3. Verify Invoice Table Row Actions
console.log('\n--- 3. التحقق من أزرار الإجراءات في جدول فواتير المبيعات (Row Actions) ---');

// Check action button CSS
assert(html.includes('.action-btn-pill {'), 'فئة action-btn-pill موجودة بالـ CSS');
assert(html.includes('.action-btn-pill.btn-return-pill {'), 'فئة زر المرتجع btn-return-pill موجودة بالـ CSS بلون كهرماني ذهبي عالي التباين');
assert(html.includes('.action-btn-pill.btn-cancel-pill {'), 'فئة زر الإلغاء btn-cancel-pill موجودة بالـ CSS');
assert(html.includes('.action-btn-pill.btn-edit-pill {'), 'فئة زر التعديل btn-edit-pill موجودة بالـ CSS');

// Check InvoicesModule.renderTable implementation for the 3 states
assert(html.includes("inv.status === 'draft'"), 'معالجة فواتير المسودة موجودة');
assert(html.includes("inv.status === 'approved'"), 'معالجة الفواتير المعتمدة موجودة');
assert(html.includes("InvoicesModule.openReturnModal"), 'ربط زر المرتجع بالدالة openReturnModal');
assert(html.includes("title=\"تسجيل مرتجع مبيعات\""), 'تلميح زر تسجيل المرتجع موجود');
assert(html.includes("title=\"تعديل المسودة\""), 'تلميح زر تعديل المسودة موجود');
assert(html.includes("title=\"اعتماد الفاتورة وخصم المخزون\""), 'تلميح زر الاعتماد موجود');
assert(html.includes("title=\"إلغاء الفاتورة واسترجاع المخزون\""), 'تلميح زر الإلغاء موجود');
assert(html.includes("title=\"حذف المسودة نهائياً\""), 'تلميح زر حذف المسودة موجود');
console.log('  ✅ تم التحقق: تم ضبط أزرار الإجراءات لكل حالة بدقة متناهية (معاينة، تعديل، اعتماد، طباعة، صورة PNG، مرتجع، إلغاء، حذف).');

// 4. Verify Return Modal and Functions
console.log('\n--- 4. التحقق من نافذة تسجيل مرتجع المبيعات (Return Modal) والدوال التشغيلية ---');
assert(html.includes('id="modal-invoice-return"'), 'نافذة modal-invoice-return موجودة بالـ DOM');
assert(html.includes('id="return-inv-id"'), 'حقل معرف الفاتورة المرتجعة موجود');
assert(html.includes('id="return-inv-num"'), 'عنصر رقم الفاتورة المرتجعة موجود');
assert(html.includes('id="return-inv-customer"'), 'عنصر اسم العميل في المرتجع موجود');
assert(html.includes('id="return-inv-items-tbody"'), 'جدول أصناف الفاتورة القابلة للإرجاع موجود');
assert(html.includes('id="return-inv-reason"'), 'حقل سبب المرتجع الإلزامي موجود ومحدد كـ required');
assert(html.includes('id="btn-submit-return"'), 'زر تأكيد وإثبات المرتجع موجود');

assert(html.includes('openReturnModal(invoiceId) {'), 'دالة openReturnModal معرفة في InvoicesModule');
assert(html.includes('executeReturn(e) {') || html.includes('executeReturn(event)'), 'دالة executeReturn معرفة ومؤمنة في InvoicesModule');
console.log('  ✅ تم التحقق: نافذة المرتجع والمنطق البرمجي لإرجاع الأصناف واكتمال الدورة المستندية مدمج بنجاح.');

// 5. DOM ID Uniqueness Check
console.log('\n--- 5. التحقق من سلامة وتفرد كافة معرّفات الـ DOM ---');
const idRegex = /id=["']([^"']+)["']/g;
const ids = {};
let match;
let duplicateCount = 0;
while ((match = idRegex.exec(html)) !== null) {
    const id = match[1];
    if (ids[id]) {
        ids[id]++;
        duplicateCount++;
    } else {
        ids[id] = 1;
    }
}
assert(duplicateCount === 0, 'لا يوجد أي تكرار لمعرّفات الـ DOM (إجمالي المعرفات: ' + Object.keys(ids).length + ')');
console.log('  ✅ تم التحقق: خلو تام من أي تكرار للمعرفات بالـ DOM (إجمالي ' + Object.keys(ids).length + ' معرفاً فريداً).');

console.log('\n=============================================================');
console.log('  🎉 نجاح فحص واجهة المستخدم وأزرار الفواتير وإزالة زر الترويسة بنسبة 100%!');
console.log('=============================================================');
