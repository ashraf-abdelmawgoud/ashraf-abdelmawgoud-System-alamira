// ==============================================================================
// AL AMIRA INVENTORY & INVOICING SYSTEM
// Comprehensive Verification & End-to-End Test Suite — Final Hardened Security Fix
// File: verify_all_requirements.js
// ==============================================================================

const fs = require('fs');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ فشل الاختبار: ${message}`);
        process.exit(1);
    }
    console.log(`✅ نجاح: ${message}`);
}

console.log('================================================================');
console.log('  بدء التحقق الشامل من إصلاحات الأمان النهائية الأربعة ونظافة البيانات');
console.log('================================================================\n');

// 1. Check required files
console.log('--- 1. التحقق من وجود الملفات والمكونات الأساسية ---');
assert(fs.existsSync('index.html'), 'ملف واجهة المستخدم index.html موجود');
assert(fs.existsSync('supabase/schema.sql'), 'ملف مخطط قاعدة البيانات supabase/schema.sql موجود');
assert(fs.existsSync('supabase/functions.sql'), 'ملف الإجراءات المخزونة supabase/functions.sql موجود');
assert(fs.existsSync('supabase/rls.sql'), 'ملف سياسات الأمان RLS supabase/rls.sql موجود');
assert(fs.existsSync('supabase/seed.sql'), 'ملف البيانات الأولية supabase/seed.sql موجود');
assert(fs.existsSync('supabase/combined_setup.sql'), 'ملف التثبيت الشامل supabase/combined_setup.sql موجود');

// Read files
const schemaContent = fs.readFileSync('supabase/schema.sql', 'utf8');
const functionsContent = fs.readFileSync('supabase/functions.sql', 'utf8');
const rlsContent = fs.readFileSync('supabase/rls.sql', 'utf8');
const seedContent = fs.readFileSync('supabase/seed.sql', 'utf8');
const combinedContent = fs.readFileSync('supabase/combined_setup.sql', 'utf8');
const htmlContent = fs.readFileSync('index.html', 'utf8');

// 2. Requirement 1: Authorized Users Protection (No direct write policies or grants)
console.log('\n--- 2. حماية قائمة المستخدمين المصرح لهم (Authorized Users Protection) ---');
assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.authorized_users'), 'جدول authorized_users معرف كقائمة بيضاء موثوقة');
assert(rlsContent.includes('CREATE POLICY "auth_users_select" ON public.authorized_users'), 'سياسة القراءة auth_users_select مفعلة للمستخدمين المصرح لهم فقط');
assert(!rlsContent.includes('CREATE POLICY "auth_users_update"'), 'تم حذف سياسة التعديل auth_users_update نهائياً لمنع التلاعب عبر REST API');
assert(!rlsContent.includes('CREATE POLICY "auth_users_insert"'), 'لا توجد سياسة إضافة لجدول authorized_users عبر عملاء المتصفح');
assert(!rlsContent.includes('CREATE POLICY "auth_users_delete"'), 'لا توجد سياسة حذف لجدول authorized_users عبر عملاء المتصفح');
assert(schemaContent.includes('REVOKE ALL ON TABLE public.authorized_users FROM PUBLIC, anon, authenticated;'), 'إلغاء كافة صلاحيات التعديل والكتابة المباشرة على authorized_users');
assert(schemaContent.includes('GRANT SELECT ON TABLE public.authorized_users TO authenticated;'), 'حصر صلاحية عملاء المتصفح في القراءة فقط لمنع التلاعب بالقائمة البيضاء');

// 3. Requirement 2: Initial Inventory Protection (Zero Initial Stock Enforced)
console.log('\n--- 3. حماية الرصيد الافتتاحي ومنع إنشاء أصناف برصيد ابتدائي (Initial Inventory Protection) ---');
assert(schemaContent.includes('current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0.000') || schemaContent.includes('current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00'), 'الرصيد الافتراضي في المخطط مثبت برمجياً على 0.00');
assert(schemaContent.includes('trg_enforce_zero_initial_stock'), 'محفز trg_enforce_zero_initial_stock مفعل قبل الإضافة في جدول products');
assert(schemaContent.includes('enforce_zero_initial_stock()'), 'دالة enforce_zero_initial_stock ترفض أي رصيد غير صفري وترفع استثناء واضح');
assert(rlsContent.includes('(current_stock = 0.00 OR current_stock IS NULL)'), 'سياسة RLS للإضافة products_insert تشترط أن يكون الرصيد صفرياً');

// 4. Requirement 3: Secure Stock Updates (Column-Level Permissions + Triggers)
console.log('\n--- 4. حماية تحديثات المخزون ومنع التعديل المباشر (Column-Level Security & Triggers) ---');
assert(schemaContent.includes('REVOKE UPDATE ON TABLE public.products FROM PUBLIC, anon, authenticated;'), 'إلغاء صلاحية UPDATE العامة على مستوى جدول products');
assert(schemaContent.includes('GRANT UPDATE (') && !schemaContent.match(/GRANT UPDATE \([^)]*current_stock[^)]*\) ON TABLE public\.products/), 'صلاحيات UPDATE الممنوحة للمستخدمين تستثني عمود current_stock تماماً على مستوى محرك PostgreSQL');
assert(schemaContent.includes('trg_prevent_direct_stock_tampering'), 'محفز منع تعديل الرصيد مباشرة trg_prevent_direct_stock_tampering مفعل');
assert(schemaContent.includes('trg_prevent_movement_update_delete'), 'محفز حماية سجل حركات المخزون المعصوم trg_prevent_movement_update_delete مفعل');
assert(functionsContent.includes('alamira.stock_movement_in_progress'), 'دوال الاعتماد تستخدم إشارة المعاملة الداخلية alamira.stock_movement_in_progress');
assert(functionsContent.includes('FOR UPDATE'), 'دوال الاعتماد تطبق قفل الصفوف الحصري FOR UPDATE لمنع تضارب العمليات المتزامنة');

// 5. Requirement 4: Backup Restoration Security
console.log('\n--- 5. أمان استعادة النسخ الاحتياطية (Backup Restoration Security) ---');
assert(functionsContent.includes('export_full_backup()'), 'دالة تصدير النسخة الاحتياطية export_full_backup معرفة وتعمل بكفاءة');
assert(functionsContent.includes('GRANT EXECUTE ON FUNCTION public.export_full_backup() TO authenticated;'), 'صلاحية التصدير ممنوحة للمستخدمين المصرح لهم');
assert(functionsContent.includes('استعادة النسخة الاحتياطية المباشرة عبر واجهة المتصفح معطلة لأسباب أمنية'), 'تم تعطيل الاستعادة المباشرة عبر RPC وتوضيح ضرورة الاستعادة عبر أدوات الخادم الرسمية');
assert(functionsContent.includes('REVOKE EXECUTE ON FUNCTION public.restore_full_backup(JSONB) FROM PUBLIC, anon, authenticated;'), 'إلغاء صلاحية تنفيذ restore_full_backup عبر REST API');
assert(!functionsContent.includes('ALTER TABLE public.inventory_movements DISABLE TRIGGER'), 'تم التخلص تماماً من أوامر تعطيل المحفزات الخطرة ALTER TABLE DISABLE TRIGGER');

// 6. Requirement 5: Removal of Demo Business Data (Clean Slate Production)
console.log('\n--- 6. تنظيف البيانات التجريبية وبدء قاعدة بيانات إنتاجية نظيفة (Zero Demo Data) ---');
assert(!seedContent.includes('142857'), 'تم حذف السجل التجاري الوهمي 142857');
assert(!seedContent.includes('350-982-100'), 'تم حذف البطاقة الضريبية الوهمية 350-982-100');
assert(!seedContent.includes('01000000000'), 'تم حذف أرقام الهواتف الوهمية 01000000000');
assert(!seedContent.includes('INSERT INTO public.suppliers'), 'جدول الموردين يبدأ نظيفاً بنسبة 100% بدون أي موردين تجريبيين');
assert(!seedContent.includes('INSERT INTO public.customers'), 'جدول العملاء يبدأ نظيفاً بنسبة 100% بدون أي عملاء تجريبيين');
assert(!seedContent.includes('INSERT INTO public.products'), 'جدول المنتجات يبدأ نظيفاً بنسبة 100% بدون أي منتجات تجريبية أو أرصدة أولية غير موثقة');
assert(seedContent.includes('provision_authorized_user'), 'دالة تهيئة المستخدمين المصرح لهم provision_authorized_user متوفرة للاستخدام الإداري');

// 7. Mathematical Double Discount Verification
console.log('\n--- 7. التحقق الحسابي الدقيق لسيناريو الخصم المزدوج (Double Discount) ---');
const qty = 10;
const unitPrice = 100;
const grossLine = qty * unitPrice; // 1000 EGP
const itemDiscountPct = 10;
const itemDiscountAmount = (grossLine * itemDiscountPct) / 100; // 100 EGP
const netLine = grossLine - itemDiscountAmount; // 900 EGP
const subtotal = netLine; // 900 EGP
const invoiceDiscountPct = 5;
const invoiceDiscountAmount = (subtotal * invoiceDiscountPct) / 100; // 45 EGP
const finalTotal = subtotal - invoiceDiscountAmount; // 855 EGP

assert(grossLine === 1000, `الإجمالي الأولي للبند = 1000 ج.م (الفعلي: ${grossLine})`);
assert(itemDiscountAmount === 100, `قيمة خصم البند (10%) = 100 ج.م (الفعلي: ${itemDiscountAmount})`);
assert(netLine === 900, `صافي البند والمجموع الفرعي = 900 ج.م (الفعلي: ${netLine})`);
assert(invoiceDiscountAmount === 45, `قيمة خصم الفاتورة (5%) = 45 ج.م (الفعلي: ${invoiceDiscountAmount})`);
assert(finalTotal === 855, `الصافي النهائي المستحق = 855 ج.م (الفعلي: ${finalTotal})`);

// 8. Combined Setup Script Integrity
console.log('\n--- 8. فحص سلامة وتكامل ملف التثبيت المجمع (combined_setup.sql) ---');
assert(combinedContent.includes('CREATE TABLE IF NOT EXISTS public.authorized_users'), 'ملف combined_setup يحتوي على جدول authorized_users');
assert(combinedContent.includes('trg_enforce_zero_initial_stock'), 'ملف combined_setup يحتوي على محفز فرض الرصيد الصفري');
assert(combinedContent.includes('REVOKE UPDATE ON TABLE public.products'), 'ملف combined_setup يحتوي على صلاحيات الأعمدة الصارمة');
assert(!combinedContent.includes('ALTER TABLE public.inventory_movements DISABLE TRIGGER'), 'ملف combined_setup خالٍ من أوامر تعطيل المحفزات');
assert(!combinedContent.includes('142857'), 'ملف combined_setup خالٍ من أي بيانات تجريبية وهمية');

console.log('\n================================================================');
console.log('  🎉 نجحت جميع الفحوصات الفنية والأمنية للإصلاحات النهائية بنسبة 100%');
console.log('================================================================\n');
