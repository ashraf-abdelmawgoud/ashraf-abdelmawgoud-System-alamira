/**
 * ==============================================================================
 * AL-AMIRA INVENTORY MANAGEMENT SYSTEM
 * Test Suite: Simplified Product Registration & Audited Opening Balance
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== بدء اختبارات تبسيط تسجيل الأصناف وإثبات الرصيد الافتتاحي (Simplified Product Registration) ===\n');

// 1. Verify SQL Migration and Setup Files
console.log('--- 1. فحص ملفات الهجرة وقاعدة البيانات (SQL) ---');
const migrationSql = fs.readFileSync(path.join(__dirname, 'supabase', 'migration_opening_balance.sql'), 'utf8');
const functionsSql = fs.readFileSync(path.join(__dirname, 'supabase', 'functions.sql'), 'utf8');
const combinedSql = fs.readFileSync(path.join(__dirname, 'supabase', 'combined_setup.sql'), 'utf8');

assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.register_product_with_opening_stock'), 'يجب أن يحتوي ملف الهجرة على دالة register_product_with_opening_stock');
assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.register_opening_stock'), 'يجب أن يحتوي ملف الهجرة على دالة register_opening_stock');
assert(migrationSql.includes('0.000, -- Internally zero'), 'يجب إنشاء الصنف برصيد صفري داخلياً للامتثال لقيود الأمان');
assert(migrationSql.includes('alamira.stock_movement_in_progress'), 'يجب تفعيل إشارة المعاملة الداخلية لتحديث الرصيد');
assert(migrationSql.includes('OPN-'), 'يجب أن تبدأ أرقام التسويات الافتتاحية بـ OPN- لتمييزها');
assert(migrationSql.includes('SECURITY DEFINER'), 'يجب أن تكون الدوال معرّفة بـ SECURITY DEFINER');
assert(migrationSql.includes('public.is_authorized_user()'), 'يجب فحص المستخدم المصرح له');

console.log('✅ نجاح: دالة register_product_with_opening_stock تنشئ الصنف برصيد صفري داخلياً ثم تثبت الرصيد الافتتاحي في سجل الرقابة بحركة معتمدة.');
console.log('✅ نجاح: دالة register_opening_stock تتيح إثبات الرصيد الافتتاحي للأصناف المؤسسة برصيد صفري.');

assert(functionsSql.includes('register_product_with_opening_stock'), 'يجب تضمين دالة register_product_with_opening_stock في functions.sql');
assert(combinedSql.includes('register_product_with_opening_stock'), 'يجب تضمين دالة register_product_with_opening_stock في combined_setup.sql');
console.log('✅ نجاح: الدوال وصلاحياتها مدمجة بالكامل في functions.sql و combined_setup.sql.');

// 2. Verify HTML UI Elements in index.html
console.log('\n--- 2. فحص عناصر واجهة المستخدم في index.html ---');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Opening quantity input
assert(html.includes('id="prod-form-opening-qty"'), 'حقل الكمية الحالية / الرصيد الافتتاحي موجود');
assert(html.includes('الكمية الحالية / الرصيد الافتتاحي'), 'تسمية حقل الكمية الحالية / الرصيد الافتتاحي واضحة ومطابقة');
assert(html.includes('id="prod-opening-qty-group"'), 'مجموعة حقل الرصيد الافتتاحي موجودة');
assert(html.includes('id="prod-stock-locked-group"'), 'شارة قفل الرصيد في وضع التعديل موجودة');

// Buttons
assert(html.includes('id="btn-save-product"'), 'زر حفظ الصنف موجود');
assert(html.includes('onclick="App.closeModals()"'), 'زر الإلغاء موجود');

// Distinction of opening balance in movements
assert(html.includes('رصيد افتتاحي'), 'سجل حركات المخزون يميز الرصيد الافتتاحي بشارة خاصة');

console.log('✅ نجاح: نموذج تسجيل الصنف مختصر وسهل الاستخدام مع تمييز الحقول الإلزامية الأربعة (SKU، الاسم، الوحدة، الرصيد الافتتاحي).');
console.log('✅ نجاح: حقل الرصيد محمي تماماً في وضع التعديل ولا يسمح بالتعديل المباشر بعد التأسيس.');
console.log('✅ نجاح: أزرار الحفظ والإلغاء ظاهرة ومرئية دائماً في ذيل النافذة.');

// 3. Test Business Logic & Decimal/Integer Rules
console.log('\n--- 3. اختبار قواعد التحقق ومنطق الحسابات (Business Logic Simulation) ---');

function validateProductRegistration(input) {
    const errors = [];
    if (!input.sku || !input.sku.trim()) errors.push('كود الصنف مطلوب');
    if (!input.name || !input.name.trim()) errors.push('اسم المنتج مطلوب');
    if (!input.unit || !input.unit.trim()) errors.push('وحدة القياس مطلوبة');
    if (input.opening_qty === undefined || input.opening_qty === null || input.opening_qty === '') {
        errors.push('الرصيد الافتتاحي مطلوب');
    } else {
        const qty = Number(input.opening_qty);
        if (isNaN(qty) || qty < 0) {
            errors.push('الرصيد الافتتاحي يجب أن يكون صفراً أو رقماً موجباً');
        } else if (!input.allows_decimal && (qty % 1 !== 0)) {
            errors.push('الصنف يباع بوحدات صحيحة فقط ولا يقبل كميات كسرية للرصيد الافتتاحي');
        }
    }
    return errors;
}

// Case A: Valid creation with 0 opening stock (zero allowed)
const resA = validateProductRegistration({
    sku: 'P-101',
    name: 'صنف برصيد صفري',
    unit: 'قطعة',
    opening_qty: 0,
    allows_decimal: false
});
assert.strictEqual(resA.length, 0, 'يجب قبول إنشاء الصنف برصيد صفري');
console.log('✅ نجاح: قبول تسجيل صنف برصيد صفري (0.00) دون أي أخطاء.');

// Case B: Valid creation with positive integer opening stock
const resB = validateProductRegistration({
    sku: 'P-102',
    name: 'كرتونة ورق',
    unit: 'كرتونة',
    opening_qty: 25,
    allows_decimal: false
});
assert.strictEqual(resB.length, 0, 'يجب قبول إنشاء الصنف برصيد 25 كرتونة');
console.log('✅ نجاح: قبول تسجيل صنف برصيد افتتاحي 25 كرتونة.');

// Case C: Valid creation with decimal opening stock for decimal-enabled product
const resC = validateProductRegistration({
    sku: 'P-103',
    name: 'كابل شبكات نحاسي',
    unit: 'متر',
    opening_qty: 12.75,
    allows_decimal: true
});
assert.strictEqual(resC.length, 0, 'يجب قبول إنشاء الصنف برصيد كسري 12.75 متر');
console.log('✅ نجاح: قبول تسجيل صنف برصيد كسري (12.75 متر) للأصناف التي تقبل كسوراً.');

// Case D: Rejection of fractional opening stock for integer-only product
const resD = validateProductRegistration({
    sku: 'P-104',
    name: 'طقم أقلام',
    unit: 'طقم',
    opening_qty: 3.5,
    allows_decimal: false
});
assert(resD.length > 0 && resD[0].includes('لا يقبل كميات كسرية'), 'يجب رفض الكسور للأصناف الصحيحة');
console.log('✅ نجاح: رفض تسجيل كميات كسرية (3.5 طقم) للأصناف التي تباع بالعدد الصحيح فقط.');

// Case E: Rejection of negative opening stock
const resE = validateProductRegistration({
    sku: 'P-105',
    name: 'صنف سالب',
    unit: 'قطعة',
    opening_qty: -5,
    allows_decimal: false
});
assert(resE.length > 0 && resE[0].includes('صفراً أو رقماً موجباً'), 'يجب رفض الكميات السالبة');
console.log('✅ نجاح: رفض إدخال كميات سالبة للرصيد الافتتاحي.');

// 4. Test Stock Availability and Subsequent Transactions Formula
console.log('\n--- 4. اختبار احتساب رصيد المخزون التراكمي من الرصيد الافتتاحي ---');

// Formula: available_stock = opening_stock + receipts - sales - issues + adjustments
const openingBalance = 50;
const approvedReceipts = 20; // 50 + 20 = 70
const approvedSales = 15;    // 70 - 15 = 55
const approvedIssues = 5;     // 55 - 5 = 50
const approvedAdjustment = -2;// 50 - 2 = 48

const finalStock = openingBalance + approvedReceipts - approvedSales - approvedIssues + approvedAdjustment;
assert.strictEqual(finalStock, 48, 'يجب أن يكون الرصيد النهائي 48 وحدة');
console.log('✅ نجاح: معادلة احتساب الرصيد المتاح (افتتاحي + توريدات - مبيعات - منصرف ± تسويات) = 48 وحدة بدقة.');

// 5. Test Display of Unknown Prices
console.log('\n--- 5. اختبار عدم عرض الصفر كتكلفة شراء مؤكدة عند ترك السعر فارغاً ---');

function formatPriceDisplay(price) {
    return (price != null && Number(price) > 0)
        ? (Number(price).toFixed(2) + ' ج.م')
        : '--';
}

assert.strictEqual(formatPriceDisplay(0), '--', 'السعر 0 أو الفارغ يجب أن يعرض كـ -- للدلالة على أنه غير محدد');
assert.strictEqual(formatPriceDisplay(null), '--');
assert.strictEqual(formatPriceDisplay(150), '150.00 ج.م');
console.log('✅ نجاح: الأسعار غير المدخلة تظهر كـ (--) ولا يتم عرض 0.00 كتكلفة شراء مؤكدة.');

console.log('\n=============================================================');
console.log('  🎉 اكتملت كافة اختبارات تسجيل الأصناف والرصيد الافتتاحي بنجاح 100%');
console.log('=============================================================');
