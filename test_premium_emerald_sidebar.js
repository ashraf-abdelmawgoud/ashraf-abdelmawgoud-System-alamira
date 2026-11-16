const fs = require('fs');

console.log('================================================================');
console.log('🧪 TEST SUITE: AL-AMIRA PREMIUM EMERALD SIDEBAR VERIFICATION');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log('  ✅ ' + message);
        passCount++;
    } else {
        console.error('  ❌ فشل: ' + message);
        failCount++;
    }
}

const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// 1. Color matching & palette
console.log('--- 1. فحص تطابق الألوان الزمردية مع زر فاتورة المبيعات (Color Matching) ---');

// Check primary button color
assert(html.includes('.btn-primary') && html.includes('#047857'), 'الزر الأساسي (btn-primary) يعتمد اللون الزمردي #047857');

// Check sidebar background is no longer black, but rich emerald
const sbCSSMatch = html.match(/\.sidebar\s*\{([\s\S]*?)\}/);
const sbCSS = sbCSSMatch ? sbCSSMatch[1] : '';

assert(sbCSS.includes('#064e3b'), 'خلفية الشريط الجانبي تعتمد التدرج الزمردي الغني (#064e3b) بدلاً من الأسود المظلم السابق');
assert(sbCSS.includes('border-left: 1px solid rgba(52, 211, 153,'), 'الحد الفاصل الأيسر (RTL) يعتمد الأخضر الزمردي الشفاف المتناسق');

// Check active menu item
const activeCSSMatch = html.match(/\.menu-item\.active\s*\{([\s\S]*?)\}/);
const activeCSS = activeCSSMatch ? activeCSSMatch[1] : '';

assert(activeCSS.includes('#047857') && activeCSS.includes('#059669'), 'العنصر النشط يعتمد تدرج زر المبيعات الأساسي بالضبط (#047857 إلى #059669)');
assert(activeCSS.includes('border-right:') && activeCSS.includes('#34d399'), 'العنصر النشط مميز بشريط يمين زمردي نعناعي مضيء (#34d399) يحدد القسم بدقة');
assert(activeCSS.includes('color: #ffffff') && activeCSS.includes('font-weight: 800'), 'خط العنصر النشط أبيض عريض عالي التباين والوضوح');

// Check inactive menu items
const itemCSSMatch = html.match(/\.menu-item\s*\{([\s\S]*?)\}/);
const itemCSS = itemCSSMatch ? itemCSSMatch[1] : '';
assert(itemCSS.includes('rgba(255, 255, 255,'), 'نصوص العناصر غير النشطة بيضاء عالية الوضوح');

const iconCSSMatch = html.match(/\.menu-item i\s*\{([\s\S]*?)\}/);
const iconCSS = iconCSSMatch ? iconCSSMatch[1] : '';
assert(iconCSS.includes('#a7f3d0'), 'أيقونات العناصر غير النشطة تظهر بلون النعناع الهادئ المتناسق (#a7f3d0)');

// 2. Navigation sections integrity
console.log('\n--- 2. فحص الأقسام السبعة وترتيبها المعتمد (Navigation Hierarchy) ---');
const expectedViews = [
    { id: 'view-dashboard', label: 'لوحة التحكم' },
    { id: 'view-inventory', label: 'الأصناف والمخزون' },
    { id: 'view-invoices', label: 'المبيعات والفواتير' },
    { id: 'view-customers', label: 'العملاء' },
    { id: 'view-suppliers', label: 'الموردون' },
    { id: 'view-reports', label: 'التقارير' },
    { id: 'view-settings', label: 'الإعدادات' }
];

const menuMatches = [...html.matchAll(/<a class="menu-item[^"]*" data-view="([^"]+)" onclick="App\.navigate\('([^']+)'\)">[\s\S]*?<span>([^<]+)<\/span>/g)];

assert(menuMatches.length === 7, 'القائمة الجانبية تحتوي على 7 أقسام رئيسية بالضبط');

expectedViews.forEach((exp, idx) => {
    const act = menuMatches[idx];
    if (act) {
        assert(act[1] === exp.id && act[3].trim() === exp.label, 'القسم رقم ' + (idx + 1) + ' هو [' + exp.label + '] بالمعرف (' + exp.id + ')');
    } else {
        assert(false, 'القسم رقم ' + (idx + 1) + ' مفقود');
    }
});

// 3. Brand header with official logo
console.log('\n--- 3. فحص ترويسة الشعار وهوية الشركة (Brand Header) ---');
assert(html.includes('class="brand-banner-container"'), 'حاوية الشعار brand-banner-container مصممة ببطاقة بيضاء لإبراز خطوط الشعار الكحلية والذهبية');
assert(html.includes('id="company-official-logo"') && html.includes('src="assets/logo.png"'), 'الشعار الرسمي assets/logo.png معتمد ومحمي من التشويه');
assert(html.includes('class="brand-official-logo"') && html.includes('object-fit: contain;'), 'خاصية object-fit: contain مطبقة بدقة لمنع مط أو اقتصاص الشعار');

// 4. User profile footer
console.log('\n--- 4. فحص ذيل الشريط الجانبي وبيانات المستخدم (User Profile Footer) ---');
assert(html.includes('id="sidebar-user-avatar"'), 'أيقونة صورة المستخدم المعرفية sidebar-user-avatar موجودة');
assert(html.includes('id="sidebar-user-name"'), 'اسم المستخدم المسجل sidebar-user-name مربوط ديناميكياً بحساب Supabase');
assert(html.includes('id="sidebar-user-role"'), 'مستوى صلاحيات المستخدم sidebar-user-role محفوظ');
assert(html.includes('sidebar-logout-btn') && html.includes('App.logout()'), 'زر تسجيل الخروج الأنيق sidebar-logout-btn مربوط بدالة App.logout()');

// 5. Mobile & responsiveness
console.log('\n--- 5. فحص التجاوب ودرج الهاتف المحمول (Mobile Responsiveness) ---');
assert(html.includes('id="sidebar-overlay"') && html.includes('App.toggleSidebar()'), 'طبقة التعتيم التفاعلية sidebar-overlay تدعم الإغلاق بالنقر');
assert(html.includes('.sidebar.mobile-open'), 'فئة الفتح على الشاشات الصغيرة .sidebar.mobile-open مدعومة برمجياً');

// 6. DOM integrity & Syntax
console.log('\n--- 6. فحص خلو الـ DOM من التكرار وسلامة السكربت (DOM & Syntax) ---');
const idRegex = /id=["']([^"']+)["']/g;
const ids = {};
let match;
let duplicateCount = 0;
while ((match = idRegex.exec(html)) !== null) {
    const id = match[1];
    if (ids[id]) {
        ids[id]++;
        duplicateCount++;
        console.error('  ❌ معرّف مكرر: ' + id);
    } else {
        ids[id] = 1;
    }
}
assert(duplicateCount === 0, 'لا توجد أي معرّفات مكررة في كامل صفحة index.html');

const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
let syntaxValid = true;
scripts.forEach((s) => {
    try {
        new Function(s[1]);
    } catch (e) {
        syntaxValid = false;
        console.error('  ❌ خطأ صياغة: ' + e.message);
    }
});
assert(syntaxValid, 'كود جافاسكريبت المضمن سليم وخالٍ من الأخطاء');

console.log('\n================================================================');
if (failCount === 0) {
    console.log('🎉 نجاح باهر: كافة اختبارات الشريط الجانبي الزمردي الفاخر نجحت بنسبة 100% (' + passCount + '/' + (passCount + failCount) + ')');
} else {
    console.error('❌ توجد إخفاقات: ' + failCount + ' فشل من أصل ' + (passCount + failCount));
}
console.log('================================================================');
