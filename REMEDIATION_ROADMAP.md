# خطة وخارطة طريق الإصلاح والمعالجة الفنية
# Al-Amira Production Remediation Roadmap & Repair Plan

> **الهدف:** توجيه الفريق الهندسي والمالك لترتيب وتنفيذ الإصلاحات الفنية والأمنية بالترتيب الأكثر أماناً وحمايةً للبيانات قبل الانتقال لبيئة الإنتاج الحية.

---

## المرحلة الأولى: إصلاح ملفات قاعدة البيانات وتصحيح الصلاحيات (Database Layer)
> **الأولوية:** **حرجة جداً (P0 — Immediate)**  
> **الملفات المعنية:** `supabase/combined_setup.sql`, `supabase/functions.sql`, `supabase/rls.sql`

1. **تصحيح ترتيب أوامر DDL في دوال النظام:**
   - نقل أوامر منح الصلاحيات التالية:
     ```sql
     GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
     GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;
     ```
     لتكون **بعد** كود `CREATE OR REPLACE FUNCTION` الخاص بالدالتين في كل من `functions.sql` و `combined_setup.sql`.
2. **منح صلاحيات الجداول لدور Authenticated في RLS:**
   - إضافة أوامر الصلاحيات الصريحة للجداول الـ 14 في ملف `rls.sql` و `combined_setup.sql`:
     ```sql
     GRANT SELECT, INSERT, UPDATE, DELETE ON 
         public.categories,
         public.customers,
         public.suppliers,
         public.stock_receipts,
         public.stock_receipt_items,
         public.stock_issues,
         public.stock_issue_items,
         public.sales_invoices,
         public.sales_invoice_items,
         public.inventory_adjustments,
         public.inventory_adjustment_items,
         public.application_settings,
         public.backup_metadata
     TO authenticated;

     GRANT SELECT ON public.inventory_movements TO authenticated;
     ```
3. **التحقق من اجتياز اختبار PostgreSQL المعزول:**
   - تشغيل `node test_real_postgresql_integration.js` والتأكد من نجاح تثبيت وتشغيل كافة خطوات DDL والمحفزات بدون أي خطأ.

---

## المرحلة الثانية: تصحيح أخطاء الاستدعاء وتدفق البيانات في الواجهة (Frontend Layer)
> **الأولوية:** **عالية (P1 — High)**  
> **الملف المعني:** `index.html`

1. **تصحيح اسم جدول إعدادات النظام:**
   - استبدال `from('app_settings')` باسم الجدول الصحيح بالمخطط `from('application_settings')` في سطور جلب وحفظ إعدادات المؤسسة.
2. **تصحيح فحص ارتباطات المورد عند الحذف:**
   - تعديل دالة `SuppliersModule.deleteSupplier` لتقرأ من مصفوفة الإيصالات الصحيحة في الذاكرة:
     ```javascript
     const linkedReceipts = (AppState.receipts || []).filter(r => r.supplier_id === id);
     ```
3. **تصحيح استخراج بنود النسخ الاحتياطي في الآلية البديلة:**
   - تعديل دالة `BackupRestoreModule.createFullBackup` لاستخراج البنود من مصفوفات الفواتير والإيصالات المحملة:
     ```javascript
     const allInvoiceItems = (AppState.invoices || []).flatMap(inv => inv.items || []);
     const allReceiptItems = (AppState.receipts || []).flatMap(rec => rec.items || []);
     const allIssueItems = (AppState.issues || []).flatMap(iss => iss.items || []);
     ```
   - وتصنيف التصدير كـ `client_data_snapshot` مع توجيه المستخدم بأن النسخة الشاملة المعتمدة هي الصادرة من الخادم.
4. **تصحيح مسميات دوال الميجريشن في شاشة الإعدادات:**
   - تعديل جدول التبويب الخامس ليعرض المسميات الحقيقية للدوال: `register_product_with_opening_stock` و `set_product_active_status`.
5. **إتاحة حذف مسودات الفواتير (Draft Invoices):**
   - إضافة زر حذف مخصص يظهر حصراً عندما تكون `inv.status === 'draft'` لحذف المسودات العرضية غير المعتمدة.

---

## المرحلة الثالثة: التحقق واختبارات الانحدار الشاملة (Verification Layer)
> **الأولوية:** **متوسطة (P2 — Verification)**  
> **الملفات المعنية:** حزمة ملفات الاختبار `test_*.js`

1. تشغيل حزمة الاختبارات الشاملة والتأكد من اجتياز:
   - فحص بناء الجملة: `verify_syntax.js`
   - اختبارات محرك PostgreSQL الحقيقي: `test_real_postgresql_integration.js`
   - اختبارات واجهات المبيعات والمخزن والعملاء والموردين.
2. التأكد من خلو DOM من أي تكرارات في المعرفات.

---

## المرحلة الرابعة: النشر السحابي والتزويد النهائي (Deployment & Go-Live)
> **الأولوية:** **المرحلة الختامية (P3 — Production Launch)**  
> **البيئة المعنية:** مشروع Supabase السحابي المعتمد

1. **تطبيق ملف SQL المصحح في Supabase SQL Editor:**
   - تنفيذ `supabase/combined_setup.sql` المصحح.
2. **تزويد حساب المالك:**
   - إنشاء الحساب في Supabase Auth.
   - تشغيل إجراء التزويد لربطه بالقائمة البيضاء:
     ```sql
     SELECT public.provision_authorized_user('AUTH_USER_UUID', 'اسم صاحب العمل', 'owner@alamira.com');
     ```
3. **جلسة التشغيل الحي الأول (First Live Smoke Test):**
   - تسجيل الدخول في الواجهة الرئيسية `index.html`.
   - تسجيل صنف تجريبي، إصدار فاتورة تجريبية، فحص الطباعة، ثم اعتماد النظام رسمياً.
