-- ==============================================================================
-- AL-AMIRA INVENTORY MANAGEMENT SYSTEM (شركة الأميرة للتوريدات العامة والتجارة)
-- MIGRATION: SIMPLIFIED PRODUCT REGISTRATION & AUDITED OPENING BALANCE
-- File: supabase/migration_opening_balance.sql
-- Description:
--   1. Registers new products with an initial opening quantity in an atomic,
--      audited transaction.
--   2. Enforces database-level zero stock constraint on initial product insertion,
--      then applies positive opening stock strictly through an authorized, audited
--      inventory movement (source: inventory_adjustment / opening balance).
--   3. Distinguishes opening balances from subsequent vendor receipts (no supplier,
--      purchase invoice, or verified acquisition cost required).
--   4. Validates integer vs decimal quantity constraints according to product unit.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: register_product_with_opening_stock
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_product_with_opening_stock(
    p_sku TEXT,
    p_name TEXT,
    p_unit TEXT,
    p_opening_quantity NUMERIC(14, 3) DEFAULT 0.000,
    p_allows_decimal_quantity BOOLEAN DEFAULT false,
    p_category_id UUID DEFAULT NULL,
    p_purchase_price NUMERIC(14, 2) DEFAULT NULL,
    p_selling_price NUMERIC(14, 2) DEFAULT NULL,
    p_min_stock_level NUMERIC(14, 3) DEFAULT 5.000,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_product_id UUID;
    v_clean_sku TEXT;
    v_clean_name TEXT;
    v_clean_unit TEXT;
    v_adj_id UUID;
    v_adj_number TEXT;
    v_seq TEXT;
BEGIN
    -- 1. Authorization check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'غير مصرح لك بتسجيل الأصناف. يجب أن يكون حسابك مسجلاً في قائمة المستخدمين المصرح لهم ونشطاً.';
    END IF;

    -- 2. Validate required inputs
    v_clean_sku := UPPER(TRIM(p_sku));
    v_clean_name := TRIM(p_name);
    v_clean_unit := TRIM(COALESCE(p_unit, 'قطعة'));

    IF v_clean_sku IS NULL OR v_clean_sku = '' THEN
        RAISE EXCEPTION 'كود الصنف (SKU) مطلوب ولا يمكن تركه فارغاً';
    END IF;

    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        RAISE EXCEPTION 'اسم المنتج والبيان مطلوب ولا يمكن تركه فارغاً';
    END IF;

    IF p_opening_quantity IS NULL OR p_opening_quantity < 0 THEN
        RAISE EXCEPTION 'الكمية الحالية / الرصيد الافتتاحي لا يمكن أن تكون سالبة (القيمة المدخلة: %)', p_opening_quantity;
    END IF;

    IF p_purchase_price IS NOT NULL AND p_purchase_price < 0 THEN
        RAISE EXCEPTION 'سعر الشراء لا يمكن أن يكون سالباً (القيمة المدخلة: %)', p_purchase_price;
    END IF;

    IF p_selling_price IS NOT NULL AND p_selling_price < 0 THEN
        RAISE EXCEPTION 'سعر البيع لا يمكن أن يكون سالباً (القيمة المدخلة: %)', p_selling_price;
    END IF;

    IF p_min_stock_level IS NOT NULL AND p_min_stock_level < 0 THEN
        RAISE EXCEPTION 'حد الأمان للمخزون لا يمكن أن يكون سالباً (القيمة المدخلة: %)', p_min_stock_level;
    END IF;

    -- 3. Enforce integer vs decimal rules
    IF NOT p_allows_decimal_quantity THEN
        IF p_opening_quantity <> ROUND(p_opening_quantity, 0) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بوحدات صحيحة فقط ولا يقبل كميات كسرية (الرصيد المدخل: %)', v_clean_name, p_opening_quantity;
        END IF;
        IF p_min_stock_level <> ROUND(p_min_stock_level, 0) THEN
            RAISE EXCEPTION 'حد الأمان للمخزون يجب أن يكون عدداً صحيحاً طالما أن الصنف لا يقبل كسوراً';
        END IF;
    END IF;

    -- 4. Check SKU uniqueness
    IF EXISTS (SELECT 1 FROM public.products WHERE sku = v_clean_sku) THEN
        RAISE EXCEPTION 'كود الصنف (%) مسجل مسبقاً في قاعدة البيانات. يرجى استخدام كود فريد.', v_clean_sku;
    END IF;

    -- 5. Insert product row with 0.00 initial stock (satisfies zero-initial-stock triggers/rules)
    INSERT INTO public.products (
        sku,
        name,
        category_id,
        unit,
        allows_decimal_quantity,
        purchase_price,
        selling_price,
        min_stock_level,
        current_stock,
        description,
        is_active
    ) VALUES (
        v_clean_sku,
        v_clean_name,
        p_category_id,
        v_clean_unit,
        p_allows_decimal_quantity,
        COALESCE(p_purchase_price, 0.00),
        COALESCE(p_selling_price, 0.00),
        COALESCE(p_min_stock_level, 5.000),
        0.000, -- Internally zero
        p_description,
        true
    )
    RETURNING id INTO v_product_id;

    -- 6. If opening stock > 0, register audited inventory adjustment and movement
    IF p_opening_quantity > 0 THEN
        -- Authorize internal stock mutation
        PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

        -- Update product stock to opening quantity
        UPDATE public.products
        SET current_stock = p_opening_quantity,
            updated_at = now()
        WHERE id = v_product_id;

        -- Generate unique opening adjustment number
        v_seq := SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);
        v_adj_number := 'OPN-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || v_seq;

        -- Create adjustment header
        INSERT INTO public.inventory_adjustments (
            adjustment_number,
            adjustment_date,
            reason,
            notes,
            status,
            created_by,
            approved_by,
            approved_at
        ) VALUES (
            v_adj_number,
            CURRENT_DATE,
            'رصيد افتتاحي عند تسجيل الصنف (' || v_clean_sku || ')',
            'إثبات رصيد افتتاحي أولي بموجب الكمية الحالية المدخلة عند تأسيس الصنف',
            'approved',
            v_user_id,
            v_user_id,
            now()
        )
        RETURNING id INTO v_adj_id;

        -- Create adjustment item
        INSERT INTO public.inventory_adjustment_items (
            adjustment_id,
            product_id,
            recorded_quantity,
            actual_quantity,
            difference
        ) VALUES (
            v_adj_id,
            v_product_id,
            0.000,
            p_opening_quantity,
            p_opening_quantity
        );

        -- Record permanent movement in inventory ledger
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
            v_product_id,
            'adjustment',
            'inventory_adjustment',
            v_adj_id,
            v_adj_number,
            p_opening_quantity,
            0.000,
            p_opening_quantity,
            p_purchase_price, -- NULL if not entered, avoiding presenting zero as verified cost
            'رصيد افتتاحي / الكمية الحالية عند إضافة الصنف',
            v_user_id
        );
    END IF;

    -- Return full result
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تسجيل الصنف بنجاح برصيد افتتاحي ' || p_opening_quantity::text || ' ' || v_clean_unit,
        'product_id', v_product_id,
        'sku', v_clean_sku,
        'opening_quantity', p_opening_quantity,
        'unit', v_clean_unit
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. FUNCTION: register_opening_stock (FOR EXISTING PRODUCTS WITH ZERO STOCK & NO MOVEMENTS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_opening_stock(
    p_product_id UUID,
    p_opening_quantity NUMERIC(14, 3),
    p_unit_cost NUMERIC(14, 2) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_product RECORD;
    v_has_movements BOOLEAN;
    v_adj_id UUID;
    v_adj_number TEXT;
    v_seq TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'المستخدم غير مصرح له بتسجيل الأرصدة الافتتاحية';
    END IF;

    IF p_opening_quantity IS NULL OR p_opening_quantity <= 0 THEN
        RAISE EXCEPTION 'الرصيد الافتتاحي يجب أن يكون قيمة موجبة أكبر من الصفر. الصنف مسجل بالفعل برصيد صفر ولا يحتاج لتسجيل رصيد صفري.';
    END IF;

    IF p_unit_cost IS NOT NULL AND p_unit_cost < 0 THEN
        RAISE EXCEPTION 'تكلفة الوحدة لا يمكن أن تكون سالبة';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود';
    END IF;

    IF NOT v_product.is_active THEN
        RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن تسجيل رصيد افتتاحي له. يرجى إعادة تفعيل الصنف أولاً.', v_product.name;
    END IF;

    IF v_product.current_stock <> 0 THEN
        RAISE EXCEPTION 'لا يمكن تسجيل رصيد افتتاحي لصنف لديه رصيد حالي بالفعل (%). يرجى استخدام تسوية الجرد.', v_product.current_stock;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.inventory_movements WHERE product_id = p_product_id
    ) INTO v_has_movements;

    IF v_has_movements THEN
        RAISE EXCEPTION 'الصنف مسجل له حركات سابقة بالفعل. لتعديل الرصيد يرجى استخدام تسوية الجرد الفعلي.';
    END IF;

    IF NOT v_product.allows_decimal_quantity AND (p_opening_quantity <> ROUND(p_opening_quantity, 0)) THEN
        RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية', v_product.name;
    END IF;

    IF p_opening_quantity > 0 THEN
        PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

        UPDATE public.products
        SET current_stock = p_opening_quantity,
            updated_at = now()
        WHERE id = p_product_id;

        v_seq := SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);
        v_adj_number := 'OPN-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || v_seq;

        INSERT INTO public.inventory_adjustments (
            adjustment_number,
            adjustment_date,
            reason,
            notes,
            status,
            created_by,
            approved_by,
            approved_at
        ) VALUES (
            v_adj_number,
            CURRENT_DATE,
            'رصيد افتتاحي للصنف (' || v_product.sku || ')',
            COALESCE(p_notes, 'تسجيل رصيد افتتاحي للصنف'),
            'approved',
            v_user_id,
            v_user_id,
            now()
        )
        RETURNING id INTO v_adj_id;

        INSERT INTO public.inventory_adjustment_items (
            adjustment_id,
            product_id,
            recorded_quantity,
            actual_quantity,
            difference
        ) VALUES (
            v_adj_id,
            p_product_id,
            0.000,
            p_opening_quantity,
            p_opening_quantity
        );

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
            p_product_id,
            'adjustment',
            'inventory_adjustment',
            v_adj_id,
            v_adj_number,
            p_opening_quantity,
            0.000,
            p_opening_quantity,
            p_unit_cost,
            'رصيد افتتاحي / افتتاح المخزن للصنف',
            v_user_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تسجيل الرصيد الافتتاحي بنجاح',
        'product_id', p_product_id,
        'opening_quantity', p_opening_quantity
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSIONS AND GRANTS
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.register_product_with_opening_stock(TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_product_with_opening_stock(TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;

COMMIT;
