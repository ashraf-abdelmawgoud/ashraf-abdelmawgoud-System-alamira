/**
 * Test Suite: Professional Invoice Redesign & PNG Export
 * Validates company information, official address, logo, invoice visual components,
 * html2canvas integration, export preview modal, and PNG export methods.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=============================================================');
console.log('  🧪 TEST SUITE: AL-AMIRA INVOICE REDESIGN & PNG EXPORT');
console.log('=============================================================');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Company Information & Official Address Verification
console.log('\n--- 1. التحقق من بيانات وهوية المؤسسة والعنوان الرسمي ---');

assert(html.includes('الأميرة للتوريدات العامة والتجارة'), 'اسم الشركة الرسمي غير موجود');
assert(html.includes('قنا – الوقف – بجوار مركز شباب عزبة علام'), 'العنوان الرسمي الجديد للشركة غير موجود');
assert(html.includes('assets/logo.png'), 'شعار الشركة الأصلي assets/logo.png غير مستخدم');

// Check that Cairo is NOT in the company address anywhere in the document template or default header
const companyContactMatch = html.match(/id="print-company-contact"[^>]*>([^<]+)<\/div>/);
assert(companyContactMatch, 'عنصر عنوان الشركة print-company-contact غير موجود');
assert(
    companyContactMatch[1].includes('قنا – الوقف – بجوار مركز شباب عزبة علام'),
    'عنوان الشركة الافتراضي في قالب المستند لا يحتوي على عنوان قنا الصحيح'
);
assert(!companyContactMatch[1].includes('القاهرة'), 'عنوان الشركة في قالب الطباعة يحتوي خطأً على القاهرة');

// Check updatePrintHeader implementation
assert(
    html.includes("address = 'قنا – الوقف – بجوار مركز شباب عزبة علام'"),
    'دالة updatePrintHeader لا تعين العنوان الرسمي لمحافظة قنا'
);
console.log('  ✅ تم التحقق: اسم الشركة رسمي، والشعار assets/logo.png مستخدم، وعنوان المؤسسة معتمد (قنا – الوقف – بجوار مركز شباب عزبة علام) مع خلوه التام من القاهرة.');

// 2. Invoice Document Structure & Layout
console.log('\n--- 2. التحقق من هيكل وتصميم الفاتورة (A4 & RTL) ---');

assert(html.includes('id="print-area"'), 'حاوية المستند الطباعي print-area غير موجودة');
assert(html.includes('id="print-doc-title"'), 'عنوان المستند print-doc-title غير موجود');
assert(html.includes('id="print-doc-number"'), 'رقم المستند print-doc-number غير موجود');
assert(html.includes('id="print-doc-date"'), 'تاريخ المستند print-doc-date غير موجود');
assert(html.includes('id="print-party-box-title"'), 'عنوان بطاقة العميل المكرم غير موجود');
assert(html.includes('id="print-party-name"'), 'اسم العميل print-party-name غير موجود');
assert(html.includes('id="print-party-phone"'), 'هاتف العميل print-party-phone غير موجود');
assert(html.includes('id="print-party-address"'), 'عنوان العميل print-party-address غير موجود');

// Table Headers and Summary
assert(html.includes('id="print-table-head"'), 'ترويسة جدول الأصناف print-table-head غير موجودة');
assert(html.includes('id="print-table-body"'), 'جسم جدول الأصناف print-table-body غير موجود');
assert(html.includes('id="print-totals-table"'), 'جدول الإجماليات والملخص المالي غير موجود');
assert(html.includes('id="print-val-tafqeet"'), 'حقل التفقيط بالعربية print-val-tafqeet غير موجود');
assert(html.includes('id="print-val-final-total"'), 'حقل الصافي النهائي المستحق غير موجود');

// Signatures and Footer
assert(html.includes('id="print-sign-title-1"'), 'توقيع المستلم غير موجود');
assert(html.includes('id="print-sign-title-2"'), 'توقيع المحاسب ومسؤول المخزن غير موجود');
assert(html.includes('id="print-sign-title-3"'), 'اعتماد الإدارة وختم الشركة غير موجود');
assert(html.includes('print-footer-banner'), 'شريط التذييل الرسمي print-footer-banner غير موجود');
console.log('  ✅ تم التحقق: كافة عناصر الفاتورة الرسمية (الترويسة، العميل، الجدول، الإجماليات، التفقيط، التواقيع الثلاثة، والتذييل) مكتملة ومحددة.');

// 3. High-Resolution PNG Export & html2canvas Integration
console.log('\n--- 3. التحقق من تكامل مكتبة html2canvas وتصدير صورة PNG ---');

assert(html.includes('html2canvas'), 'مكتبة html2canvas غير مضمنة في الصفحة');
assert(
    fs.existsSync(path.join(__dirname, 'assets', 'html2canvas.min.js')),
    'ملف مكتبة html2canvas المحلي assets/html2canvas.min.js غير موجود'
);

assert(html.includes('downloadCurrentInvoicePNG'), 'دالة downloadCurrentInvoicePNG غير معرفة في كود النظام');
assert(html.includes('previewAndExportPNG'), 'دالة previewAndExportPNG غير معرفة في كود النظام');
assert(html.includes('printCurrentPreviewInvoice'), 'دالة printCurrentPreviewInvoice غير معرفة في كود النظام');

// Check scale and options in export logic
assert(html.includes('scale: 2'), 'تصدير PNG لا يستخدم الدقة العالية scale: 2 (Retina)');
assert(html.includes('backgroundColor: \'#ffffff\''), 'تصدير PNG لا يحدد خلفية بيضاء نقية');
console.log('  ✅ تم التحقق: مكتبة html2canvas متوفرة محلياً ودوال التصدير عالية الدقة (scale 2) مدمجة بنجاح.');

// 4. Export Preview Modal Verification
console.log('\n--- 4. التحقق من نافذة معاينة وتصدير الفاتورة (Modal Preview) ---');

assert(html.includes('id="modal-invoice-preview"'), 'نافذة معاينة التصدير modal-invoice-preview غير موجودة');
assert(html.includes('id="preview-invoice-modal-title"'), 'عنوان نافذة المعاينة غير موجود');
assert(html.includes('id="btn-modal-export-png"'), 'زر تنزيل صورة PNG داخل نافذة المعاينة غير موجود');
assert(html.includes('id="btn-modal-print-preview"'), 'زر الطباعة A4 داخل نافذة المعاينة غير موجود');
assert(html.includes('id="invoice-preview-render-target"'), 'حاوية العرض التفاعلي للفاتورة داخل النافذة غير موجودة');

// Buttons in Sales View and Modal View
assert(html.includes('title="معاينة وتصدير صورة PNG"'), 'زر معاينة وتصدير PNG غير موجود في جدول الفواتير');
assert(html.includes('تصدير صورة PNG'), 'زر تصدير صورة PNG غير موجود في نافذة تفاصيل الفاتورة');
console.log('  ✅ تم التحقق: نافذة المعاينة المسبقة (Export Preview Modal) متكاملة مع أزرار التنزيل والطباعة في الواجهات.');

// 5. CSS Navy & Gold Palette Verification
console.log('\n--- 5. التحقق من قواعد التنسيق الطباعي واللوني (Navy & Gold Palette) ---');

assert(html.includes('#0a192f'), 'اللون الكحلي الداكن الفاخر #0a192f غير مستخدم في التنسيقات');
assert(html.includes('#c59b27') || html.includes('#d4af37'), 'اللون الذهبي الملكي للترويسة غير مستخدم');
assert(html.includes('.invoice-sheet'), 'قواعد تنسيق ورقة الفاتورة .invoice-sheet غير معرفة');
assert(html.includes('size: A4 portrait'), 'مقاس الطباعة A4 portrait غير محدد');
assert(html.includes('page-break-inside: avoid'), 'خاصية منع كسر الصفوف page-break-inside: avoid غير مفعلة');
console.log('  ✅ تم التحقق: التنسيق اللوني الكحلي والذهبي متطابق ومجهز للطباعة والتصدير بدقة.');

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
console.log('  🎉 نجاح تام: جميع اختبارات إعادة تصميم الفاتورة وتصدير PNG اجتازت الفحص بنسبة 100%!');
console.log('=============================================================');
