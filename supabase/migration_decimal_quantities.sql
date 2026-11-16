-- ==============================================================================
-- AL AMIRA INVENTORY & INVOICING SYSTEM (شركة الأميرة للتوريدات العامة والتجارة)
-- NON-DESTRUCTIVE DATABASE MIGRATION: FRACTIONAL / DECIMAL QUANTITY SUPPORT
-- File: supabase/migration_decimal_quantities.sql
-- Description:
--   1. Adds allows_decimal_quantity (BOOLEAN DEFAULT false) to public.products.
--   2. Expands quantity precision from NUMERIC(12, 2) to NUMERIC(14, 3) across
--      products, sales invoice items, stock receipts, stock issues, adjustments,
--      and inventory movements (supporting up to 3 decimal places: e.g. 0.250, 1.500, 12.125).
--   3. Enforces integer-only quantities for products where allows_decimal_quantity is false.
--   4. Updates approval RPC functions to handle NUMERIC(14, 3) and validate integer rules.
--
-- Safety Notice:
--   This migration is non-destructive and preserves all existing rows, stock balances,
--   and historical movement logs. Run this script in the Supabase SQL Editor.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADD DECIMAL QUANTITY FLAG TO PRODUCTS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS allows_decimal_quantity BOOLEAN NOT NULL DEFAULT false;

-- Add comment for schema documentation
COMMENT ON COLUMN public.products.allows_decimal_quantity IS 
'يحدد ما إذا كان الصنف يقبل كميات كسرية/عشرية (مثل الأمتار والأوزان: 1.5، 0.25) أم يباع بوحدات صحيحة فقط (قطع، علب، كراتين)';

-- ------------------------------------------------------------------------------
-- 2. UPGRADE QUANTITY PRECISION ACROSS ALL TABLES TO NUMERIC(14, 3)
-- ------------------------------------------------------------------------------

-- In PostgreSQL, altering a column type referenced in an RLS policy requires dropping the policy first.
DROP POLICY IF EXISTS "products_insert" ON public.products;

-- Products Table
ALTER TABLE public.products 
ALTER COLUMN min_stock_level TYPE NUMERIC(14, 3),
ALTER COLUMN current_stock TYPE NUMERIC(14, 3);

-- Recreate products_insert policy with updated precision reference
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (
    public.is_authorized_user() AND (current_stock = 0.000 OR current_stock IS NULL)
);

-- Stock Receipt Items
ALTER TABLE public.stock_receipt_items 
ALTER COLUMN quantity TYPE NUMERIC(14, 3);

-- Stock Issue Items
ALTER TABLE public.stock_issue_items 
ALTER COLUMN quantity TYPE NUMERIC(14, 3);

-- Sales Invoice Items
ALTER TABLE public.sales_invoice_items 
ALTER COLUMN quantity TYPE NUMERIC(14, 3);

-- Inventory Adjustment Items: safely support either legacy or canonical column names
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory_adjustment_items' AND column_name = 'system_stock'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory_adjustment_items' AND column_name = 'recorded_quantity'
    ) THEN
        ALTER TABLE public.inventory_adjustment_items RENAME COLUMN system_stock TO recorded_quantity;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory_adjustment_items' AND column_name = 'physical_stock'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory_adjustment_items' AND column_name = 'actual_quantity'
    ) THEN
        ALTER TABLE public.inventory_adjustment_items RENAME COLUMN physical_stock TO actual_quantity;
    END IF;
END $$;

ALTER TABLE public.inventory_adjustment_items 
ALTER COLUMN recorded_quantity TYPE NUMERIC(14, 3),
ALTER COLUMN actual_quantity TYPE NUMERIC(14, 3),
ALTER COLUMN difference TYPE NUMERIC(14, 3);

-- Inventory Movements Table
ALTER TABLE public.inventory_movements 
ALTER COLUMN quantity_in TYPE NUMERIC(14, 3),
ALTER COLUMN quantity_out TYPE NUMERIC(14, 3),
ALTER COLUMN stock_balance_after TYPE NUMERIC(14, 3);

-- ------------------------------------------------------------------------------
-- 3. CHECK CONSTRAINT: PREVENT FRACTIONAL STOCK IF DECIMAL NOT ALLOWED
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_products_integer_stock_if_not_decimal'
    ) THEN
        ALTER TABLE public.products
        ADD CONSTRAINT chk_products_integer_stock_if_not_decimal
        CHECK (
            allows_decimal_quantity = true 
            OR (
                min_stock_level = ROUND(min_stock_level, 0) 
                AND current_stock = ROUND(current_stock, 0)
            )
        );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. UPDATE RPC FUNCTION: approve_stock_receipt WITH DECIMAL VALIDATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_stock_receipt(p_receipt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_receipt RECORD;
    v_item RECORD;
    v_cur_stock NUMERIC(14, 3);
    v_new_stock NUMERIC(14, 3);
    v_calculated_total NUMERIC(14, 2) := 0.00;
    v_user_id UUID;
    v_item_count INTEGER := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'المستخدم غير مسجل في قائمة المستخدمين المصرح لهم أو حسابه غير نشط';
    END IF;
    
    -- 1. Lock and verify receipt
    SELECT * INTO v_receipt
    FROM public.stock_receipts
    WHERE id = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'إذن الإضافة المطلوب غير موجود (ID: %)', p_receipt_id;
    END IF;

    IF v_receipt.status = 'approved' THEN
        RAISE EXCEPTION 'إذن الإضافة رقم % معتمد مسبقاً ولا يمكن اعتماده مرة أخرى', v_receipt.receipt_number;
    END IF;

    IF v_receipt.status = 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن اعتماد إذن إضافة ملغى (رقم %)', v_receipt.receipt_number;
    END IF;

    -- Authorize internal stock update
    PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

    -- 2. Process items atomically in consistent product order (prevents deadlocks)
    FOR v_item IN
        SELECT ri.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.stock_receipt_items ri
        JOIN public.products p ON p.id = ri.product_id
        WHERE ri.receipt_id = p_receipt_id
        ORDER BY ri.product_id, ri.id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن استلام بضاعة جديدة له. يرجى تفعيل الصنف أولاً.', v_item.product_name;
        END IF;

        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'كمية غير صالحة للصنف "%" في إذن الإضافة: %', v_item.product_name, v_item.quantity;
        END IF;

        -- Enforce integer quantities if decimal is not allowed for product
        IF NOT v_item.allows_decimal_quantity AND (v_item.quantity <> ROUND(v_item.quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المدخلة: %)', v_item.product_name, v_item.quantity;
        END IF;

        -- Row-level exclusive lock on product: always read the latest committed stock under lock
        -- This guarantees correct calculations even if the same product appears multiple times in the document
        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        -- Safe line calculation
        v_calculated_total := v_calculated_total + ROUND(v_item.quantity * v_item.unit_price, 2);

        -- Update line total in items
        UPDATE public.stock_receipt_items
        SET line_total = ROUND(v_item.quantity * v_item.unit_price, 2)
        WHERE id = v_item.id;

        -- Increment stock based on locked latest value
        v_new_stock := v_cur_stock + v_item.quantity;
        UPDATE public.products
        SET current_stock = v_new_stock,
            updated_at = now()
        WHERE id = v_item.product_id;

        -- Record immutable inventory movement
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
            'receipt',
            'stock_receipt',
            v_receipt.id,
            v_receipt.receipt_number,
            v_item.quantity,
            0.000,
            v_new_stock,
            v_item.unit_price,
            COALESCE(v_receipt.notes, 'إذن إضافة مخزنية معتمد'),
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن اعتماد إذن إضافة لا يحتوي على أي بنود أصناف';
    END IF;

    -- 3. Update receipt status and total
    UPDATE public.stock_receipts
    SET status = 'approved',
        total_amount = v_calculated_total,
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_receipt_id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', p_receipt_id,
        'receipt_number', v_receipt.receipt_number,
        'total_amount', v_calculated_total,
        'items_count', v_item_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. UPDATE RPC FUNCTION: approve_stock_issue WITH DECIMAL VALIDATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_stock_issue(p_issue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_issue RECORD;
    v_item RECORD;
    v_cur_stock NUMERIC(14, 3);
    v_new_stock NUMERIC(14, 3);
    v_user_id UUID;
    v_item_count INTEGER := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'المستخدم غير مسجل في قائمة المستخدمين المصرح لهم أو حسابه غير نشط';
    END IF;

    SELECT * INTO v_issue
    FROM public.stock_issues
    WHERE id = p_issue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'إذن الصرف غير موجود';
    END IF;

    IF v_issue.status = 'approved' THEN
        RAISE EXCEPTION 'إذن الصرف رقم % معتمد مسبقاً', v_issue.issue_number;
    END IF;

    IF v_issue.status = 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن اعتماد إذن صرف ملغى';
    END IF;

    -- Authorize internal stock update
    PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

    FOR v_item IN
        SELECT ii.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.stock_issue_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.issue_id = p_issue_id
        ORDER BY ii.product_id, ii.id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن صرف بضاعة له من المخزن.', v_item.product_name;
        END IF;

        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'كمية غير صالحة للصنف "%": %', v_item.product_name, v_item.quantity;
        END IF;

        -- Enforce integer quantities if decimal is not allowed
        IF NOT v_item.allows_decimal_quantity AND (v_item.quantity <> ROUND(v_item.quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المنصرفة: %)', v_item.product_name, v_item.quantity;
        END IF;

        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_cur_stock < v_item.quantity THEN
            RAISE EXCEPTION 'رصيد غير كاف في المخزن للصنف "%" (المتاح: %، المطلوب صرفه: %)',
                v_item.product_name, v_cur_stock, v_item.quantity;
        END IF;

        v_new_stock := v_cur_stock - v_item.quantity;

        UPDATE public.products
        SET current_stock = v_new_stock,
            updated_at = now()
        WHERE id = v_item.product_id;

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
            'issue',
            'stock_issue',
            v_issue.id,
            v_issue.issue_number,
            0.000,
            v_item.quantity,
            v_new_stock,
            0.00,
            COALESCE(v_issue.reason, 'إذن صرف مخزني معتمد'),
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'إذن الصرف لا يحتوي على أي أصناف';
    END IF;

    UPDATE public.stock_issues
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_issue_id;

    RETURN jsonb_build_object(
        'success', true,
        'issue_id', p_issue_id,
        'issue_number', v_issue.issue_number
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. UPDATE RPC FUNCTION: approve_sales_invoice WITH DECIMAL VALIDATION
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

        -- Enforce integer quantities if decimal is not allowed
        IF NOT v_item.allows_decimal_quantity AND (v_item.quantity <> ROUND(v_item.quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المطلوبة بالفاتورة: %)', v_item.current_p_name, v_item.quantity;
        END IF;

        -- Row-level exclusive lock on product
        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_cur_stock < v_item.quantity THEN
            RAISE EXCEPTION 'رصيد المخزون غير كاف للمنتج "%" لإتمام البيع (المتاح بالمخزن: %، المطلوب بالفاتورة: %)',
                v_item.current_p_name, v_cur_stock, v_item.quantity;
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
            0.000,
            v_item.quantity,
            v_new_stock,
            v_item.unit_price,
            'مبيعات معتمدة بالفاتورة رقم ' || v_inv.invoice_number,
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن اعتماد فاتورة مبيعات فارغة بدون أصناف';
    END IF;

    -- 3. Calculate Invoice-Level Discount
    IF v_inv.invoice_discount_type = 'percentage' THEN
        IF v_inv.invoice_discount_value < 0 OR v_inv.invoice_discount_value > 100 THEN
            RAISE EXCEPTION 'نسبة خصم الفاتورة العام غير صالحة (%): يجب أن تكون بين 0 و 100', v_inv.invoice_discount_value;
        END IF;
        v_calc_inv_disc := ROUND((v_calc_subtotal * v_inv.invoice_discount_value) / 100.0, 2);
    ELSIF v_inv.invoice_discount_type = 'fixed' THEN
        IF v_inv.invoice_discount_value < 0 OR v_inv.invoice_discount_value > v_calc_subtotal THEN
            RAISE EXCEPTION 'قيمة خصم الفاتورة العام الثابتة غير صالحة (%): تتجاوز المجموع الفرعي (%)', v_inv.invoice_discount_value, v_calc_subtotal;
        END IF;
        v_calc_inv_disc := ROUND(v_inv.invoice_discount_value, 2);
    ELSE
        v_calc_inv_disc := 0.00;
    END IF;

    -- 4. Calculate Final Total
    v_calc_final_total := v_calc_subtotal - v_calc_inv_disc + COALESCE(v_inv.additional_charges, 0.00);
    IF v_calc_final_total < 0 THEN
        v_calc_final_total := 0.00;
    END IF;

    -- 5. Mark invoice as approved with final recalculated amounts
    UPDATE public.sales_invoices
    SET status = 'approved',
        gross_amount = v_calc_gross,
        item_discounts_amount = v_calc_item_discounts,
        subtotal = v_calc_subtotal,
        invoice_discount_amount = v_calc_inv_disc,
        final_total = v_calc_final_total,
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'gross_amount', v_calc_gross,
        'item_discounts_amount', v_calc_item_discounts,
        'subtotal', v_calc_subtotal,
        'invoice_discount_amount', v_calc_inv_disc,
        'additional_charges', COALESCE(v_inv.additional_charges, 0.00),
        'final_total', v_calc_final_total,
        'items_count', v_item_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. UPDATE RPC FUNCTION: cancel_sales_invoice WITH NUMERIC(14, 3)
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

        -- Create reversal movement
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
            0.000,
            v_new_stock,
            v_item.unit_price,
            'إلغاء فاتورة مبيعات: ' || trim(p_reason),
            v_user_id
        );
    END LOOP;

    -- Mark invoice as cancelled
    UPDATE public.sales_invoices
    SET status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || '[سبب الإلغاء]: ' || trim(p_reason),
        updated_at = now()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_inv.invoice_number,
        'status', 'cancelled'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. UPDATE RPC FUNCTION: approve_stock_adjustment WITH DECIMAL SUPPORT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_stock_adjustment(p_adjustment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_adj RECORD;
    v_item RECORD;
    v_cur_stock NUMERIC(14, 3);
    v_diff NUMERIC(14, 3);
    v_user_id UUID;
    v_item_count INTEGER := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'صلاحية اعتماد تسويات الجرد المخزني مقتصرة على المستخدمين المصرح لهم';
    END IF;

    SELECT * INTO v_adj
    FROM public.inventory_adjustments
    WHERE id = p_adjustment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'إذن التسوية غير موجود';
    END IF;

    IF v_adj.status = 'approved' THEN
        RAISE EXCEPTION 'إذن التسوية رقم % معتمد مسبقاً', v_adj.adjustment_number;
    END IF;

    -- Authorize internal stock update
    PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

    FOR v_item IN
        SELECT ai.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.inventory_adjustment_items ai
        JOIN public.products p ON p.id = ai.product_id
        WHERE ai.adjustment_id = p_adjustment_id
        ORDER BY ai.product_id, ai.id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'لا يمكن اعتماد تسوية جردية لصنف موقوف/مؤرشف ("%").', v_item.product_name;
        END IF;

        IF v_item.actual_quantity < 0 THEN
            RAISE EXCEPTION 'الكمية الفعلية لا يمكن أن تكون سالبة للصنف "%"', v_item.product_name;
        END IF;

        IF NOT v_item.allows_decimal_quantity AND (v_item.actual_quantity <> ROUND(v_item.actual_quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية الفعلية المدخلة: %)', v_item.product_name, v_item.actual_quantity;
        END IF;

        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        v_diff := v_item.actual_quantity - v_cur_stock;

        -- Update adjustment item difference based on exact locked stock
        UPDATE public.inventory_adjustment_items
        SET recorded_quantity = v_cur_stock,
            difference = v_diff
        WHERE id = v_item.id;

        -- Apply actual quantity to product
        UPDATE public.products
        SET current_stock = v_item.actual_quantity,
            updated_at = now()
        WHERE id = v_item.product_id;

        -- Record movement
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
            'adjustment',
            'inventory_adjustment',
            v_adj.id,
            v_adj.adjustment_number,
            CASE WHEN v_diff > 0 THEN v_diff ELSE 0.000 END,
            CASE WHEN v_diff < 0 THEN ABS(v_diff) ELSE 0.000 END,
            v_item.actual_quantity,
            0.00,
            COALESCE(v_adj.reason, 'تسوية جرد مخزني معتمدة'),
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'إذن التسوية لا يحتوي على أي أصناف';
    END IF;

    UPDATE public.inventory_adjustments
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_adjustment_id;

    RETURN jsonb_build_object(
        'success', true,
        'adjustment_id', p_adjustment_id,
        'adjustment_number', v_adj.adjustment_number
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. PERMISSIONS: GRANT EXECUTE ON UPDATED RPC FUNCTIONS TO AUTHENTICATED
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.approve_stock_receipt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_receipt(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_stock_issue(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_issue(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_stock_adjustment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_adjustment(UUID) TO authenticated;

COMMIT;
