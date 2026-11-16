# AL-AMIRA — PRODUCTION MIGRATION RUNBOOK
## دليل التشغيل الميداني لترقية قاعدة البيانات الإنتاجية

> [!WARNING]
> **تنبيه حاسم:** هذا المستند مخصص لمدير قاعدة البيانات (DBA) أو المهندس المسؤول عن المشروع.
> **يُحظر تنفيذ أي أمر على الخادم الحي لشركة الأميرة دون أخذ نسخة احتياطية كاملة مسبقاً والتحقق من سلامتها.**

---

## 1. متطلبات ما قبل الترقية (Pre-Migration Prerequisites)

### 1.1. النسخ الاحتياطي الإلزامي واختبار الاسترجاع
قبل لمس أي إعداد في Supabase:
1. **أخذ نسخة احتياطية من لوحة Supabase:**
   - الدخول إلى `Database` -> `Backups` وتوليد نسخة احتياطية فورية (Manual Backup).
   - أو عبر سطر أوامر pg_dump:
     ```bash
     pg_dump -h <db_host> -p 5432 -U postgres -d postgres -F c -b -v -f "alamira_pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump"
     ```
2. **النسخ الاحتياطي عبر تطبيق الأميرة:**
   - تسجيل الدخول بحساب المدير والانتقال إلى تبويب "النسخ الاحتياطي" واستخراج نسخة JSON كاملة وتنزيلها محلياً.
3. **اختبار سلامة ملف النسخة الاحتياطية:**
   - استيراد النسخة الاحتياطية محلياً في قاعدة بيانات تجريبية مؤقتة والتأكد من مطابقة عدد الأصناف وإجمالي رصيد المخزون.

---

## 2. الفحوصات الاستباقية في بيئة الإنتاج (Preflight Checks)

قم بتشغيل استعلام الفحص التالي في **Supabase SQL Editor** قبل الترقية لتسجيل خط الأساس:

```sql
-- 1. تسجيل إجمالي رصيد المخزون الحالي وعدد الأصناف
SELECT 
    COUNT(*) AS total_products,
    SUM(current_stock) AS total_stock_units,
    COUNT(*) FILTER (WHERE current_stock < 0) AS negative_stock_count
FROM public.products;

-- 2. تسجيل عدد فواتير المبيعات وأذون الإضافة
SELECT 
    (SELECT COUNT(*) FROM public.sales_invoices) AS total_invoices,
    (SELECT COUNT(*) FROM public.stock_receipts) AS total_receipts,
    (SELECT COUNT(*) FROM public.stock_issues) AS total_issues,
    (SELECT COUNT(*) FROM public.inventory_movements) AS total_movements;
```
احتفظ بالأرقام الناتجة لمطابقتها فور انتهاء الترقية.

---

## 3. التسلسل الإلزامي لتنفيذ الترقية (Deployment Sequence)

يتم تنفيذ الملفات الأربعة حصراً بالترتيب التالي داخل نافذة **SQL Editor** في لوحة تحكم Supabase:

### الخطوة الأولى: تنفيذ `supabase/migration_decimal_quantities.sql`
- **الوظيفة:** ترقية دقة أعمدة الكميات إلى `NUMERIC(14, 3)` ودعم الكسور العشرية وتحديث دوال الاعتماد وقفل الرصيد الطازج.
- **التنفيذ:** نسخ كامل محتوى الملف وتشغيله.
- **التحقق السريع بعد التنفيذ:**
  ```sql
  SELECT column_name, data_type, numeric_precision, numeric_scale 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'products' AND column_name IN ('current_stock', 'allows_decimal_quantity');
  ```
  يجب أن تظهر `current_stock` بدقة `14, 3` و `allows_decimal_quantity` من نوع `boolean`.

### الخطوة الثانية: تنفيذ `supabase/migration_product_lifecycle.sql`
- **الوظيفة:** إضافة مشغل حماية الأصناف `trg_prevent_direct_product_deletion` ودوال الحذف الرقابي `delete_product` والأرشفة `set_product_active_status`.
- **التنفيذ:** نسخ كامل محتوى الملف وتشغيله.
- **التحقق السريع:**
  ```sql
  SELECT proname FROM pg_proc WHERE proname IN ('delete_product', 'set_product_active_status');
  ```
  يجب أن تظهر الدالتان وتكونان تابعتين لـ `public`.

### الخطوة الثالثة: تنفيذ `supabase/migration_opening_balance.sql`
- **الوظيفة:** تثبيت دالتي تسجيل الأصناف مع الرصيد الافتتاحي `register_product_with_opening_stock` و `register_opening_stock`.
- **التنفيذ:** نسخ كامل محتوى الملف وتشغيله.
- **التحقق السريع:**
  ```sql
  SELECT proname FROM pg_proc WHERE proname IN ('register_product_with_opening_stock', 'register_opening_stock');
  ```

### الخطوة الرابعة: تنفيذ `supabase/migration_fix_permissions_and_ddl.sql`
- **الوظيفة:** تطبيق صلاحيات الأعمدة (Column DAC)، سحب الصلاحيات من `anon`، ضبط مشغل حماية الرصيد، وإنشاء فهارس الأداء.
- **التنفيذ:** نسخ كامل محتوى الملف وتشغيله.
- **التحقق السريع:**
  ```sql
  -- التحقق القاطع من سحب صلاحيات التعديل المباشر على الحقول الحساسة
  SELECT 
      has_column_privilege('authenticated', 'public.products', 'is_active', 'UPDATE') AS can_update_is_active,
      has_column_privilege('authenticated', 'public.products', 'current_stock', 'UPDATE') AS can_update_current_stock,
      has_column_privilege('authenticated', 'public.products', 'name', 'UPDATE') AS can_update_name,
      has_table_privilege('authenticated', 'public.products', 'DELETE') AS can_delete_products;
  ```
  * **المعيار الحاسم:**
    - `can_update_is_active` = **false**
    - `can_update_current_stock` = **false**
    - `can_delete_products` = **false**
    - `can_update_name` = **true** (وكافة الأعمدة الوصفية المصرح بها)

---

## 4. التحقق اللاحق وتأكيد سلامة التشغيل (Post-Migration Verification)

قم بتشغيل استعلام المطابقة لمقارنة النتائج مع أرقام ما قبل الترقية:

```sql
-- 1. مطابقة إجمالي رصيد المخزون وعدد الأصناف
SELECT 
    COUNT(*) AS total_products,
    SUM(current_stock) AS total_stock_units,
    COUNT(*) FILTER (WHERE current_stock < 0) AS negative_stock_count
FROM public.products;
```
* **المعيار الحاسم:** يجب أن يتطابق `total_products` و `total_stock_units` بنسبة 100% مع الأرقام المسجلة في مرحلة ما قبل الترقية.

```sql
-- 2. مطابقة إجمالي الحركات والفواتير التاريخية
SELECT 
    (SELECT COUNT(*) FROM public.sales_invoices) AS total_invoices,
    (SELECT COUNT(*) FROM public.stock_receipts) AS total_receipts,
    (SELECT COUNT(*) FROM public.stock_issues) AS total_issues,
    (SELECT COUNT(*) FROM public.inventory_movements) AS total_movements;
```
* **المعيار الحاسم:** عدم فقدان أي حركة أو فاتورة أو إذن سابق.

---

## 5. خطة الطوارئ والتراجع (Rollback & Recovery Plan)

في حال حدوث أي خطأ غير متوقع أثناء الترقية:

1. **إذا فشلت خطوة أثناء التنفيذ:**
   - كافة الملفات الأربعة مغلفة بكتل `BEGIN; ... COMMIT;`. فشل أي أمر يتسبب في تراجع تلقائي كامل (Automatic Transaction Rollback) لتلك الخطوة دون ترك أي أثر نصفي.
2. **إذا رغب الفريق في التراجع الكامل بعد انتهاء الترقية:**
   - استعادة النسخة الاحتياطية الكاملة التي تم أخذها في الخطوة 1.1 عبر Supabase Restore أو عبر:
     ```bash
     pg_restore -h <db_host> -p 5432 -U postgres -d postgres --clean --if-exists "alamira_pre_migration_backup_...dump"
     ```
   - التحقق من عودة قاعدة البيانات لبيئتها السابقة.
