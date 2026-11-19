-- ==============================================================================
-- AL-AMIRA ERP V2 — REAL BACKEND INTEGRATION & SERVER-ENFORCED RBAC
-- File: supabase/migration_v2_real_backend.sql
-- Description:
--   1. Extends authorized_users allowlist with roles ('ADMIN' | 'SALES_OPERATOR') and username.
--   2. Adds created_by attribution to customers for Sales Operator ownership.
--   3. Adds payment_terms, cancelled_by, and cancelled_at to sales_invoices.
--   4. Creates persistent, immutable audit_logs table with server-side RLS.
--   5. Enhances approve_sales_invoice and cancel_sales_invoice with role ownership guards.
--   6. Provides secure projections and views for cost-masking and stock-masking.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXTEND authorized_users WITH ROLE & USERNAME
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'authorized_users' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.authorized_users 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'SALES_OPERATOR' CHECK (role IN ('ADMIN', 'SALES_OPERATOR'));

        -- Explicitly preserve full ADMIN privileges for all existing pre-migration authorized users
        UPDATE public.authorized_users SET role = 'ADMIN' WHERE role = 'SALES_OPERATOR';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'authorized_users' AND column_name = 'username'
    ) THEN
        ALTER TABLE public.authorized_users 
        ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- Helper function to retrieve the authenticated caller's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.authorized_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

-- Helper function to check if caller is an active ADMIN
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.authorized_users
        WHERE user_id = auth.uid() AND is_active = true AND role = 'ADMIN'
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. EXTEND customers WITH created_by OWNERSHIP
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.customers 
        ADD COLUMN created_by UUID REFERENCES public.authorized_users(user_id);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. EXTEND sales_invoices WITH PAYMENT TERMS & CANCELLATION METADATA
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales_invoices' AND column_name = 'payment_terms'
    ) THEN
        ALTER TABLE public.sales_invoices 
        ADD COLUMN payment_terms TEXT NOT NULL DEFAULT 'cash' CHECK (payment_terms IN ('cash', 'credit'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales_invoices' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE public.sales_invoices 
        ADD COLUMN cancelled_by UUID REFERENCES public.authorized_users(user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sales_invoices' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE public.sales_invoices 
        ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. CREATE PERSISTENT AUDIT LOGS TABLE & IMMUTABILITY TRIGGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name_or_number TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    performed_by_id UUID REFERENCES auth.users(id),
    performed_by_role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (performed_by_role IN ('ADMIN', 'SALES_OPERATOR')),
    details JSONB,
    reason TEXT,
    outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'denied', 'failure')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);

-- Immutability: ordinary users and callers cannot update or delete audit records
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'سجلات النشاط والرقابة معصومة ومحمية قانونياً ولا يمكن تعديلها أو حذفها نهائياً';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Insertion policy: Any authenticated authorized user can insert audit logs
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_authorized_user());

-- Selection policy: Strictly ADMIN users can view audit logs
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

-- ------------------------------------------------------------------------------
-- 5. SERVER-ENFORCED RBAC IN approve_sales_invoice RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_sales_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv RECORD;
    v_item RECORD;
    v_cur_stock NUMERIC(14, 3);
    v_new_stock NUMERIC(14, 3);
    v_gross_line NUMERIC(14, 2);
    v_item_disc NUMERIC(14, 2);
    v_net_line NUMERIC(14, 2);
    
    v_calc_gross NUMERIC(14, 2) := 0.00;
    v_calc_item_discounts NUMERIC(14, 2) := 0.00;
    v_calc_subtotal NUMERIC(14, 2) := 0.00;
    v_calc_inv_disc NUMERIC(14, 2) := 0.00;
    v_calc_final_total NUMERIC(14, 2) := 0.00;
    v_item_count INTEGER := 0;
    v_user_id UUID;
    v_caller_role TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'المستخدم غير مسجل في قائمة المستخدمين المصرح لهم أو حسابه غير نشط';
    END IF;
    
    -- 1. Lock and check invoice
    SELECT * INTO v_inv
    FROM public.sales_invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'فاتورة المبيعات المطلوبة غير موجودة (ID: %)', p_invoice_id;
    END IF;

    IF v_inv.status = 'approved' THEN
        RAISE EXCEPTION 'فاتورة المبيعات رقم % معتمدة مسبقاً ولا يمكن اعتمادها مرة أخرى', v_inv.invoice_number;
    END IF;

    IF v_inv.status = 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن اعتماد فاتورة مبيعات ملغاة (رقم %)', v_inv.invoice_number;
    END IF;

    -- RBAC Ownership Guard: SALES_OPERATOR can only approve invoices created by themselves
    v_caller_role := public.get_current_user_role();
    IF v_caller_role = 'SALES_OPERATOR' THEN
        IF v_inv.created_by IS NOT NULL AND v_inv.created_by <> v_user_id THEN
            RAISE EXCEPTION 'غير مصرح: يمكن لمسؤول المبيعات اعتماد الفواتير التي أنشأها بنفسه فقط';
        END IF;
    END IF;

    -- Authorize internal stock update
    PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

    -- 2. Recalculate each item and check inventory availability
    FOR v_item IN
        SELECT ii.*, p.name AS current_p_name, p.sku AS current_p_sku, p.unit AS current_p_unit, p.allows_decimal_quantity, p.is_active
        FROM public.sales_invoice_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.invoice_id = p_invoice_id
        ORDER BY ii.product_id, ii.id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن بيعه أو إدراجه في فواتير معتمدة.', v_item.current_p_name;
        END IF;

        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'كمية غير صالحة للبند رقم % (الصنف: %): %', v_item_count, v_item.current_p_name, v_item.quantity;
        END IF;

        IF NOT v_item.allows_decimal_quantity AND (v_item.quantity <> ROUND(v_item.quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المطلوبة بالفاتورة: %)', v_item.current_p_name, v_item.quantity;
        END IF;

        -- Row-level exclusive lock on product
        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_cur_stock < v_item.quantity THEN
            IF v_caller_role = 'ADMIN' THEN
                RAISE EXCEPTION 'رصيد المخزون غير كاف للمنتج "%" لإتمام البيع (المتاح بالمخزن: %، المطلوب بالفاتورة: %)',
                    v_item.current_p_name, v_cur_stock, v_item.quantity;
            ELSE
                RAISE EXCEPTION 'رصيد المخزون غير كاف للمنتج "%" لإتمام البيع (الكمية المطلوبة تتجاوز الرصيد المتاح بالمخزن)',
                    v_item.current_p_name;
            END IF;
        END IF;

        -- Safe line calculation
        v_gross_line := ROUND(v_item.quantity * v_item.unit_price, 2);
        
        IF v_item.discount_type = 'percentage' THEN
            IF v_item.discount_value < 0 OR v_item.discount_value > 100 THEN
                RAISE EXCEPTION 'نسبة خصم البند غير صحيحة (%): يجب أن تكون بين 0 و 100', v_item.discount_value;
            END IF;
            v_item_disc := ROUND((v_gross_line * v_item.discount_value) / 100.0, 2);
        ELSIF v_item.discount_type = 'fixed' THEN
            IF v_item.discount_value < 0 OR v_item.discount_value > v_gross_line THEN
                RAISE EXCEPTION 'قيمة خصم البند الثابتة غير صالحة (%): تتجاوز إجمالي البند (%)', v_item.discount_value, v_gross_line;
            END IF;
            v_item_disc := ROUND(v_item.discount_value, 2);
        ELSE
            v_item_disc := 0.00;
        END IF;

        v_net_line := v_gross_line - v_item_disc;
        IF v_net_line < 0 THEN
            v_net_line := 0.00;
        END IF;

        -- Accumulate
        v_calc_gross := v_calc_gross + v_gross_line;
        v_calc_item_discounts := v_calc_item_discounts + v_item_disc;
        v_calc_subtotal := v_calc_subtotal + v_net_line;

        -- Update line snapshots and exact verified calculations
        UPDATE public.sales_invoice_items
        SET gross_amount = v_gross_line,
            discount_amount = v_item_disc,
            net_amount = v_net_line,
            product_sku_snapshot = v_item.current_p_sku,
            product_name_snapshot = v_item.current_p_name,
            unit_snapshot = v_item.current_p_unit
        WHERE id = v_item.id;

        -- Deduct product stock
        v_new_stock := v_cur_stock - v_item.quantity;
        UPDATE public.products
        SET current_stock = v_new_stock,
            updated_at = now()
        WHERE id = v_item.product_id;

        -- Create immutable movement record
        INSERT INTO public.inventory_movements (
            product_id,
            movement_type,
            source_doc_type,
            source_doc_id,
            source_doc_number,
            quantity_in,
            quantity_out,
            stock_balance_after,
            unit_cost_or_price,
            notes,
            created_by
        ) VALUES (
            v_item.product_id,
            'sale',
            'sales_invoice',
            v_inv.id,
            v_inv.invoice_number,
            0.00,
            v_item.quantity,
            v_new_stock,
            v_item.unit_price,
            'فاتورة مبيعات: ' || COALESCE(v_inv.customer_name_snapshot, 'عميل'),
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن اعتماد فاتورة مبيعات بدون بنود أصناف';
    END IF;

    -- 3. Calculate invoice-level discount on subtotal
    IF v_inv.invoice_discount_type = 'percentage' THEN
        IF v_inv.invoice_discount_value < 0 OR v_inv.invoice_discount_value > 100 THEN
            RAISE EXCEPTION 'نسبة خصم الفاتورة غير صحيحة (%): يجب أن تكون بين 0 و 100', v_inv.invoice_discount_value;
        END IF;
        v_calc_inv_disc := ROUND((v_calc_subtotal * v_inv.invoice_discount_value) / 100.0, 2);
    ELSIF v_inv.invoice_discount_type = 'fixed' THEN
        IF v_inv.invoice_discount_value < 0 OR v_inv.invoice_discount_value > v_calc_subtotal THEN
            RAISE EXCEPTION 'قيمة خصم الفاتورة غير صالحة (%): تتجاوز المجموع الفرعي (%)', v_inv.invoice_discount_value, v_calc_subtotal;
        END IF;
        v_calc_inv_disc := ROUND(v_inv.invoice_discount_value, 2);
    ELSE
        v_calc_inv_disc := 0.00;
    END IF;

    v_calc_final_total := v_calc_subtotal - v_calc_inv_disc + COALESCE(v_inv.additional_charges, 0.00);
    IF v_calc_final_total < 0 THEN
        v_calc_final_total := 0.00;
    END IF;

    -- 4. Update invoice state to approved
    UPDATE public.sales_invoices
    SET gross_amount = v_calc_gross,
        item_discounts_amount = v_calc_item_discounts,
        subtotal = v_calc_subtotal,
        invoice_discount_amount = v_calc_inv_disc,
        final_total = v_calc_final_total,
        status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم اعتماد فاتورة المبيعات بنجاح وخصم الكميات من المخزون',
        'invoice_number', v_inv.invoice_number,
        'gross_amount', v_calc_gross,
        'item_discounts', v_calc_item_discounts,
        'subtotal', v_calc_subtotal,
        'invoice_discount', v_calc_inv_disc,
        'final_total', v_calc_final_total
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. SERVER-ENFORCED RBAC IN cancel_sales_invoice RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_sales_invoice(p_invoice_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv RECORD;
    v_item RECORD;
    v_cur_stock NUMERIC(14, 3);
    v_new_stock NUMERIC(14, 3);
    v_user_id UUID;
    v_caller_role TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'عفواً، صلاحية إلغاء الفواتير المعتمدة مقتصرة فقط على المستخدمين المصرح لهم';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'يجب كتابة سبب الإلغاء لتوثيق الحركة الرقابية في سجل الحركات';
    END IF;

    -- Lock invoice
    SELECT * INTO v_inv
    FROM public.sales_invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'فاتورة المبيعات غير موجودة';
    END IF;

    IF v_inv.status <> 'approved' THEN
        RAISE EXCEPTION 'لا يمكن إلغاء سوى الفواتير المعتمدة فقط (حالة الفاتورة الحالية: %)', v_inv.status;
    END IF;

    -- RBAC Ownership Guard: SALES_OPERATOR can only cancel their own approved invoices
    v_caller_role := public.get_current_user_role();
    IF v_caller_role = 'SALES_OPERATOR' THEN
        IF v_inv.created_by IS NOT NULL AND v_inv.created_by <> v_user_id THEN
            RAISE EXCEPTION 'غير مصرح: يمكن لمسؤول المبيعات إلغاء الفواتير التي أنشأها بنفسه فقط';
        END IF;
    END IF;

    -- Authorize internal stock update
    PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

    -- Return items to stock
    FOR v_item IN
        SELECT ii.*
        FROM public.sales_invoice_items ii
        WHERE ii.invoice_id = p_invoice_id
        ORDER BY ii.product_id, ii.id
    LOOP
        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        v_new_stock := v_cur_stock + v_item.quantity;

        UPDATE public.products
        SET current_stock = v_new_stock,
            updated_at = now()
        WHERE id = v_item.product_id;

        -- Record reversal in immutable movement ledger
        INSERT INTO public.inventory_movements (
            product_id,
            movement_type,
            source_doc_type,
            source_doc_id,
            source_doc_number,
            quantity_in,
            quantity_out,
            stock_balance_after,
            unit_cost_or_price,
            notes,
            created_by
        ) VALUES (
            v_item.product_id,
            'reversal',
            'sales_invoice',
            v_inv.id,
            v_inv.invoice_number,
            v_item.quantity,
            0.00,
            v_new_stock,
            v_item.unit_price,
            'إلغاء فاتورة مبيعات معتمدة. السبب: ' || trim(p_reason),
            v_user_id
        );
    END LOOP;

    -- Update invoice state
    UPDATE public.sales_invoices
    SET status = 'cancelled',
        cancellation_reason = trim(p_reason),
        cancelled_by = v_user_id,
        cancelled_at = now(),
        updated_at = now()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم إلغاء الفاتورة المعتمدة بنجاح وإرجاع البضاعة إلى المخزون',
        'invoice_number', v_inv.invoice_number
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. SECURE COST-MASKED VIEW FOR PRODUCTS (حجب أسعار الشراء عن مشغلي المبيعات)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.products_secure_view 
WITH (security_barrier = true) AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.category_id,
    c.name AS category_name,
    p.unit,
    p.allows_decimal_quantity,
    CASE 
        WHEN public.is_admin_user() THEN p.purchase_price 
        ELSE NULL 
    END AS purchase_price,
    p.selling_price,
    p.min_stock_level,
    CASE 
        WHEN public.is_admin_user() THEN p.current_stock 
        ELSE NULL 
    END AS current_stock,
    CASE 
        WHEN p.current_stock <= 0 THEN 'out_of_stock'
        WHEN p.current_stock <= p.min_stock_level THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status,
    p.description,
    p.is_active,
    p.created_at,
    p.updated_at
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id;

-- ------------------------------------------------------------------------------
-- 8. HARDEN ADMINISTRATIVE RPCs (RESTRICT BACKUP & PRODUCT LIFECYCLE TO ADMIN)
-- ------------------------------------------------------------------------------
-- Secure full backup export: strictly restricted to ADMIN
CREATE OR REPLACE FUNCTION public.export_full_backup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_data JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'تصدير النسخة الاحتياطية الكاملة مقتصر حصرياً على مديري النظام (ADMIN)';
    END IF;

    SELECT jsonb_build_object(
        'system', 'Al Amira Inventory System',
        'company', 'الأميرة للتوريدات العامة والتجارة',
        'schema_version', '2.0.0',
        'exported_at', now(),
        'exported_by', v_user_id,
        'data', jsonb_build_object(
            'categories', (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.categories c),
            'products', (SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM public.products p),
            'customers', (SELECT COALESCE(jsonb_agg(to_jsonb(cu)), '[]'::jsonb) FROM public.customers cu),
            'suppliers', (SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.suppliers s),
            'stock_receipts', (SELECT COALESCE(jsonb_agg(to_jsonb(sr)), '[]'::jsonb) FROM public.stock_receipts sr),
            'stock_receipt_items', (SELECT COALESCE(jsonb_agg(to_jsonb(sri)), '[]'::jsonb) FROM public.stock_receipt_items sri),
            'stock_issues', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM public.stock_issues si),
            'stock_issue_items', (SELECT COALESCE(jsonb_agg(to_jsonb(sii)), '[]'::jsonb) FROM public.stock_issue_items sii),
            'sales_invoices', (SELECT COALESCE(jsonb_agg(to_jsonb(inv)), '[]'::jsonb) FROM public.sales_invoices inv),
            'sales_invoice_items', (SELECT COALESCE(jsonb_agg(to_jsonb(invi)), '[]'::jsonb) FROM public.sales_invoice_items invi),
            'inventory_adjustments', (SELECT COALESCE(jsonb_agg(to_jsonb(ia)), '[]'::jsonb) FROM public.inventory_adjustments ia),
            'inventory_adjustment_items', (SELECT COALESCE(jsonb_agg(to_jsonb(iai)), '[]'::jsonb) FROM public.inventory_adjustment_items iai),
            'inventory_movements', (SELECT COALESCE(jsonb_agg(to_jsonb(im)), '[]'::jsonb) FROM public.inventory_movements im),
            'application_settings', (SELECT COALESCE(jsonb_agg(to_jsonb(aps)), '[]'::jsonb) FROM public.application_settings aps),
            'authorized_users', (
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'user_id', au.user_id,
                            'email', au.email,
                            'full_name', au.full_name,
                            'role', au.role,
                            'is_active', au.is_active,
                            'created_at', au.created_at
                        )
                    ),
                    '[]'::jsonb
                )
                FROM public.authorized_users au
            ),
            'audit_logs', (SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb) FROM public.audit_logs al)
        )
    ) INTO v_data;

    RETURN v_data;
END;
$$;

-- Secure delete_product: strictly restricted to ADMIN
CREATE OR REPLACE FUNCTION public.delete_product(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_product RECORD;
    v_has_invoices BOOLEAN;
    v_has_receipts BOOLEAN;
    v_has_issues BOOLEAN;
    v_has_adjustments BOOLEAN;
    v_has_movements BOOLEAN;
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'غير مصرح: حذف الأصناف مقتصر حصرياً على مديري النظام (ADMIN)';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب حذفه غير موجود أو تم حذفه مسبقاً.';
    END IF;

    IF v_product.current_stock IS NOT NULL AND v_product.current_stock <> 0 THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" (كود: %) لوجود رصيد مخزون حالي (% %). يرجى تصفية الرصيد أو إيقاف الصنف بدلاً من الحذف.',
            v_product.name, v_product.sku, v_product.current_stock, v_product.unit;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.sales_invoice_items WHERE product_id = p_product_id) INTO v_has_invoices;
    IF v_has_invoices THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" نهائياً لوجود فواتير مبيعات سابقة أو مسودات مرتبطة به. يرجى إيقاف/أرشفة الصنف للحفاظ على سلامة السجلات المالية والضريبية.',
            v_product.name;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.stock_receipt_items WHERE product_id = p_product_id) INTO v_has_receipts;
    IF v_has_receipts THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون إضافة وتوريد بضاعة مسجلة له بالمخزن. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.stock_issue_items WHERE product_id = p_product_id) INTO v_has_issues;
    IF v_has_issues THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون صرف بضاعة مسجلة له بالمخزن. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.inventory_adjustment_items WHERE product_id = p_product_id) INTO v_has_adjustments;
    IF v_has_adjustments THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود تسويات جرد مسجلة له بالمخزن. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.inventory_movements WHERE product_id = p_product_id) INTO v_has_movements;
    IF v_has_movements THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود حركات مخزنية تاريخية موثقة في سجل الحركات. يرجى إيقاف/أرشفة الصنف بدلاً من الحذف لضمان سلامة التدقيق المخزني.',
            v_product.name;
    END IF;

    DELETE FROM public.products WHERE id = p_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم حذف الصنف بنجاح نظراً لعدم وجود أي ارتباطات مالية أو مخزنية سابقة له'
    );
END;
$$;

-- Secure set_product_active_status: strictly restricted to ADMIN
CREATE OR REPLACE FUNCTION public.set_product_active_status(
    p_product_id UUID,
    p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_product RECORD;
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'غير مصرح: تغيير حالة تفعيل/أرشفة الأصناف مقتصر حصرياً على مديري النظام (ADMIN)';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود.';
    END IF;

    UPDATE public.products
    SET is_active = p_is_active,
        updated_at = now()
    WHERE id = p_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN p_is_active THEN 'تم تفعيل الصنف بنجاح' ELSE 'تم إيقاف/أرشفة الصنف بنجاح' END,
        'is_active', p_is_active
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. SECURITY HARDENING: COLUMN-LEVEL PRIVILEGES & STRICT RPC GRANTS
-- ------------------------------------------------------------------------------
-- Revoke direct column SELECT on sensitive product columns from regular authenticated users
-- Ensures SALES_OPERATOR cannot bypass view masking by querying products table directly
REVOKE SELECT (purchase_price, current_stock) ON public.products FROM authenticated, anon, PUBLIC;

-- Grant secure view projection to authenticated users
GRANT SELECT ON public.products_secure_view TO authenticated;

-- Restrict sensitive warehouse & supplier tables to ADMIN only (Prevent cost/stock leaks to SALES_OPERATOR)
DROP POLICY IF EXISTS "movements_select" ON public.inventory_movements;
CREATE POLICY "movements_select" ON public.inventory_movements
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "receipts_select" ON public.stock_receipts;
CREATE POLICY "receipts_select" ON public.stock_receipts
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "receipt_items_select" ON public.stock_receipt_items;
CREATE POLICY "receipt_items_select" ON public.stock_receipt_items
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "issues_select" ON public.stock_issues;
CREATE POLICY "issues_select" ON public.stock_issues
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "issue_items_select" ON public.stock_issue_items;
CREATE POLICY "issue_items_select" ON public.stock_issue_items
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "adjustments_select" ON public.inventory_adjustments;
CREATE POLICY "adjustments_select" ON public.inventory_adjustments
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

DROP POLICY IF EXISTS "adjustment_items_select" ON public.inventory_adjustment_items;
CREATE POLICY "adjustment_items_select" ON public.inventory_adjustment_items
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

-- Authorized users management: only active ADMIN can modify allowlist
DROP POLICY IF EXISTS "auth_users_admin_write" ON public.authorized_users;
CREATE POLICY "auth_users_admin_write" ON public.authorized_users
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());
GRANT SELECT, INSERT, UPDATE ON TABLE public.authorized_users TO authenticated;

-- Audit logs permissions: Select restricted to ADMIN via RLS policy; insert allowed for audit logging
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- Strict RPC grants: only authenticated users can execute business RPCs
REVOKE ALL ON FUNCTION public.approve_sales_invoice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.export_full_backup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_full_backup() TO authenticated;

REVOKE ALL ON FUNCTION public.delete_product(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

COMMIT;
