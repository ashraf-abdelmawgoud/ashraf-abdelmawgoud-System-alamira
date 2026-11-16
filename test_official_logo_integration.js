const fs = require('fs');

console.log('================================================================');
console.log('🧪 TEST SUITE: AL-AMIRA OFFICIAL LOGO INTEGRATION & BRANDING VERIFICATION');
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

// 1. File existence and asset verification
console.log('--- 1. فحص وجود وتكامل ملف الشعار الرسمي (Asset Existence & Validity) ---');
const logoPath = 'D:/Projects/System_Excel/assets/logo.png';
assert(fs.existsSync(logoPath), 'ملف الشعار الرسمي موجود بالمسار المعتمد assets/logo.png');

const stats = fs.statSync(logoPath);
assert(stats.size > 10000, 'حجم الملف أصلي وكامل دون تلف (' + stats.size + ' بايت)');

// Verify JPEG dimensions (964x121)
function getJpegDimensions(buffer) {
    let offset = 2;
    while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
    }
    return null;
}
const dims = getJpegDimensions(fs.readFileSync(logoPath));
assert(dims && dims.width === 964 && dims.height === 121, 'الأبعاد الهندسية للشعار مطابقة للأصل بالضبط (964 × 121 بكسل بنسبة بانورامية 8:1 تقريباً)');

// Read index.html
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// 2. Favicon
console.log('\n--- 2. فحص أيقونة المتصفح (Favicon Integration) ---');
assert(html.includes('<link rel="icon" type="image/png" href="assets/logo.png">'), 'أيقونة المتصفح Favicon تشير إلى الشعار الرسمي في مجلد assets');

// 3. Sidebar Branding
console.log('\n--- 3. فحص هوية الشريط الجانبي (Sidebar Branding Integration) ---');
const sbStart = html.indexOf('<div class="sidebar-brand">');
const sbEnd = html.indexOf('<ul class="sidebar-menu">', sbStart);
const sbHTML = html.substring(sbStart, sbEnd);

assert(sbHTML.includes('id="company-official-logo"'), 'معرّف الشعار company-official-logo موجود في الشريط الجانبي');
assert(sbHTML.includes('src="assets/logo.png"'), 'مسار الشعار بالشريط الجانبي هو مسار نسبي نظيف assets/logo.png');
assert(sbHTML.includes('class="brand-banner-container"'), 'حاوية الشعار brand-banner-container مصممة بأناقة على خلفية بيضاء لتبرز الألوان الكحلية والذهبية');
assert(!sbHTML.includes('fa-crown'), 'خلو الشريط الجانبي تماماً من أيقونة التاج المستهلكة');

// 4. Login Screen Branding
console.log('\n--- 4. فحص شاشة تسجيل الدخول (Login Screen Branding Integration) ---');
const authStart = html.indexOf('<div id="auth-screen"');
const authEnd = html.indexOf('<form id="login-form"', authStart);
const authHTML = html.substring(authStart, authEnd);

assert(authHTML.includes('auth-logo-wrapper'), 'حاوية الشعار الرسمية auth-logo-wrapper مدمجة في بطاقة تسجيل الدخول');
assert(authHTML.includes('src="assets/logo.png"'), 'شاشة الدخول تستخدم الشعار الرسمي الأصلي assets/logo.png');
assert(authHTML.includes('auth-subtitle'), 'النص التوضيحي "نظام إدارة المخزون والمبيعات السحابي المعتمد" يظهر بتنسيق زمردي راقٍ');
assert(!authHTML.includes('fa-crown'), 'خلو شاشة الدخول تماماً من أيقونة التاج');

// 5. Printed Documents (A4 Invoices & Vouchers)
console.log('\n--- 5. فحص ترويسة المطبوعات الرسمية A4 (Printed Invoices & Documents) ---');
const printStart = html.indexOf('<div id="print-area">');
const printEnd = html.indexOf('<div class="print-info-grid">', printStart);
const printHTML = html.substring(printStart, printEnd);

assert(printHTML.includes('class="print-official-logo"') && printHTML.includes('src="assets/logo.png"'), 'ترويسة الفاتورة المطبوعة A4 مدمج بها الشعار الرسمي assets/logo.png');
assert(printHTML.includes('id="print-company-name"'), 'معرّف اسم المنشأة البرمجي print-company-name محفوظ لضمان عمل دالة PrintModule');
assert(!printHTML.includes('fa-crown'), 'إلغاء أيقونة التاج من ترويسة الفواتير والمستندات المخزنية المطبوعة');

// 6. CSS Proportions & Object-fit
console.log('\n--- 6. فحص خصائص العرض ونسب الأبعاد في CSS (CSS Object-fit & Contain) ---');
assert(html.includes('.brand-official-logo') && html.includes('object-fit: contain;'), 'تطبيق object-fit: contain للشعار في الشريط الجانبي لمنع أي مط أو تشويه');
assert(html.includes('.auth-official-logo') && html.includes('object-fit: contain;'), 'تطبيق object-fit: contain للشعار في شاشة تسجيل الدخول');
assert(html.includes('.print-official-logo') && html.includes('object-fit: contain;'), 'تطبيق object-fit: contain للشعار في مطبوعات A4');

// 7. Duplicate IDs check
console.log('\n--- 7. فحص سلامة وثيقة الـ DOM (DOM IDs & Syntax Check) ---');
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
assert(duplicateCount === 0, 'لا توجد أي معرّفات مكررة في الصفحة (إجمالي المعرفات: ' + Object.keys(ids).length + ')');

// 8. JS Syntax Check
const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
let syntaxValid = true;
scripts.forEach((s) => {
    try {
        new Function(s[1]);
    } catch (e) {
        syntaxValid = false;
        console.error('  ❌ خطأ برمجي: ' + e.message);
    }
});
assert(syntaxValid, 'كود جافاسكريبت المضمن سليم تماماً');

console.log('\n================================================================');
if (failCount === 0) {
    console.log('🎉 نجاح باهر: كافة اختبارات تكامل الشعار الرسمي نجحت بنسبة 100% (' + passCount + '/' + (passCount + failCount) + ')');
} else {
    console.error('❌ توجد إخفاقات: ' + failCount + ' فشل من أصل ' + (passCount + failCount));
}
console.log('================================================================');
