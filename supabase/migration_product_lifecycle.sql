-- ==============================================================================
-- AL-AMIRA INVENTORY MANAGEMENT SYSTEM
-- MIGRATION: SECURE PRODUCT LIFECYCLE MANAGEMENT (DELETION & ARCHIVING)
-- Description:
-- 1. Adds secure RPC `delete_product` that enforces zero stock and zero transaction
--    history across all child tables before permanent deletion.
-- 2. Adds secure RPC `set_product_active_status` to safely archive or reactivate
--    products while preserving all inventory balances and accounting audit history.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. SCHEMA PREREQUISITE: ENSURE is_active COLUMN EXISTS ON PRODUCTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.is_active IS 
'حالة تفعيل الصنف: true = نشط ومتاح للعمليات التجارية، false = موقوف/مؤرشف لحفظ السجلات المحاسبية والرقابية';

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: delete_product
-- Permanently deletes a product ONLY if it has zero stock and no related records
-- in sales invoices, stock receipts, stock issues, adjustments, or movements.
-- ------------------------------------------------------------------------------
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
    -- 1. Authorization check
    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'غير مصرح لك بتنفيذ هذه العملية. يرجى تسجيل الدخول بحساب مصرح له.';
    END IF;

    -- 2. Lock product row and verify existence
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب حذفه غير موجود أو تم حذفه مسبقاً.';
    END IF;

    -- 3. Verify current stock balance is zero
    IF v_product.current_stock IS NOT NULL AND v_product.current_stock <> 0 THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" (كود: %) لوجود رصيد مخزون حالي (% %). يرجى تصفية الرصيد أو إيقاف الصنف بدلاً من الحذف.',
            v_product.name, v_product.sku, v_product.current_stock, v_product.unit;
    END IF;

    -- 4. Check for related sales invoices (including drafts)
    SELECT EXISTS (
        SELECT 1 FROM public.sales_invoice_items WHERE product_id = p_product_id
    ) INTO v_has_invoices;

    IF v_has_invoices THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" نهائياً لوجود فواتير مبيعات سابقة أو مسودات مرتبطة به. يرجى إيقاف/أرشفة الصنف للحفاظ على سلامة السجلات المالية والضريبية.',
            v_product.name;
    END IF;

    -- 5. Check for related stock receipts
    SELECT EXISTS (
        SELECT 1 FROM public.stock_receipt_items WHERE product_id = p_product_id
    ) INTO v_has_receipts;

    IF v_has_receipts THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون إضافة وتوريد بضاعة مسجلة له بالمخزن. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    -- 6. Check for related stock issues
    SELECT EXISTS (
        SELECT 1 FROM public.stock_issue_items WHERE product_id = p_product_id
    ) INTO v_has_issues;

    IF v_has_issues THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون صرف مخزني مسجلة له. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    -- 7. Check for related inventory adjustments
    SELECT EXISTS (
        SELECT 1 FROM public.inventory_adjustment_items WHERE product_id = p_product_id
    ) INTO v_has_adjustments;

    IF v_has_adjustments THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود تسويات جرد مرتبطة به. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    -- 8. Check for audit trail movements
    SELECT EXISTS (
        SELECT 1 FROM public.inventory_movements WHERE product_id = p_product_id
    ) INTO v_has_movements;

    IF v_has_movements THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود حركات مسجلة له في سجل الرقابة والتدقيق المخزني المعصوم. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    -- 9. Authoritative Permanent Deletion
    DELETE FROM public.products WHERE id = p_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_product_id', p_product_id,
        'sku', v_product.sku,
        'name', v_product.name,
        'message', 'تم حذف الصنف نهائياً بنجاح.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. FUNCTION: set_product_active_status
-- Safely archives or reactivates a product without modifying any stock balances
-- or altering historical business records.
-- ------------------------------------------------------------------------------
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
    -- 1. Authorization check
    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'غير مصرح لك بتنفيذ هذه العملية. يرجى تسجيل الدخول بحساب مصرح له.';
    END IF;

    -- 2. Verify existence and lock row
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود.';
    END IF;

    -- 3. Update status
    UPDATE public.products
    SET is_active = p_is_active,
        updated_at = now()
    WHERE id = p_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'sku', v_product.sku,
        'name', v_product.name,
        'is_active', p_is_active,
        'current_stock', v_product.current_stock,
        'unit', v_product.unit,
        'message', CASE 
            WHEN p_is_active THEN 'تمت إعادة تفعيل الصنف بنجاح وإتاحته للعمليات التجارية.'
            ELSE 'تم إيقاف/أرشفة الصنف بنجاح مع الحفاظ على رصيده وسجلاته التاريخية.'
        END
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER: ENFORCE NON-BYPASSABLE ZERO-STOCK & ZERO-TRANSACTION PRODUCT DELETION
-- Protects against direct SQL DELETE operations bypassing delete_product rules.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_direct_product_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.current_stock IS NOT NULL AND OLD.current_stock <> 0 THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود رصيد مخزني حالي (%). يرجى تصفية الرصيد أو إيقاف الصنف.', OLD.name, OLD.current_stock;
    END IF;

    IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE product_id = OLD.id) THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود حركات مسجلة له في سجل التدقيق المخزني المعصوم.', OLD.name;
    END IF;

    IF EXISTS (SELECT 1 FROM public.sales_invoice_items WHERE product_id = OLD.id) THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود فواتير مبيعات مرتبطة به.', OLD.name;
    END IF;

    IF EXISTS (SELECT 1 FROM public.stock_receipt_items WHERE product_id = OLD.id) THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون إضافة وتوريد مرتبطة به.', OLD.name;
    END IF;

    IF EXISTS (SELECT 1 FROM public.stock_issue_items WHERE product_id = OLD.id) THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون صرف مرتبطة به.', OLD.name;
    END IF;

    IF EXISTS (SELECT 1 FROM public.inventory_adjustment_items WHERE product_id = OLD.id) THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود تسويات جرد مرتبطة به.', OLD.name;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_direct_product_deletion ON public.products;
CREATE TRIGGER trg_prevent_direct_product_deletion
BEFORE DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_product_deletion();

-- ------------------------------------------------------------------------------
-- 4. PERMISSIONS: REVOKE FROM PUBLIC/ANON AND GRANT TO AUTHENTICATED
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.delete_product(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;

COMMIT;
