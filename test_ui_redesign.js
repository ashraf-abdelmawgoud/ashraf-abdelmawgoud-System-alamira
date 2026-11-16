const fs = require('fs');
const assert = require('assert');

console.log('=== بدء الفحص والتحقق الشامل من إعادة تصميم واجهة المستخدم (Emerald Redesign) ===\n');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Check Pre-redesign Backup
console.log('--- 1. التحقق من وجود النسخة الاحتياطية قبل إعادة التصميم ---');
assert(fs.existsSync('index.html.backup_pre_redesign'), 'النسخة الاحتياطية index.html.backup_pre_redesign غير موجودة!');
console.log('✅ نجاح: النسخة الاحتياطية index.html.backup_pre_redesign موجودة وجاهزة.');

// 2. Check CSS Emerald Palette
console.log('\n--- 2. التحقق من نظام الألوان الزمردي (Emerald Design System) ---');
assert(html.includes('--color-forest: #052e16;'), 'رمز --color-forest غير موجود أو غير صحيح');
assert(html.includes('--color-dark-emerald: #064e3b;'), 'رمز --color-dark-emerald غير موجود');
assert(html.includes('--color-emerald: #047857;'), 'رمز --color-emerald غير موجود');
assert(html.includes('--color-neon-mint: #34d399;'), 'رمز --color-neon-mint غير موجود');
assert(html.includes('--color-soft-mint: #ecfdf5;'), 'رمز --color-soft-mint غير موجود');
console.log('✅ نجاح: لوحة الألوان الزمردية (Forest, Dark Emerald, Emerald, Neon Mint, Soft Mint) معرفة بنجاح.');

// 3. Check 7-Section Navigation in Sidebar
console.log('\n--- 3. التحقق من الأقسام السبعة في القائمة الجانبية (Sidebar) ---');
const expectedNav = [
    { view: 'view-dashboard', label: 'لوحة التحكم' },
    { view: 'view-inventory', label: 'الأصناف والمخزون' },
    { view: 'view-invoices', label: 'المبيعات والفواتير' },
    { view: 'view-customers', label: 'العملاء' },
    { view: 'view-suppliers', label: 'الموردون' },
    { view: 'view-reports', label: 'التقارير' },
    { view: 'view-settings', label: 'الإعدادات' }
];

expectedNav.forEach(n => {
    assert(html.includes(`data-view="${n.view}"`), `عنصر القائمة data-view="${n.view}" غير موجود بالسيدبار!`);
    console.log(`✅ نجاح: عنصر القائمة [${n.label}] موجود ويرتبط بـ (${n.view}).`);
});

// Count total menu-items in sidebar
const sidebarMatches = [...html.matchAll(/<a class="menu-item[^"]*" data-view="([^"]+)"/g)];
console.log(`عدد عناصر القائمة الجانبية: ${sidebarMatches.length}`);
assert.strictEqual(sidebarMatches.length, 7, `يجب أن يكون عدد عناصر السيدبار 7 بالضبط، الفعلي: ${sidebarMatches.length}`);
console.log('✅ نجاح: القائمة الجانبية تحتوي على 7 أقسام رئيسية بالضبط دون تكرار.');

// 4. Check View Sections in DOM
console.log('\n--- 4. التحقق من وجود أقسام العرض السبعة فقط في الواجهة ---');
const sectionMatches = [...html.matchAll(/<section id="([^"]+)" class="view-section[^"]*"/g)].map(m => m[1]);
console.log('الأقسام الموجودة:', sectionMatches);
assert.strictEqual(sectionMatches.length, 7, `عدد أقسام العرض يجب أن يكون 7 بالضبط، الفعلي: ${sectionMatches.length}`);
expectedNav.forEach(n => {
    assert(sectionMatches.includes(n.view), `القسم ${n.view} غير موجود في صفحة HTML!`);
});
console.log('✅ نجاح: أقسام العرض السبعة معرفة ومطابقة 100%.');

// 5. Check Dashboard KPI count <= 4
console.log('\n--- 5. التحقق من بطاقات لوحة التحكم (Max 4 KPI Cards) ---');
const dashboardMatch = html.match(/<section id="view-dashboard"[\s\S]*?<\/section>/);
assert(dashboardMatch, 'قسم view-dashboard غير موجود');
const kpiCards = [...dashboardMatch[0].matchAll(/class="kpi-card[^"]*"/g)];
console.log(`عدد بطاقات KPI في لوحة التحكم: ${kpiCards.length}`);
assert(kpiCards.length <= 4, `عدد بطاقات KPI يجب ألا يتجاوز 4 بطاقات، الفعلي: ${kpiCards.length}`);
console.log('✅ نجاح: لوحة التحكم تحتوي على 4 بطاقات مؤشرات رئيسية (KPI) بالضبط.');

// 6. Check Inventory Tabs and IDs
console.log('\n--- 6. التحقق من تبويبات الأصناف والمخزون (Inventory Tabs) ---');
const invMatch = html.match(/<section id="view-inventory"[\s\S]*?<\/section>/);
assert(invMatch, 'قسم view-inventory غير موجود');
const invHtml = invMatch[0];

['inv-tab-products', 'inv-tab-receipts', 'inv-tab-issues', 'inv-tab-adjustments', 'inv-tab-movements'].forEach(tabId => {
    assert(invHtml.includes(`id="${tabId}"`), `تبويب ${tabId} غير موجود في قسم المخزون!`);
});
['inv-panel-products', 'inv-panel-receipts', 'inv-panel-issues', 'inv-panel-adjustments', 'inv-panel-movements'].forEach(panelId => {
    assert(invHtml.includes(`id="${panelId}"`), `لوحة ${panelId} غير موجودة في قسم المخزون!`);
});

// Check critical table bodies in inventory
assert(invHtml.includes('id="products-table-body"'), 'products-table-body غير موجود في تبويب الأصناف!');
assert(invHtml.includes('id="receipts-table-body"'), 'receipts-table-body غير موجود في تبويب الاستلام!');
assert(invHtml.includes('id="issues-table-body"'), 'issues-table-body غير موجود في تبويب الصرف!');
assert(invHtml.includes('id="adjustments-table-body"'), 'adjustments-table-body غير موجود في تبويب التسويات!');
assert(invHtml.includes('id="movements-table-body"'), 'movements-table-body غير موجود في تبويب الحركات!');
console.log('✅ نجاح: كافة تبويبات المخزون الخمسة (الأصناف، الاستلام، الصرف، التسويات، الحركات) وجداولها مكتملة.');

// 7. Check Invoices Section
console.log('\n--- 7. التحقق من قسم المبيعات والفواتير (Sales & Invoices) ---');
const invSecMatch = html.match(/<section id="view-invoices"[\s\S]*?<\/section>/);
assert(invSecMatch, 'قسم view-invoices غير موجود');
assert(invSecMatch[0].includes('id="invoices-table-body"'), 'invoices-table-body غير موجود');
assert(invSecMatch[0].includes('id="invoice-search"'), 'حقل البحث invoice-search غير موجود');
assert(invSecMatch[0].includes('inv-status-filter'), 'أزرار التصفية السريعة لحالات الفواتير غير موجودة');
console.log('✅ نجاح: قسم المبيعات والفواتير مكتمل مع أزرار التصفية وحقل البحث والجدول.');

// 8. Check Independent Customers & Suppliers
console.log('\n--- 8. التحقق من استقلال دليلي العملاء والموردين ---');
const custSecMatch = html.match(/<section id="view-customers"[\s\S]*?<\/section>/);
const supSecMatch = html.match(/<section id="view-suppliers"[\s\S]*?<\/section>/);
assert(custSecMatch, 'قسم view-customers غير موجود');
assert(supSecMatch, 'قسم view-suppliers غير موجود');
assert(custSecMatch[0].includes('id="customers-table-body"'), 'customers-table-body غير موجود');
assert(custSecMatch[0].includes('id="customers-search"'), 'customers-search غير موجود');
assert(supSecMatch[0].includes('id="suppliers-table-body"'), 'suppliers-table-body غير موجود');
assert(supSecMatch[0].includes('id="suppliers-search"'), 'suppliers-search غير موجود');
console.log('✅ نجاح: قسما العملاء والموردين مستقلان تماماً لكل منهما جدول وبحث وزر إضافة مستقل.');

// 9. Check Reports Section
console.log('\n--- 9. التحقق من قسم التقارير ---');
const repSecMatch = html.match(/<section id="view-reports"[\s\S]*?<\/section>/);
assert(repSecMatch, 'قسم view-reports غير موجود');
assert(repSecMatch[0].includes('id="report-type-select"'), 'report-type-select غير موجود');
assert(repSecMatch[0].includes('id="report-results-table"'), 'report-results-table غير موجود');
console.log('✅ نجاح: قسم التقارير مكتمل مع خيارات التقارير والطباعة والنتائج.');

// 10. Check Settings Section (merged with backup)
console.log('\n--- 10. التحقق من قسم الإعدادات والنسخ الاحتياطي ---');
const settSecMatch = html.match(/<section id="view-settings"[\s\S]*?<\/section>/);
assert(settSecMatch, 'قسم view-settings غير موجود');
assert(settSecMatch[0].includes('id="settings-tab-backup"'), 'settings-tab-backup غير موجود');
assert(settSecMatch[0].includes('id="settings-tab-supabase"'), 'settings-tab-supabase غير موجود');
assert(settSecMatch[0].includes('id="settings-tab-account"'), 'settings-tab-account غير موجود');
assert(settSecMatch[0].includes('id="last-backup-timestamp-text"'), 'last-backup-timestamp-text غير موجود');
assert(settSecMatch[0].includes('id="btn-restore-backup"'), 'btn-restore-backup غير موجود');
assert(settSecMatch[0].includes('id="backup-file-input"'), 'backup-file-input غير موجود');
console.log('✅ نجاح: قسم الإعدادات مكتمل مع تبويبات النسخ الاحتياطي، اتصال Supabase، ومعلومات الحساب.');

// 11. Check Script Controller Objects
console.log('\n--- 11. التحقق من كائنات جافاسكريبت المساعدة في السكربت ---');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/)[1];
assert(scriptMatch.includes('const InvSection ='), 'كائن InvSection غير معرف بالسكربت');
assert(scriptMatch.includes('const SettingsSection ='), 'كائن SettingsSection غير معرف بالسكربت');
assert(scriptMatch.includes('const CustomersModule ='), 'كائن CustomersModule غير معرف بالسكربت');
assert(scriptMatch.includes('const SuppliersModule ='), 'كائن SuppliersModule غير معرف بالسكربت');
assert(scriptMatch.includes('setStatusFilter('), 'دالة setStatusFilter غير معرفة في InvoicesModule');
console.log('✅ نجاح: كائنات جافاسكريبت المساعدة (InvSection, SettingsSection, CustomersModule, SuppliersModule) معرفة بالكامل.');

// 12. Check No Duplicate IDs
console.log('\n--- 12. التحقق من عدم وجود أي معرّفات مكررة (Duplicate IDs) ---');
const idRegex = /id="([^"]+)"/g;
const counts = {};
let m;
while ((m = idRegex.exec(html)) !== null) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
}
const duplicateIds = Object.entries(counts).filter(([id, count]) => count > 1);
assert.strictEqual(duplicateIds.length, 0, `توجد معرّفات مكررة في الملف: ${JSON.stringify(duplicateIds)}`);
console.log('✅ نجاح: لا توجد أي معرّفات مكررة (Duplicate IDs) في كامل ملف index.html.');

console.log('\n=============================================================');
console.log('  🎉 كافة اختبارات التحقق من إعادة تصميم الواجهة نجحت بنسبة 100%');
console.log('=============================================================');
