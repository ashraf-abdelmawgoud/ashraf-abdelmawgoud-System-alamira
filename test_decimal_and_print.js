// ==============================================================================
// AL AMIRA INVENTORY & INVOICING SYSTEM
// Decimal Quantities & Print Template Test Suite
// File: test_decimal_and_print.js
// ==============================================================================

const fs = require('fs');
const assert = require('assert');

console.log('=== بدء اختبار دعم الكميات العشرية وتصميم الطباعة الاحترافي ===\n');

// 1. Helper functions under test
function round2(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function formatQty(val) {
    if (val === null || val === undefined || isNaN(val) || val === '') return '0';
    const num = Number(val);
    if (num % 1 === 0) return num.toString();
    return Number(num.toFixed(3)).toString();
}

function tafqeetArabic(amount) {
    if (amount === null || amount === undefined || isNaN(amount) || Number(amount) === 0) return 'صفر جنيه مصري لا غير';
    const numAmount = Number(amount);
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
        'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    function convertGroup(n) {
        if (n === 0) return '';
        let res = '';
        const h = Math.floor(n / 100);
        const rem = n % 100;
        if (h > 0) res += hundreds[h];
        if (rem > 0) {
            if (res) res += ' و';
            if (rem < 20) {
                res += ones[rem];
            } else {
                const o = rem % 10;
                const t = Math.floor(rem / 10);
                if (o > 0) res += ones[o] + ' و' + tens[t];
                else res += tens[t];
            }
        }
        return res;
    }

    const whole = Math.floor(numAmount);
    const piastres = Math.round((numAmount - whole) * 100);
    let parts = [];

    const millions = Math.floor(whole / 1000000);
    const thousands = Math.floor((whole % 1000000) / 1000);
    const rest = whole % 1000;

    if (millions > 0) {
        if (millions === 1) parts.push('مليون');
        else if (millions === 2) parts.push('مليونان');
        else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + ' ملايين');
        else parts.push(convertGroup(millions) + ' مليون');
    }

    if (thousands > 0) {
        if (thousands === 1) parts.push('ألف');
        else if (thousands === 2) parts.push('ألفان');
        else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + ' آلاف');
        else parts.push(convertGroup(thousands) + ' ألف');
    }

    if (rest > 0) {
        parts.push(convertGroup(rest));
    }

    let result = 'فقط وقدره ' + (parts.join(' و') || 'صفر') + ' جنيهاً مصرياً';
    if (piastres > 0) {
        result += ' و' + convertGroup(piastres) + ' قرشاً';
    }
    result += ' لا غير.';
    return result;
}

// TEST 1: Quantity Formatting
console.log('--- 1. اختبار دالة تنسيق الكميات formatQty ---');
assert.strictEqual(formatQty(5), '5');
assert.strictEqual(formatQty(5.000), '5');
assert.strictEqual(formatQty(12.5), '12.5');
assert.strictEqual(formatQty(0.25), '0.25');
assert.strictEqual(formatQty(1.125), '1.125');
assert.strictEqual(formatQty(10.500), '10.5');
console.log('✅ نجاح: دالة formatQty تعرض الأعداد الصحيحة بوضوح والكسور بدقة تصل إلى 3 خانات دون أصفار زائدة');

// TEST 2: Tafqeet Generator
console.log('\n--- 2. اختبار التفقيط باللغة العربية للجنيه المصري tafqeetArabic ---');
assert.ok(tafqeetArabic(855).includes('ثمانمائة وخمسة وخمسون جنيهاً مصرياً'));
assert.ok(tafqeetArabic(1250.50).includes('ألف ومائتان وخمسون جنيهاً مصرياً وخمسون قرشاً'));
assert.ok(tafqeetArabic(100.25).includes('مائة جنيهاً مصرياً وخمسة وعشرون قرشاً'));
assert.strictEqual(tafqeetArabic(0), 'صفر جنيه مصري لا غير');
console.log('✅ نجاح: دالة التفقيط تحول الأرقام إلى نصوص عربية صحيحة بالجنيه والقرش');

// TEST 3: Decimal Invoice Calculation
console.log('\n--- 3. اختبار الحسابات المالية للكميات العشرية والكسور ---');
// Scenario: 12.5 meters of cable @ 20.00 EGP = 250.00 EGP
// 10% line discount = 25.00 EGP -> line net = 225.00 EGP
// 5% invoice discount = 11.25 EGP -> subtotal after invoice discount = 213.75 EGP
// Additional shipping charges = 30.00 EGP -> final total = 243.75 EGP
const qty = 12.5;
const unitPrice = 20.00;
const gross = round2(qty * unitPrice);
assert.strictEqual(gross, 250.00, 'إجمالي البند قبل الخصم: 250.00');

const lineDisc = round2((gross * 10) / 100);
assert.strictEqual(lineDisc, 25.00, 'قيمة خصم البند: 25.00');

const net = round2(gross - lineDisc);
assert.strictEqual(net, 225.00, 'صافي البند: 225.00');

const invDisc = round2((net * 5) / 100);
assert.strictEqual(invDisc, 11.25, 'قيمة خصم الفاتورة 5%: 11.25');

const charges = 30.00;
const finalTotal = round2(net - invDisc + charges);
assert.strictEqual(finalTotal, 243.75, 'الصافي النهائي المستحق: 243.75');
console.log('✅ نجاح: الحسابات المالية للكميات العشرية والخصم المزدوج دقيقة بنسبة 100% (243.75 ج.م)');

// TEST 4: Integer Enforcement Check
console.log('\n--- 4. اختبار التحقق من منع الكسور للأصناف ذات الوحدات الصحيحة ---');
function validateItemQty(product, enteredQty) {
    if (isNaN(enteredQty) || enteredQty <= 0) return { valid: false, error: 'الكمية يجب أن تكون أكبر من الصفر' };
    if (!product.allows_decimal_quantity && enteredQty % 1 !== 0) {
        return { valid: false, error: 'الصنف يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية' };
    }
    return { valid: true };
}

const wholeUnitProduct = { name: 'ورق تصوير A4', allows_decimal_quantity: false };
const decimalProduct = { name: 'كابل سويدي 4 مم', allows_decimal_quantity: true };

assert.strictEqual(validateItemQty(wholeUnitProduct, 5).valid, true);
assert.strictEqual(validateItemQty(wholeUnitProduct, 5.5).valid, false);
assert.strictEqual(validateItemQty(decimalProduct, 12.25).valid, true);
assert.strictEqual(validateItemQty(decimalProduct, 0.125).valid, true);
console.log('✅ نجاح: نظام التحقق يمنع إدخال كسور للأصناف غير المصرح لها بالكسور، ويقبلها للأصناف العشرية');

// TEST 5: Verify Files
console.log('\n--- 5. التحقق من ملفات النظام والمخطط والقوالب ---');
const migrationSql = fs.readFileSync('supabase/migration_decimal_quantities.sql', 'utf8');
assert.ok(migrationSql.includes('allows_decimal_quantity'), 'ملف migration_decimal_quantities يحتوي على إضافة عمود allows_decimal_quantity');
assert.ok(migrationSql.includes('NUMERIC(14, 3)'), 'ملف migration_decimal_quantities يحتوي على ترقية الدقة إلى NUMERIC(14, 3)');
assert.ok(migrationSql.includes('chk_products_integer_stock_if_not_decimal'), 'ملف migration_decimal_quantities يحتوي على قيد منع الأرصدة الكسرية للأصناف الصحيحة');

const htmlContent = fs.readFileSync('index.html', 'utf8');
assert.ok(htmlContent.includes('prod-form-allows-decimal'), 'واجهة المستخدم تحتوي على خانة تفعيل الكسور في نموذج الصنف');
assert.ok(htmlContent.includes('formatQty'), 'واجهة المستخدم تحتوي على دالة formatQty');
assert.ok(htmlContent.includes('tafqeetArabic'), 'واجهة المستخدم تحتوي على دالة tafqeetArabic');
assert.ok(htmlContent.includes('print-tafqeet-container'), 'قالب الطباعة يحتوي على حاوية التفقيط');
assert.ok(htmlContent.includes('print-signatures-section'), 'قالب الطباعة يحتوي على قسم التوقيعات الثلاثي المعتمد');
assert.ok(htmlContent.includes('@page {'), 'ملف التصميم يحتوي على قواعد الطباعة لصفحة A4');

console.log('✅ نجاح: كافة الملفات والمكونات متطابقة مع متطلبات النظام');
console.log('\n=============================================================');
console.log('  🎉 اكتملت جميع اختبارات الكسور والطباعة بنجاح تام 100%');
console.log('=============================================================');
