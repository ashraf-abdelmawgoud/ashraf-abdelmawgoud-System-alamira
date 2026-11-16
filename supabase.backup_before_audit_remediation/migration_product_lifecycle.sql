-- ==============================================================================
-- AL-AMIRA INVENTORY MANAGEMENT SYSTEM
-- MIGRATION: SECURE PRODUCT LIFECYCLE MANAGEMENT (DELETION & ARCHIVING)
-- Description:
-- 1. Adds secure RPC `delete_product` that enforces zero stock and zero transaction
--    history across all child tables before permanent deletion.
-- 2. Adds secure RPC `set_product_active_status` to safely archive or reactivate
--    products while preserving all inventory balances and accounting audit history.
-- ==============================================================================

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
-- 3. PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;
