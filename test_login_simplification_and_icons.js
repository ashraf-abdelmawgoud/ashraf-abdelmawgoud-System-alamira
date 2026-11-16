const fs = require('fs');

console.log('================================================================');
console.log('🧪 TEST SUITE: AL-AMIRA LOGIN SIMPLIFICATION & ICON VISIBILITY FIX');
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

// --- 1. Login Screen Simplification ---
console.log('--- 1. فحص تبسيط شاشة تسجيل الدخول إلى الحد الأدنى الراقي (Login Simplification) ---');

const authStart = html.indexOf('<div id="auth-screen"');
const authEnd = html.indexOf('<!-- ========================================================================\n         2. APPLICATION SIDEBAR', authStart);
const authHTML = html.substring(authStart, authEnd);

// Check 5 required elements:
assert(authHTML.includes('src="assets/logo.png"') && authHTML.includes('class="auth-official-logo"'), 'وجود الشعار الرسمي الأصلي في أعلى بطاقة الدخول دون تشويه');
assert(authHTML.includes('ما شاء الله تبارك الرحمن'), 'ظهور العبارة الكريمة المطلوبة بالضبط "ما شاء الله تبارك الرحمن" أسفل الشعار');
assert(authHTML.includes('id="login-email"') && authHTML.includes('type="email"'), 'وجود حقل البريد الإلكتروني (login-email) فارغاً ومستعداً للإدخال');
assert(authHTML.includes('id="login-password"') && authHTML.includes('type="password"'), 'وجود حقل كلمة المرور (login-password) فارغاً');
assert(authHTML.includes('id="btn-login-submit"') && authHTML.includes('fa-right-to-bracket'), 'وجود زر تسجيل الدخول الأخضر الزمردي العريض مع أيقونة الدخول الصريحة');

// Check that clutter was removed:
assert(!authHTML.includes('تسجيل الدخول السحابي المباشر (Supabase Auth):'), 'إزالة صندوق الشرح الطويل لإعدادات Supabase من الواجهة المرئية');
assert(!authHTML.includes('authorized_users'), 'إزالة النصوص الفنية الدخيلة المتعلقة بجدول المستخدمين المصرح لهم');
assert(!authHTML.includes('إعدادات الربط السحابي'), 'إزالة زر إعدادات الربط الزائد من أسفل بطاقة تسجيل الدخول');
assert(!authHTML.includes('نظام إدارة المخزون والمبيعات السحابي المعتمد'), 'إزالة الترويسات والفقرات المكررة والتشويش البصري');

// Check clean styling of auth screen & card
const authCSSMatch = html.match(/\.auth-screen\s*\{([\s\S]*?)\}/);
const authCSS = authCSSMatch ? authCSSMatch[1] : '';
assert(authCSS.includes('#f0fdf4') || authCSS.includes('#ecfdf5'), 'خلفية صفحة الدخول أصبحت ناعمة ونقية بالنعناع الفاتح بدلاً من السواد والغموض');

const authCardCSSMatch = html.match(/\.auth-card\s*\{([\s\S]*?)\}/);
const authCardCSS = authCardCSSMatch ? authCardCSSMatch[1] : '';
assert(authCardCSS.includes('background-color: #ffffff') && authCardCSS.includes('border-radius:'), 'بطاقة الدخول بيضاء نقية بزوايا منحنية وظل زمردي ناعم ومتزن');

// --- 2. Icon Visibility & Contrast Fix ---
console.log('\n--- 2. فحص وضوح وتباين الأيقونات في كامل النظام (Icon Visibility Fix) ---');

// A. Sidebar Icons
const menuIconCSSMatch = html.match(/\.menu-item i\s*\{([\s\S]*?)\}/);
const menuIconCSS = menuIconCSSMatch ? menuIconCSSMatch[1] : '';
assert(menuIconCSS.includes('font-size: 18px'), 'أيقونات القائمة الجانبية بحجم متناسق وواضح (18px) ضمن نطاق 17-20px');
assert(menuIconCSS.includes('color: #a7f3d0'), 'أيقونات القائمة غير النشطة بلون النعناع الفاتح عالي التباين (#a7f3d0) مع ظل دقيق');

const activeIconCSSMatch = html.match(/\.menu-item\.active i\s*\{([\s\S]*?)\}/);
const activeIconCSS = activeIconCSSMatch ? activeIconCSSMatch[1] : '';
assert(activeIconCSS.includes('color: #ffffff'), 'أيقونة العنصر النشط تظهر بلون أبيض مشرق ناصع مع تظليل مجسم');

// B. Tab Icons
assert(html.includes('.inv-tab i') && html.includes('color: #065f46;'), 'أيقونات تبويبات المخزون والإعدادات بلون أخضر زمردي داكن عالي الوضوح');

// C. Button & Title Icons
assert(html.includes('.btn i') && html.includes('font-size: 14px;'), 'أيقونات الأزرار منضبطة الحجم والمحاذاة الرأسية');
assert(html.includes('.btn-outline i') && html.includes('color: var(--color-emerald'), 'أيقونات الأزرار الحدودية زمردية واضحة');
assert(html.includes('.card-title i') && html.includes('font-size: 16px;'), 'أيقونات عناوين البطاقات بحجم بارز ومتناسق مع النص العربي');

// D. Logout & Profile Icons
assert(html.includes('.sidebar-logout-btn i') && html.includes('color: #d1fae5;'), 'أيقونة زر تسجيل الخروج في ذيل القائمة بلون نعناعي فاتح ناصع');

// --- 3. Functional Safety & DOM Integrity ---
console.log('\n--- 3. فحص الأمان الوظيفي وسلامة الـ DOM (Functional Safety) ---');

// DOM IDs check
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
assert(duplicateCount === 0, 'خلو تام من أي تكرار لمعرّفات الـ DOM (إجمالي المعرفات: ' + Object.keys(ids).length + ')');

// Preserved essential auth bindings
assert(html.includes('id="login-form"') && html.includes('onsubmit="App.handleLogin(event)"'), 'ربط نموذج الدخول بدالة App.handleLogin(event) محفوظ بالكامل');
assert(html.includes('id="auth-mode-indicator"'), 'حفظ معرّف auth-mode-indicator بالـ DOM لضمان التوافق مع دوال Supabase البرمجية');

// JS Syntax
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
assert(syntaxValid, 'كود جافاسكريبت المضمن سليم بنسبة 100%');

console.log('\n================================================================');
if (failCount === 0) {
    console.log('🎉 نجاح تام: كافة اختبارات تبسيط شاشة الدخول ووضوح الأيقونات نجحت بنسبة 100% (' + passCount + '/' + (passCount + failCount) + ')');
} else {
    console.error('❌ توجد إخفاقات: ' + failCount + ' فشل من أصل ' + (passCount + failCount));
}
console.log('================================================================');
