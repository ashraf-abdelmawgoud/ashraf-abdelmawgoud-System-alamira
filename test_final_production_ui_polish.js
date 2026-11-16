const fs = require('fs');

console.log('================================================================');
console.log('🧪 TEST SUITE: AL-AMIRA FINAL PRODUCTION UI/UX POLISH & REFINEMENT');
console.log('================================================================\n');

const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

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

// --- 1. Topbar Decluttering & Header Simplification ---
console.log('--- 1. فحص إزالة التشويش وتبسيط الترويسة العلوية (Topbar Decluttering) ---');

const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart) + '</header>'.length;
const topbarHTML = html.substring(topbarStart, topbarEnd);

// A. Redundant buttons removed from topbar
const hasRedundantNewProduct = topbarHTML.includes('صنف جديد') || topbarHTML.includes('openAddProductModal');
const hasRedundantNewReceipt = topbarHTML.includes('إذن إضافة') || topbarHTML.includes('openNewReceiptModal');
const hasRedundantSlidersBtn = topbarHTML.includes('fa-sliders');

assert(!hasRedundantNewProduct, 'تمت إزالة زر "+ صنف جديد" المكرر من الترويسة العلوية');
assert(!hasRedundantNewReceipt, 'تمت إزالة زر "+ إذن إضافة" المكرر من الترويسة العلوية');
assert(!hasRedundantSlidersBtn, 'تمت إزالة زر إعدادات السلايدر المكرر لتوفير المساحة وتوحيد الوصول عبر الشريط الجانبي');

// B. Single globally important primary action in topbar
assert(topbarHTML.includes('topbar-primary-action') && topbarHTML.includes('فاتورة مبيعات'), 'وجود زر واحد فقط للإجراء الرئيسي العالمي (+ فاتورة مبيعات)');

// C. Compact Backup Freshness Alert
assert(topbarHTML.includes('id="topbar-backup-alert"'), 'شارة التحذير للنسخ الاحتياطي معرفة بالمعرف id="topbar-backup-alert"');
assert(topbarHTML.includes('نسخة احتياطية مطلوبة'), 'نص التحذير الطويل تم اختصاره إلى شارة مقتضبة "نسخة احتياطية مطلوبة"');
assert(topbarHTML.includes('title=') && topbarHTML.includes('24 ساعة'), 'التفسير التفصيلي لمعيار الـ 24 ساعة متاح كتلميح (Tooltip) دون تشويه الواجهة');

// D. Compact Supabase Connection & Date
assert(topbarHTML.includes('id="connection-pill"'), 'حبة حالة الاتصال السحابي (connection-pill) موجودة ومتاحة للنقر');
assert(topbarHTML.includes('id="connection-status-text"'), 'نص حالة الاتصال (connection-status-text) مدمج للتحكم البرمجي');
assert(topbarHTML.includes('id="current-arabic-date"'), 'عرض التاريخ الهجري/الميلادي (current-arabic-date) مدمج بأناقة');

// --- 2. Sidebar Branding & Official Logo ---
console.log('\n--- 2. فحص هوية الشريط الجانبي والشعار الرسمي (Sidebar Branding) ---');

const sbStart = html.indexOf('<div class="sidebar-brand">');
const sbEnd = html.indexOf('</div>\n\n        <ul class="sidebar-menu">', sbStart);
const brandHTML = html.substring(sbStart, sbEnd !== -1 ? sbEnd : sbStart + 800);

// Crown icon eliminated
assert(!brandHTML.includes('fa-crown'), 'تم التخلص تماماً من أيقونة التاج العامة (fa-crown) المستهلكة');

// Official logo element
assert(brandHTML.includes('id="company-official-logo"') && brandHTML.includes('src="assets/logo.png"'), 'عنصر الشعار الرسمي (company-official-logo) يشير إلى مسار أصول الشركة assets/logo.png');
assert(brandHTML.includes('alt="شعار شركة الأميرة للتوريدات العامة والتجارة"'), 'إدراج نص بديل دلالي (Semantic Alt Text) لوصولية ذوي الهمم ومحركات البحث');
assert(brandHTML.includes('id="brand-fallback-badge"'), 'وجود شارة بديلة راقية (brand-fallback-badge) تظهر فوراً بانسيابية عند تعذر تحميل الصورة');
assert(brandHTML.includes('شركة الأميرة') && brandHTML.includes('للتوريدات العامة والتجارة'), 'ظهور الاسم الرسمي للمنشأة بتنسيق طباعي عربي فاخر');

// --- 3. Dashboard KPI Cards & Dedicated Quick Actions ---
console.log('\n--- 3. فحص لوحة التحكم ومصفوفة الإجراءات السريعة (Dashboard Hierarchy) ---');

const dashStart = html.indexOf('id="view-dashboard"');
const dashEnd = html.indexOf('id="view-inventory"');
const dashHTML = html.substring(dashStart, dashEnd);

// 4 KPI cards preserved
const kpiMatches = dashHTML.match(/class="kpi-card/g) || [];
assert(kpiMatches.length === 4, 'الحفاظ على بطاقات الـ KPI الأربع الأساسية (المبيعات، الفواتير، الأصناف النشطة، تنبيهات المخزون)');

// Dedicated quick actions panel
assert(dashHTML.includes('dashboard-quick-actions-panel'), 'لوحة إجراءات سريعة مستقلة ومحددة بدقة داخل بطاقة مخصصة');
assert(dashHTML.includes('btn-primary') && dashHTML.includes('فاتورة مبيعات جديدة'), 'زر فاتورة المبيعات الجديدة هو الإجراء الرئيسي المهيمن بصرياً (Primary Action)');

// 3 secondary actions
assert(dashHTML.includes('إذن استلام بضاعة'), 'إجراء إذن استلام بضاعة متاح كإجراء ثانوي منظم');
assert(dashHTML.includes('إضافة صنف'), 'إجراء إضافة صنف متاح كإجراء ثانوي منظم');
assert(dashHTML.includes('إذن صرف'), 'إجراء إذن صرف متاح كإجراء ثانوي منظم');

// --- 4. Empty States Refinement ---
console.log('\n--- 4. فحص جودة الحالات الفارغة (Empty States) ---');

assert(html.includes('المخزون في حالة آمنة وممتازة') && html.includes('fa-circle-check'), 'حالة فارغة غنية وتطمين بصري إيجابي لجدول تنبيهات المخزون');
assert(html.includes('لا توجد حركات مخزنية مسجلة') && html.includes('fa-clock-rotate-left'), 'حالة فارغة تفسيرية واضحة لجدول الحركات المخزنية الأخيرة');

// --- 5. DOM Duplicate IDs Audit ---
console.log('\n--- 5. فحص عدم تكرار المعرّفات (DOM IDs Uniqueness) ---');

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

assert(duplicateCount === 0, 'لا توجد أي معرّفات مكررة في كامل صفحة index.html (إجمالي المعرفات: ' + Object.keys(ids).length + ')');

// --- 6. JS Syntax Audit ---
console.log('\n--- 6. فحص صحة بناء جافاسكريبت (JavaScript Syntax Check) ---');

const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
let syntaxValid = true;
scripts.forEach((s) => {
    try {
        new Function(s[1]);
    } catch (e) {
        syntaxValid = false;
        console.error('  ❌ خطأ بناء برمجي: ' + e.message);
    }
});
assert(syntaxValid, 'كود جافاسكريبت المضمن سليم وخالٍ تماماً من أي أخطاء صياغة');

console.log('\n================================================================');
if (failCount === 0) {
    console.log('🎉 نجاح تام: كافة اختبارات الفحص النهائي لواجهة المستخدم نجحت بنسبة 100% (' + passCount + '/' + (passCount + failCount) + ')');
} else {
    console.error('❌ توجد إخفاقات: ' + failCount + ' فشل من أصل ' + (passCount + failCount));
}
console.log('================================================================');
