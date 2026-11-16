# تقرير التدقيق الأمني والصلاحيات وقواعد حماية البيانات
# Al-Amira Security, Authentication & RLS Audit Report

> **تاريخ التدقيق:** 16 نوفمبر 2026  
> **مستوى الأمان المستهدف:** بيئة تجارية وإنتاجية محاسبية معصومة (Hardened Enterprise Accounting)  
> **حالة التقييم الأمني:** **جيد جداً مع وجود ثغرة أذونات حاسمة في GRANTs يجب استكمالها**

---

## 1. نموذج المستخدمين المصرح لهم (Two Equal Authorized Users Model)

### 1.1 طبيعة النموذج المعماري
يعتمد النظام على نموذج إدارة متكافئ لشخصين مصرح لهما بكامل الصلاحيات لإدارة أعمال شركة الأميرة. يتم تخزين المستخدمين المعتمدين في جدول خاص بالقائمة البيضاء (`public.authorized_users`):

```sql
CREATE TABLE IF NOT EXISTS public.authorized_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.2 نتائج التحقق والتدقيق:
1. **استقلالية الحساب الفردي:**
   - تم التحقق من أن دالة الفحص `is_authorized_user()` تتحقق فقط من وجود المعرف الحالي:
     ```sql
     SELECT EXISTS (
         SELECT 1 FROM public.authorized_users
         WHERE user_id = auth.uid() AND is_active = true
     );
     ```
   - **النتيجة:** النظام **لا يشترط وجود الحسابين معاً** لبدء العمل. يمكن تشغيل النظام بحساب واحد معتمد فقط دون أي مشاكل.
2. **عدم وجود تفرقة خفية في الصلاحيات (No Hidden Role Disparities):**
   - تم فحص كافة سياسات RLS ودوال RPC: كلا المستخدمين يمتلكان نفس الصلاحيات المحاسبية والتنفيذية لإصدار الفواتير، التوريد، الصرف، التسويات الجردية، وتعديل بيانات العملاء والموردين وإلغاء الفواتير.
   - لا يوجد أي تمييز بين "مدير" و"موظف" داخل العمليات اليومية.
3. **حظر المستخدمين غير المصرح لهم (Unauthorized Authenticated Users):**
   - إذا تمكن أي شخص من إنشاء حساب في Supabase Auth عبر أي وسيلة، فلن يتمكن من قراءة أو كتابة أي سجل تجاري، لأن كافة سياسات RLS ودوال الاعتماد تفحص `is_authorized_user()`.
4. **حماية القائمة البيضاء من التلاعب (Allowlist Immutability):**
   - تم إلغاء كافة صلاحيات الكتابة والإضافة والحذف والتعديل على جدول `authorized_users` من كافة الأدوار (`REVOKE INSERT, UPDATE, DELETE FROM authenticated, anon, PUBLIC;`).
   - لا يمكن لأي مستخدم إضافة نفسه للقائمة البيضاء عبر REST API. التزويد يتم حصراً بواسطة مسؤولي الخادم عبر دالة `provision_authorized_user`.

---

## 2. تدقيق أمان مسار البحث (Search Path Security)

تعتبر هجمات مسار البحث (Search Path Hijacking) من أخطر الثغرات في دوال PostgreSQL ذات الامتيازات المرتفعة (`SECURITY DEFINER`).

### نتائج الفحص:
* تم فحص كافة دوال النظام في `supabase/functions.sql`:
  - `is_authorized_user()`
  - `approve_stock_receipt()`
  - `approve_stock_issue()`
  - `approve_sales_invoice()`
  - `cancel_sales_invoice()`
  - `approve_stock_adjustment()`
  - `export_full_backup()`
  - `delete_product()`
  - `set_product_active_status()`
  - `register_product_with_opening_stock()`
  - `provision_authorized_user()`
* **النتيجة:** **اجتياز تام (100% PASS)**. كافة الدوال مزودة صراحةً بالأمر الأمني الإلزامي:
  ```sql
  SET search_path = public, pg_temp;
  ```
  مما يمنع أي محاولة لحقن كائنات أو دوال خبيثة في مسارات البحث المؤقتة.

---

## 3. ثغرة أذونات الجداول (Table-Level Privileges Vulnerability)

### التوصيف الفني:
في بيئة PostgreSQL، يتطلب وصول المستخدم لأي جدول تحقق شرطين متتاليين:
1. **الشرط الأول:** امتلاك صلاحية الجدول العامة (`GRANT SELECT, INSERT, UPDATE, DELETE ON table TO role`).
2. **الشرط الثاني:** استيفاء شروط أمان مستوى الصفوف (`ROW LEVEL SECURITY POLICIES`).

### الخلل المكتشف في `rls.sql`:
تم تفعيل RLS وكتابة السياسات، ولكن تم نسيان منح صلاحيات الجداول لدور `authenticated` على 14 جدولاً حيوياً. يوضح الجدول التالي حالة كل جدول:

| الجدول | RLS مفعل؟ | سياسة الصف مكتوبة؟ | تم منحه لـ Authenticated؟ | النتيجة العملية |
| :--- | :---: | :---: | :---: | :--- |
| `authorized_users` | نعم | نعم | نعم (`SELECT`) | ✅ يعمل بشكل سليم |
| `products` | نعم | نعم | نعم (`SELECT, INSERT, DELETE, UPDATE cols`) | ✅ محمي ويعمل |
| `categories` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `customers` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `suppliers` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `stock_receipts` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `stock_receipt_items` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `stock_issues` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `stock_issue_items` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `sales_invoices` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `sales_invoice_items` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `inventory_adjustments`| نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `inventory_adjustment_items`| نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `inventory_movements` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `application_settings` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |
| `backup_metadata` | نعم | نعم | ❌ **غير ممنوح** | ❌ خطأ Permission Denied |

---

## 4. تدقيق أمان واجهة المستخدم (Frontend Security Audit)

1. **إدارة المفاتيح والاتصال (Key Exposure):**
   - تم التأكد من أن الواجهة تستخدم المفتاح العام القابل للنشر (`anon key` / `publishable key`) فقط.
   - لا يوجد أي أثر للمفتاح السري (`service_role key`) أو كلمات مرور قاعدة البيانات في الواجهة.
   - في شاشة الإعدادات، يتم إخفاء المفتاح بصيغة مؤمنة (`••••••••`) لمنع التصوير أو كشف المفتاح للمحيطين بالمالك.
2. **الحقن البرمجي (XSS & HTML Injection):**
   - تم فحص نقاط بناء الجداول: يتم استخدام `.innerText` أو معالجة النصوص بأمان وتجنب تنفيذ شفرات خارجية غير معتمدة.
3. **حماية التعديل المباشر للأرصدة (Stock Balance Protection):**
   - يتم حجب إمكانية تعديل عمود `current_stock` من جهة المتصفح على مستويين:
     - **المستوى الأول:** إلغاء صلاحية UPDATE على عمود `current_stock` لدور `authenticated` في PostgreSQL.
     - **المستوى الثاني:** المحفز الرقابي `trg_prevent_direct_stock_tampering` الذي يرفض أي تعديل للأرصدة ما لم يكن ناتجاً عن إشارة المعاملة الداخلية المعتمدة `alamira.stock_movement_in_progress = '1'`.
4. **أمان استعادة النسخ الاحتياطية (Restore Security):**
   - تم تعطيل الاستعادة المباشرة عبر المتصفح بالكامل، مما يمنع الكتابة العشوائية فوق دفتر الأستاذ أو تدمير سجل الحركات المعصوم.
