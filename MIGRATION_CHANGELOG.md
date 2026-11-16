# AL-AMIRA — DATABASE MIGRATION CHANGELOG
## سجل التغييرات التقنية لملفات ترقية قاعدة البيانات

**تاريخ الإصدار:** 16 نوفمبر 2026  
**المشروع:** نظام شركة الأميرة لإدارة المبيعات والمخزون  
**المجلد:** `supabase/`

---

## 1. `supabase/migration_decimal_quantities.sql`

| المنطقة البرمجية | نص التعديل أو طبيعة التغيير | السبب التقني والرقابي |
|---|---|---|
| **القسم 2 (ترقية الدقة)** | إضافة `DROP POLICY IF EXISTS "products_insert" ON public.products;` قبل تعديل نوع عمود `current_stock`، ثم إعادة إنشائها فوراً بعده. | محرك PostgreSQL يمنع تغيير نوع عمود تعتمد عليه سياسة RLS بنص الخطأ `0A000: cannot alter type of a column used in a policy definition`. |
| **القسم 2 (جدول الجرد)** | استبدال تعديل الأعمدة الملغاة `system_stock` و `physical_stock` بكتلة `DO` آمنة تعيد تسميتها إلى `recorded_quantity` و `actual_quantity` إن وجدت، وترقي دقتها إلى `NUMERIC(14, 3)`. | إزالة كافة الإشارات القديمة للأعمدة غير المتطابقة مع المخطط المعتمد `schema.sql`. |
| **القسم 4 (`approve_stock_receipt`)** | 1. تعريف المتغير `v_cur_stock NUMERIC(14, 3);`.<br/>2. إلزام حلقة الاستعلام بفرز الأصناف: `ORDER BY ri.product_id, ri.id`.<br/>3. حذف `p.current_stock` من استعلام الـ Cursor الأولي.<br/>4. جلب أحدث رصيد بعد قفل الصف حصرياً: `SELECT current_stock INTO v_cur_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;`.<br/>5. حساب الرصيد الجديد بناءً على القيمة المحجوزة: `v_new_stock := v_cur_stock + v_item.quantity;`. | منع ركود الرصيد (Stale Read) وضمان صحة الحساب عند تكرار نفس الصنف في أكثر من بند داخل نفس إذن الإضافة، ومنع حالات التعليق (Deadlocks). |
| **القسم 4 (`approve_stock_receipt`)** | تعديل اسم عمود التكلفة في `inventory_movements` من `unit_cost` إلى `unit_cost_or_price`. | توحيد الإدراج مع المسمى المعتمد في جدول حركات المخزون. |
| **القسم 5 (`approve_stock_issue`)** | إضافة `ORDER BY ii.product_id, ii.id` لحلقة استعلام البنود، وتمرير `0.00` في عمود `unit_cost_or_price`. | ضمان اتساق تسلسل حجز الأقفال وتفادي أخطاء الأعمدة غير المعرفة. |
| **القسم 6 (`approve_sales_invoice`)** | 1. إضافة `ORDER BY ii.product_id, ii.id` لحلقة البنود.<br/>2. تعديل اسم العمود في حركات المخزون من `unit_price` إلى `unit_cost_or_price`. | ضمان حجز الأقفال بتسلسل موحد، وتوثيق سعر البيع في العمود الصحيح. |
| **القسم 7 (`cancel_sales_invoice`)** | 1. تعديل نوع الحركة من `invoice_cancellation` إلى `reversal`.<br/>2. إضافة `ORDER BY ii.product_id, ii.id`.<br/>3. توثيق السعر في `unit_cost_or_price`. | التوافق مع قيد `CHECK (movement_type IN ('receipt', 'issue', 'sale', 'adjustment', 'reversal'))`. |
| **القسم 8 (`approve_stock_adjustment`)** | 1. اعتماد `actual_quantity` و `recorded_quantity` و `difference`.<br/>2. إضافة `ORDER BY ai.product_id, ai.id`.<br/>3. تمرير `0.00` في `unit_cost_or_price`. | مطابقة الأعمدة المعتمدة وحجز الأقفال بتسلسل موحد. |
| **القسم 9 (الصلاحيات)** | سحب الصلاحيات صراحة من `PUBLIC, anon` ومنحها حصراً لـ `authenticated` للدوال المعدلة. | تطبيق مبدأ الصلاحيات الأقل والأمان الصفري (Zero-Trust). |

---

## 2. `supabase/migration_product_lifecycle.sql`

| المنطقة البرمجية | نص التعديل أو طبيعة التغيير | السبب التقني والرقابي |
|---|---|---|
| **القسم 0 (البنية)** | إضافة `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`. | ضمان وجود الحقل حتى لو تم تنفيذ الملف في بيئة جديدة أو تجريبية. |
| **القسم 1 (`delete_product`)** | التحقق الدقيق من: عدم وجود رصيد، عدم وجود فواتير مبيعات، عدم وجود أذون إضافة، عدم وجود أذون صرف، عدم وجود تسويات جرد، وعدم وجود حركات مخزنية. | منع حذف أي صنف له أي ارتباط مالي أو محاسبي لحفظ السجلات القانونية والضريبية. |
| **القسم 2 (`set_product_active_status`)** | تمكين أرشفة الصنف وإلغاء تفعيله أو إعادة تفعيله دون المساس برصيده المخزني أو حركاته. | بديل تشغيلي آمن للأصناف التي لا يمكن حذفها لوجود سجلات تاريخية لها. |
| **القسم 3 (المشغل الرقابي)** | إنشاء المشغل `trg_prevent_direct_product_deletion` على جدول `products` قبل الحذف `BEFORE DELETE` لمنع حذف أي صنف له رصيد أو حركات مباشرة من SQL. | إغلاق ثغرة الحذف المباشر (Bypass Prevention) حتى لو امتلك المتصل صلاحيات حذف عامة. |
| **القسم 4 (الصلاحيات)** | سحب الصلاحيات صراحة من `PUBLIC, anon` ومنحها حصراً لـ `authenticated` لدالتي الحذف والأرشفة. | حماية استدعاء الدوال الحساسة. |

---

## 3. `supabase/migration_opening_balance.sql`

| المنطقة البرمجية | نص التعديل أو طبيعة التغيير | السبب التقني والرقابي |
|---|---|---|
| **القسم 1 (`register_product_with_opening_stock`)** | 1. إضافة قيود فحص عدم سلبية الأسعار: `p_purchase_price < 0`, `p_selling_price < 0`, `p_min_stock_level < 0`.<br/>2. التحقق من كود الصنف SKU وعدم تكراره.<br/>3. التحقق من صحة الكسور العشرية وفق وحدة الصنف.<br/>4. إدراج الصنف برصيد 0.000 ثم تحديث الرصيد وقيد التسوية والحركة في معاملة ذرية واحدة. | ضمان الذرية (Atomic Registration) والتراجع الكامل عند الخطأ، والتوافق مع مشغلات منع الرصيد الابتدائي غير الموثق. |
| **القسم 2 (`register_opening_stock`)** | 1. إلزام الكمية الافتتاحية بأن تكون موجبة صراحة `> 0`، ورفض الرصيد الصفري أو السالب.<br/>2. التحقق من عدم وجود رصيد قائم أو حركات مسجلة مسبقاً للصنف.<br/>3. التحقق من أن الصنف نشط `is_active = true`. | منع تسجيل الرصيد الافتتاحي أكثر من مرة لنفس الصنف (Once-Only Rule). |
| **القسم 3 (الصلاحيات)** | سحب الصلاحيات من `PUBLIC, anon` ومنحها حصراً لـ `authenticated`. | تأمين تسجيل الأرصدة الافتتاحية. |

---

## 4. `supabase/migration_fix_permissions_and_ddl.sql`

| المنطقة البرمجية | نص التعديل أو طبيعة التغيير | السبب التقني والرقابي |
|---|---|---|
| **القسم 1 (صلاحيات الدوال)** | استبدال أمر السحب الشامل `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public` بسحب موجه لدوال التطبيق فقط عبر كتلة `DO`. | السحب الشامل كان يعطل دوال الامتدادات العامة مثل `gen_random_uuid()` من مخطط `public`. |
| **القسم 2 (صلاحيات الأعمدة DAC)** | 1. تنفيذ سحب ديناميكي شامل لكافة صلاحيات الأعمدة السابقة على `public.products` عبر حلقة تكرارية على `information_schema.columns`.<br/>2. سحب صريح لعمودي `is_active` و `current_stock` من `PUBLIC, anon, authenticated`.<br/>3. إعادة منح التحديث حصراً على الحقول الوصفية التسعة المعتمدة.<br/>4. سحب صلاحية `DELETE ON public.products` من دور `authenticated`. | منع بقاء أي صلاحية عمود ممنوحة مسبقاً في `pg_attribute.attacl` (خاصة `is_active` التي كانت ممنوحة في خط الأساس الإنتاجي)، وإلزام حصر الأرشفة والحذف في الدوال الموثقة. |
| **القسم 3 (مشغل حماية الرصيد)** | ترقية `prevent_direct_stock_tampering` للتحقق من أن جلسة العميل المباشرة لا تستطيع تجاوز المشغل عبر ضبط متغير الحالة `alamira.stock_movement_in_progress` محلياً. | تفكيك الاعتماد على GUC منفرداً وضمان تشغيل التعديل الرصيدي حصراً عبر دوال `SECURITY DEFINER`. |
| **القسم 4 (صلاحيات الجداول والأعمدة)** | 1. حظر التعديل والحذف على جدول حركات المخزون `inventory_movements` وجدول المستخدمين المصرح لهم `authorized_users`.<br/>2. تطهير ديناميكي لأي صلاحيات أعمدة متبقية على هذين الجدولين. | الحفاظ على عصمة سجل الحركات ومنع تصعيد الصلاحيات. |
| **القسم 5 (فهارس الأداء)** | استخدام `CREATE INDEX IF NOT EXISTS` بدلاً من `CONCURRENTLY` لجميع فهارس الأعمدة الجديدة. | أوامر `CONCURRENTLY` محظورة داخل المعاملات المفتوحة `BEGIN ... COMMIT` في PostgreSQL وتتسبب في فشل الترقية. |

---

## 5. مواءمة الملفات التأسيسية ومنع التعارض المرجعي
تم تعديل ملفات المخطط المرجعي لإزالة أي إشارات متعارضة قد تعيد منح هذه الصلاحيات مستقبلاً:
1. `supabase/schema.sql`: إزالة `is_active` من قائمة `GRANT UPDATE` على `products`، واستبدال `GRANT DELETE` بـ `REVOKE DELETE`.
2. `supabase/rls.sql`: إزالة `is_active` من قائمة `GRANT UPDATE` على `products`، واستبدال `GRANT DELETE` بـ `REVOKE DELETE`.
3. `supabase/combined_setup.sql`: إزالة `is_active` و `DELETE` على `products` في الموضعين (الجدول والسياسات).
