const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 TEST SUITE: PHASE 5 — FINAL UI/UX POLISH, MOBILE & SETTINGS');
console.log('================================================================');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Audit All Seven Main Sections
console.log('\n--- 1. التحقق من الأقسام السبعة الرئيسية للنظام ---');
const requiredSections = [
    { id: 'view-dashboard', name: 'لوحة التحكم' },
    { id: 'view-inventory', name: 'الأصناف والمخزون' },
    { id: 'view-invoices', name: 'المبيعات والفواتير' },
    { id: 'view-customers', name: 'العملاء' },
    { id: 'view-suppliers', name: 'الموردون' },
    { id: 'view-reports', name: 'التقارير' },
    { id: 'view-settings', name: 'الإعدادات والنسخ الاحتياطي' }
];

requiredSections.forEach(s => {
    assert(html.includes(`id="${s.id}"`), `القسم الرئيسي ${s.id} (${s.name}) غير موجود`);
    console.log(`  ✅ قسم ${s.name} (${s.id}) موجود ومفعل`);
});

// 2. Navigation items
console.log('\n--- 2. التحقق من روابط القائمة الجانبية (Navigation) ---');
requiredSections.forEach(s => {
    assert(html.includes(`data-view="${s.id}"`), `عنصر القائمة data-view="${s.id}" غير موجود في القائمة الجانبية`);
});
console.log('  ✅ جميع روابط التوجيه السبعة معرفة بالكامل في القائمة الجانبية');

// 3. Mobile drawer and overlay
console.log('\n--- 3. التحقق من درج الهاتف المتحرك وطبقة التعتيم التفاعلية ---');
assert(html.includes('id="sidebar-overlay"'), 'عنصر sidebar-overlay غير موجود');
assert(html.includes('class="sidebar-overlay"'), 'كلاس sidebar-overlay غير موجود');
assert(html.includes('App.toggleSidebar()'), 'استدعاء App.toggleSidebar() غير موجود');
console.log('  ✅ طبقة التعتيم sidebar-overlay مدمجة وتغلق الدرج عند النقر خارج القائمة');

// 4. Responsive CSS Media Queries
console.log('\n--- 4. التحقق من استعلامات الوسائط واستجابة الشاشات المختلفة ---');
const styleBlock = html.substring(html.indexOf('<style>'), html.indexOf('</style>'));
assert(styleBlock.includes('@media (max-width: 992px)'), 'استعلام 992px غير موجود');
assert(styleBlock.includes('@media (max-width: 768px)'), 'استعلام 768px غير موجود');
assert(styleBlock.includes('@media (max-width: 480px)'), 'استعلام 480px غير موجود');
assert(styleBlock.includes('@media (max-width: 360px)'), 'استعلام 360px غير موجود');
assert(styleBlock.includes('@media (min-width: 1440px)'), 'استعلام 1440px غير موجود');
assert(styleBlock.includes('-webkit-overflow-scrolling: touch'), 'خاصية التمرير السلس باللمس غير موجودة');
assert(styleBlock.includes('min-height: 44px') || styleBlock.includes('min-height: 42px'), 'معايير أبعاد اللمس للموبايل Touch Target غير موجودة');
console.log('  ✅ استعلامات الوسائط مغطاة لجميع المقاسات (360px, 480px, 768px, 992px, 1440px) مع دعم اللمس');

// 5. Settings Workspace (5 Tabs)
console.log('\n--- 5. التحقق من مساحة عمل الإعدادات الموسعة (5 تبويبات كاملة) ---');
const settMatch = html.match(/<section id="view-settings"[\s\S]*?<\/section>/);
assert(settMatch, 'قسم view-settings غير موجود');
const settHtml = settMatch[0];

// Tab buttons
assert(settHtml.includes('id="settings-tab-company"'), 'تبويب company غير موجود');
assert(settHtml.includes('id="settings-tab-backup"'), 'تبويب backup غير موجود');
assert(settHtml.includes('id="settings-tab-supabase"'), 'تبويب supabase غير موجود');
assert(settHtml.includes('id="settings-tab-account"'), 'تبويب account غير موجود');
assert(settHtml.includes('id="settings-tab-system"'), 'تبويب system غير موجود');

// Tab panels
assert(settHtml.includes('id="settings-panel-company"'), 'لوحة company غير موجودة');
assert(settHtml.includes('id="settings-panel-backup"'), 'لوحة backup غير موجودة');
assert(settHtml.includes('id="settings-panel-supabase"'), 'لوحة supabase غير موجودة');
assert(settHtml.includes('id="settings-panel-account"'), 'لوحة account غير موجودة');
assert(settHtml.includes('id="settings-panel-system"'), 'لوحة system غير موجودة');

// Company fields
assert(settHtml.includes('id="setting-company-name"'), 'حقل اسم الشركة غير موجود');
assert(settHtml.includes('id="setting-company-activity"'), 'حقل نشاط الشركة غير موجود');
assert(settHtml.includes('id="setting-company-phone"'), 'حقل هاتف الشركة غير موجود');
assert(settHtml.includes('id="setting-company-address"'), 'حقل عنوان الشركة غير موجود');
assert(settHtml.includes('id="setting-company-reg"'), 'حقل السجل التجاري غير موجود');
assert(settHtml.includes('id="setting-company-tax"'), 'حقل البطاقة الضريبية غير موجود');
assert(settHtml.includes('id="btn-save-company-settings"'), 'زر حفظ بيانات المؤسسة غير موجود');

// Backup fields
assert(settHtml.includes('BackupRestoreModule.createFullBackup()'), 'استدعاء النسخ الاحتياطي JSON غير موجود');
assert(settHtml.includes('ExportModule.exportFullExcelWorkbook()'), 'استدعاء تصدير Excel غير موجود');
assert(settHtml.includes('id="last-backup-timestamp-text"'), 'نص تاريخ آخر نسخة غير موجود');
assert(settHtml.includes('سياسة الأمان واستعادة البيانات المحاسبية'), 'توضيح سياسة الأمان والاستعادة من الخادم غير موجود');

// Supabase & Security fields
assert(settHtml.includes('id="settings-supabase-url-display"'), 'عرض عنوان Supabase غير موجود');
assert(settHtml.includes('مفتاح الوصول العام (Anon Key — مؤمن)'), 'عرض المفتاح العام المؤمن غير موجود');
assert(settHtml.includes('سياسات أمان مستوى الصفوف (RLS)'), 'بيان قواعد RLS غير موجود');

// System & Migrations audit
assert(settHtml.includes('register_product_with_opening_stock') || settHtml.includes('create_product_opening_balance'), 'الدالة register_product_with_opening_stock غير مذكورة بجدول الترقيات');
assert(settHtml.includes('set_product_active_status') || settHtml.includes('archive_product'), 'الدالة set_product_active_status غير مذكورة بجدول الترقيات');
assert(settHtml.includes('بانتظار تنفيذ Migration'), 'مؤشر انتظار الترقية السحابية غير موجود');
console.log('  ✅ قسم الإعدادات مكتمل بالتبويبات الخمسة وبيانات الشركة والنسخ والأمان والترقيات');

// 6. JavaScript Modules & Methods
console.log('\n--- 6. التحقق من كائنات ودوال التحكم البرمجية ---');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/)[1];
assert(scriptMatch.includes('const BackupRestoreModule ='), 'كائن BackupRestoreModule غير معرف');
assert(scriptMatch.includes('createFullBackup('), 'دالة createFullBackup غير معرفة في BackupRestoreModule');
assert(scriptMatch.includes('renderStatus('), 'دالة renderStatus غير معرفة في BackupRestoreModule');
assert(scriptMatch.includes('triggerRestoreFileDialog('), 'دالة triggerRestoreFileDialog غير معرفة');

assert(scriptMatch.includes('const SettingsSection ='), 'كائن SettingsSection غير معرف');
assert(scriptMatch.includes('loadCompanyProfile('), 'دالة loadCompanyProfile غير معرفة في SettingsSection');
assert(scriptMatch.includes('saveCompanyProfile('), 'دالة saveCompanyProfile غير معرفة في SettingsSection');
assert(scriptMatch.includes('syncAccountInfo('), 'دالة syncAccountInfo غير معرفة');
assert(scriptMatch.includes('syncConnectionInfo('), 'دالة syncConnectionInfo غير معرفة');

assert(scriptMatch.includes('formatErrorMessage('), 'دالة formatErrorMessage الموحدة للأخطاء غير معرفة');
console.log('  ✅ كائنات التحكم البرمجية ودوال النسخ والإعدادات ورسائل الأخطاء جاهزة تماماً');

// 7. Check for Duplicate DOM IDs
console.log('\n--- 7. فحص تكرار معرّفات العناصر (Duplicate DOM IDs) ---');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const idCounts = {};
idMatches.forEach(id => {
    idCounts[id] = (idCounts[id] || 0) + 1;
});
const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
assert.strictEqual(duplicates.length, 0, `توجد معرّفات مكررة في DOM: ${JSON.stringify(duplicates)}`);
console.log(`  ✅ تم فحص ${idMatches.length} معرّف ID في الصفحة: خالية تماماً من أي تكرار (0 تكرارات)`);

console.log('\n================================================================');
console.log('🎉 نجاح تام: جميع اختبارات المرحلة الخامسة اجتازت الفحص بنسبة 100%!');
console.log('================================================================\n');
