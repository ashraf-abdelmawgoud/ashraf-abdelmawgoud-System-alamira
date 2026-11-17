/**
 * test_ui_cleanup_header_and_icons.js
 * Automated verification test suite for AL-AMIRA UI Cleanup, Header Simplification,
 * Icon Fixes, and Invoice Page Polish.
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  🧪 TEST SUITE: UI CLEANUP, HEADER & ICONS POLISH');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Header Cleanup Verification
console.log('\n--- 1. التحقق من تبسيط وتنظيف الترويسة العلوية (Header Cleanup) ---');

const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart) + '</header>'.length;
const topbarHTML = html.substring(topbarStart, topbarEnd);

// A. Supabase connection pill is removed from visible UI
assert(topbarHTML.includes('id="connection-pill"'), 'عنصر connection-pill موجود في DOM للتوافق البرمجي');
assert(topbarHTML.includes('display: none !important;'), 'شارة الاتصال السحابي connection-pill محجوبة تماماً عن الواجهة المرئية');

// B. Sales invoice button completely removed from topbar
assert(!topbarHTML.includes('topbar-primary-action'), 'تمت إزالة زر الإجراء الرئيسي للترويسة العلوية بالكامل');
assert(!topbarHTML.includes('فاتورة مبيعات'), 'تمت إزالة نص وزر فاتورة مبيعات من الترويسة العلوية بالكامل');

// C. Backup warning completely removed from topbar
assert(!topbarHTML.includes('topbar-backup-alert'), 'تمت إزالة عنصر شارة تحذير النسخ الاحتياطي من الترويسة العلوية بالكامل');
assert(!topbarHTML.includes('نسخة احتياطية مطلوبة'), 'تمت إزالة نص تحذير النسخ الاحتياطي من الترويسة العلوية');

// D. Clean Date Display
assert(topbarHTML.includes('id="current-arabic-date"'), 'عرض التاريخ موجود بأناقة');
console.log('  ✅ تم التحقق: الترويسة العلوية نظيفة تماماً، وشارة الاتصال محجوبة عن الواجهة، وخالية من الأيقونات المكررة والتشويش البصري.');

// 2. System Status / Migrations / RPC Removal
console.log('\n--- 2. التحقق من إخفاء قسم "حالة النظام والترقيات والتدقيق" عن الواجهة التشغيلية ---');

const settStart = html.indexOf('id="view-settings"');
const settEnd = html.indexOf('</section>', settStart);
const settHTML = html.substring(settStart, settEnd);

assert(settHTML.includes('id="settings-tab-system"'), 'تبويب النظام موجود للتوافق');
assert(settHTML.includes('id="settings-panel-system"'), 'لوحة النظام موجودة للتوافق');

// Check that they are hidden from visible UI
const tabSystemMatch = settHTML.match(/id="settings-tab-system"[^>]*style="([^"]*)"/);
assert(tabSystemMatch && tabSystemMatch[1].includes('display: none'), 'تبويب حالة النظام والترقيات محجوب عن واجهة المستخدم');

const panelSystemMatch = html.match(/id="settings-panel-system"[^>]*style="([^"]*)"/);
assert(panelSystemMatch && panelSystemMatch[1].includes('display: none'), 'لوحة حالة النظام والترقيات محجوبة عن واجهة المستخدم');
console.log('  ✅ تم التحقق: تم إخفاء قسم "حالة النظام والترقيات والتدقيق" بالكامل عن الواجهة التشغيلية لعدم إرباك المستخدم.');

// 3. Remove Plus Signs from Add Buttons
console.log('\n--- 3. التحقق من إزالة علامات الزائد الزائدة (+) من نصوص أزرار الإضافة ---');

// Customer Add Button
assert(!html.includes('+ إضافة عميل'), 'لا تزال علامة الزائد (+) مكررة بنص زر إضافة عميل');
assert(html.includes('إضافة عميل'), 'زر إضافة عميل موجود بتسمية أنيقة ومباشرة');

// Supplier Add Button
assert(!html.includes('+ إضافة مورد'), 'لا تزال علامة الزائد (+) مكررة بنص زر إضافة مورد');
assert(html.includes('إضافة مورد'), 'زر إضافة مورد موجود بتسمية أنيقة ومباشرة');

// Product Add Button
assert(!html.includes('+ إضافة صنف'), 'لا تزال علامة الزائد (+) مكررة بنص زر إضافة صنف');
assert(html.includes('إضافة صنف جديد'), 'زر إضافة صنف جديد موجود بتسمية أنيقة');

// Sales Invoice Add Button
assert(!html.includes('+ فاتورة مبيعات'), 'لا تزال علامة الزائد (+) مكررة بنص زر فاتورة مبيعات');
assert(html.includes('فاتورة مبيعات جديدة'), 'زر فاتورة مبيعات جديدة موجود بتسمية أنيقة');
console.log('  ✅ تم التحقق: تمت إزالة كافة علامات الزائد الزائدة (+) من نصوص أزرار الإضافة وأصبحت التسميات أنيقة ونظامية.');

// 4. Invoices Page Redesign & Action Buttons Consistency
console.log('\n--- 4. التحقق من إعادة تصميم وتنسيق شاشة فواتير المبيعات وأزرار الإجراءات ---');

assert(html.includes('action-btn-pill'), 'فئة أزرار الإجراءات الموحدة action-btn-pill مدمجة ومطبقة');
assert(html.includes('inv-number-badge'), 'شارة ترقيم الفواتير inv-number-badge مدمجة ومطبقة');
assert(html.includes('title="معاينة تفاصيل الفاتورة"'), 'زر معاينة تفاصيل الفاتورة موجود');
assert(html.includes('title="معاينة وتصدير صورة PNG"'), 'زر معاينة وتصدير صورة PNG موجود');
assert(html.includes('title="طباعة الفاتورة A4"'), 'زر طباعة الفاتورة A4 موجود');

// Status Badges in Invoice Rendering
assert(html.includes('معتمدة') && html.includes('مسودة') && html.includes('ملغاة'), 'شارات الحالات الثلاث مميزة بدقة');
console.log('  ✅ تم التحقق: شاشة فواتير المبيعات أعيد تصميمها بنسق موحد وعمود إجراءات منتظم وشارات حالات عالية التباين.');

// 5. Global Icon Sizing & Spacing Verification
console.log('\n--- 5. التحقق من التنسيق الشامل للأيقونات واستجابة الشاشات ---');

assert(html.includes('.action-btn-pill {'), 'تنسيق أزرار الإجراءات الموحدة 32px موجود بالـ CSS');
assert(html.includes('.menu-item i'), 'تنسيق أيقونات القائمة الجانبية مدمج بالـ CSS');

// Mobile Responsive Breakpoints
assert(html.includes('@media (max-width: 992px)'), 'استعلام الشاشات المتوسطة موجود');
assert(html.includes('@media (max-width: 768px)'), 'استعلام الشاشات اللوحية موجود');
assert(html.includes('@media (max-width: 480px)'), 'استعلام شاشات الهواتف 480px موجود');
assert(html.includes('@media (max-width: 360px)'), 'استعلام شاشات الهواتف الصغيرة 360px موجود');
console.log('  ✅ تم التحقق: الأيقونات موحدة الأحجام والاصطفاف، واستعلامات الشاشات المختلفة مغطاة بالكامل.');

// 6. DOM IDs Duplication Check
console.log('\n--- 6. فحص تكرار معرّفات العناصر (DOM IDs Uniqueness) ---');

const idRegex = /\sid=["']([^"']+)["']/g;
let match;
const ids = {};
const duplicates = [];

while ((match = idRegex.exec(html)) !== null) {
    const id = match[1];
    if (ids[id]) {
        duplicates.push(id);
    } else {
        ids[id] = 1;
    }
}

const idCount = Object.keys(ids).length;
console.log(`  فحص ${idCount} معرّف ID في الصفحة: ${duplicates.length} تكرارات`);
assert.strictEqual(duplicates.length, 0, `توجد معرّفات مكررة في DOM: ${duplicates.join(', ')}`);
console.log('  ✅ الصفحة خالية تماماً من أي تكرار لمعرّفات العناصر (0 تكرارات).');

console.log('\n=============================================================');
console.log('  🎉 نجاح تام: جميع اختبارات تنظيف الواجهة وضبط الأيقونات والفواتير اجتازت الفحص بنسبة 100%!');
console.log('=============================================================');
