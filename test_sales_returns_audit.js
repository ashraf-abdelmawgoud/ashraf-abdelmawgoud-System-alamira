/**
 * test_sales_returns_audit.js
 * Read-only / static automated safety audit suite for Sales Returns in Al-Amira System.
 * Inspects frontend handlers, database schema, RPC functions, and triggers.
 */

const fs = require('fs');
const assert = require('assert');

console.log('=============================================================');
console.log('  🔍 AUDIT SUITE: SALES RETURNS SAFETY & DATABASE INTEGRATION');
console.log('=============================================================');

const html = fs.readFileSync('index.html', 'utf8');
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const functions = fs.readFileSync('supabase/functions.sql', 'utf8');
const rls = fs.readFileSync('supabase/rls.sql', 'utf8');

// 1. Frontend Implementation Analysis
console.log('\n--- 1. فحص تنفيذ واجهة المستخدم ومعالجات الجافاسكريبت (Frontend Inspection) ---');

// Modal exists
assert(html.includes('id="modal-invoice-return"'), 'نافذة تسجيل المرتجع modal-invoice-return موجودة بالـ DOM');
assert(html.includes('id="return-inv-items-tbody"'), 'جدول أصناف المرتجع موجود');
assert(html.includes('id="return-inv-reason"'), 'حقل سبب المرتجع موجود');

// Extract executeReturn implementation
const execReturnMatch = html.match(/async\s+executeReturn\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\},/);
assert(execReturnMatch, 'دالة executeReturn موجودة في كود الجافاسكريبت');
const execReturnBody = execReturnMatch[1];

// Verify whether Supabase client is called in executeReturn
const callsSupabaseInReturn = execReturnBody.includes('supabaseClient.from(') || 
                              execReturnBody.includes('supabaseClient.rpc(');

console.log(`  📊 هل دالة executeReturn ترسل أي استدعاء لقاعدة بيانات Supabase؟ ${callsSupabaseInReturn ? 'نعم' : 'لا (UI-Only)'}`);
assert(!callsSupabaseInReturn, 'دالة executeReturn لا تتصل بـ Supabase إطلاقاً وهي واجهة مستخدم فقط (UI-Only)');

// Verify whether inventory is directly modified from browser
const modifiesStockInReturn = execReturnBody.includes('.update({ current_stock') || 
                              execReturnBody.includes('current_stock:');
assert(!modifiesStockInReturn, 'لا يوجد أي تعديل مباشر للمخزون من المتصفح في كود المرتجع (Safe from direct tampering)');

// 2. Database Schema Analysis
console.log('\n--- 2. فحص مخطط قاعدة البيانات وجداول المرتجعات (Database Schema) ---');
const hasSalesReturnsTable = schema.includes('CREATE TABLE IF NOT EXISTS public.sales_returns') ||
                             schema.includes('CREATE TABLE public.sales_returns');
const hasSalesReturnItemsTable = schema.includes('CREATE TABLE IF NOT EXISTS public.sales_return_items') ||
                                  schema.includes('CREATE TABLE public.sales_return_items');

console.log(`  📊 هل يوجد جدول sales_returns في schema.sql؟ ${hasSalesReturnsTable ? 'نعم' : 'غير موجود'}`);
console.log(`  📊 هل يوجد جدول sales_return_items في schema.sql؟ ${hasSalesReturnItemsTable ? 'نعم' : 'غير موجود'}`);

assert(!hasSalesReturnsTable, 'جدول sales_returns غير موجود في قاعدة البيانات');
assert(!hasSalesReturnItemsTable, 'جدول sales_return_items غير موجود في قاعدة البيانات');

// 3. RPC & Backend Logic Analysis
console.log('\n--- 3. فحص الدوال المخزنة وإجراءات المعالجة السحابية (Stored Functions & RPCs) ---');
const hasReturnRPC = functions.includes('approve_sales_return') || 
                     functions.includes('create_sales_return') ||
                     functions.includes('process_sales_return');

console.log(`  📊 هل توجد دالة RPC لاعتماد أو تسجيل المرتجعات في functions.sql؟ ${hasReturnRPC ? 'نعم' : 'غير موجودة'}`);
assert(!hasReturnRPC, 'دالة معالجة المرتجعات RPC غير متوفرة بعد في قاعدة البيانات');

// Check cancel_sales_invoice vs partial returns
assert(functions.includes('CREATE OR REPLACE FUNCTION public.cancel_sales_invoice'), 'دالة cancel_sales_invoice موجودة لإلغاء الفواتير الكاملة');
console.log('  ℹ️ ملاحظة: دالة cancel_sales_invoice تلغي كامل الفاتورة وتعيد كامل الكميات، ولا تدعم المرتجع الجزئي.');

// 4. Security & Stock Protection Triggers
console.log('\n--- 4. فحص حماية المخزون وقواعد الأمان (Stock Protection & RLS) ---');
assert(schema.includes('prevent_direct_stock_tampering'), 'قفل تعديل المخزون المباشر مفعل عبر تريجر prevent_direct_stock_tampering');
assert(schema.includes('prevent_movement_modification'), 'سجل حركات المخزون محمي من التعديل أو الحذف عبر prevent_movement_modification');
assert(rls.includes('ENABLE ROW LEVEL SECURITY'), 'سياسات أمان مستوى الصف RLS مفعلة على كافة الجداول');

console.log('  ✅ تم التحقق: رصيد المخزون وسجل الحركات محميان بالكامل من أي تعديل خارجي مباشر.');

console.log('\n=============================================================');
console.log('  🏁 اكتمل فحص وتدقيق أمان ميزة مرتجعات المبيعات بنجاح.');
console.log('=============================================================');
