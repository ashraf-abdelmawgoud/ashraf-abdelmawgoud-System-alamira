-- ==============================================================================
-- AL AMIRA INVENTORY & INVOICING SYSTEM (نظام الأميرة للتوريدات العامة والتجارة)
-- Secured Atomic Stored Procedures & Business Functions
-- File: supabase/functions.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. APPROVE STOCK RECEIPT (اعتماد إذن إضافة بضاعة)
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

        IF NOT v_item.allows_decimal_quantity AND (v_item.quantity <> ROUND(v_item.quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المدخلة: %)', v_item.product_name, v_item.quantity;
        END IF;

        -- Lock product row exclusively: always read latest committed stock under lock
        SELECT current_stock INTO v_new_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        v_new_stock := v_new_stock + v_item.quantity;
        v_calculated_total := v_calculated_total + ROUND(v_item.quantity * v_item.unit_price, 2);

        -- Update line total in items
        UPDATE public.stock_receipt_items
        SET line_total = ROUND(v_item.quantity * v_item.unit_price, 2)
        WHERE id = v_item.id;

        -- Update product stock balance
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
            'receipt',
            'stock_receipt',
            v_receipt.id,
            v_receipt.receipt_number,
            v_item.quantity,
            0.00,
            v_new_stock,
            v_item.unit_price,
            COALESCE(v_receipt.notes, 'إذن إضافة بضاعة'),
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن اعتماد إذن إضافة بدون بنود أصناف';
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
        'message', 'تم اعتماد إذن الإضافة بنجاح وتحديث أرصدة المخزون',
        'receipt_number', v_receipt.receipt_number,
        'total_amount', v_calculated_total
    );
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. APPROVE STOCK ISSUE (اعتماد إذن صرف بضاعة من المخزن)
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
    
    -- 1. Lock and verify issue
    SELECT * INTO v_issue
    FROM public.stock_issues
    WHERE id = p_issue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'إذن الصرف المطلوب غير موجود (ID: %)', p_issue_id;
    END IF;

    IF v_issue.status = 'approved' THEN
        RAISE EXCEPTION 'إذن الصرف رقم % معتمد مسبقاً ولا يمكن اعتماده مرة أخرى', v_issue.issue_number;
    END IF;

    IF v_issue.status = 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن اعتماد إذن صرف ملغى (رقم %)', v_issue.issue_number;
    END IF;

    -- Authorize internal stock update
    PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

    -- 2. Check and deduct items atomically
    FOR v_item IN
        SELECT ii.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.stock_issue_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.issue_id = p_issue_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن صرف بضاعة له من المخزن.', v_item.product_name;
        END IF;

        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'كمية غير صالحة للصنف "%": %', v_item.product_name, v_item.quantity;
        END IF;

        IF NOT v_item.allows_decimal_quantity AND (v_item.quantity <> ROUND(v_item.quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المنصرفة: %)', v_item.product_name, v_item.quantity;
        END IF;

        -- Row-level lock on product
        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_cur_stock < v_item.quantity THEN
            RAISE EXCEPTION 'عفواً، رصيد المخزون غير كاف للمنتج "%" (المتاح: %، المطلوب صرفه: %)',
                v_item.product_name, v_cur_stock, v_item.quantity;
        END IF;

        v_new_stock := v_cur_stock - v_item.quantity;

        -- Update product stock balance
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
            'issue',
            'stock_issue',
            v_issue.id,
            v_issue.issue_number,
            0.00,
            v_item.quantity,
            v_new_stock,
            0.00,
            COALESCE(v_issue.reason, 'إذن صرف بضاعة: ' || v_issue.recipient_name),
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن اعتماد إذن صرف بدون بنود أصناف';
    END IF;

    -- 3. Update issue status
    UPDATE public.stock_issues
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_issue_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم اعتماد إذن الصرف بنجاح وخصم الكميات من المخزون',
        'issue_number', v_issue.issue_number
    );
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. APPROVE SALES INVOICE (اعتماد فاتورة المبيعات داخل Transaction واحدة)
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
            RAISE EXCEPTION 'قيمة خصم الفاتورة الثابتة غير صالحة (%): تتجاوز المجموع الفرعي (%)', v_inv.invoice_discount_value, v_calc_subtotal;
        END IF;
        v_calc_inv_disc := ROUND(v_inv.invoice_discount_value, 2);
    ELSE
        v_calc_inv_disc := 0.00;
    END IF;

    v_calc_final_total := v_calc_subtotal - v_calc_inv_disc + COALESCE(v_inv.additional_charges, 0.00);
    IF v_calc_final_total < 0 THEN
        RAISE EXCEPTION 'إجمالي الفاتورة النهائي لا يمكن أن يكون سالباً';
    END IF;

    -- 4. Update invoice with finalized totals and approved state
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
-- 4. CANCEL / REVERSE SALES INVOICE (إلغاء فاتورة مبيعات معتمدة وإرجاع المخزون - مدير فقط)
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

    -- Two Equal Users model: both authorized users can cancel approved invoices
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
            0.00,
            v_new_stock,
            v_item.unit_price,
            'إلغاء فاتورة مبيعات معتمدة. السبب: ' || p_reason,
            v_user_id
        );
    END LOOP;

    -- Update invoice status
    UPDATE public.sales_invoices
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم إلغاء الفاتورة بنجاح وإرجاع البضاعة إلى أرصدة المخزون',
        'invoice_number', v_inv.invoice_number
    );
END;
$$;


-- ------------------------------------------------------------------------------
-- 5. APPROVE INVENTORY ADJUSTMENT (اعتماد تسوية الجرد الفعلي للمخزن - مدير فقط)
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
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'لا يمكن اعتماد تسوية جردية لصنف موقوف/مؤرشف ("%").', v_item.product_name;
        END IF;

        IF v_item.actual_quantity < 0 THEN
            RAISE EXCEPTION 'الكمية الفعلية للمنتج % لا يمكن أن تكون سالبة', v_item.product_name;
        END IF;

        IF NOT v_item.allows_decimal_quantity AND (v_item.actual_quantity <> ROUND(v_item.actual_quantity, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية الفعلية المدخلة: %)', v_item.product_name, v_item.actual_quantity;
        END IF;

        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        v_diff := v_item.actual_quantity - v_cur_stock;

        -- Update adjustment item with verified snapshot
        UPDATE public.inventory_adjustment_items
        SET recorded_quantity = v_cur_stock,
            difference = v_diff
        WHERE id = v_item.id;

        -- Set product stock to actual quantity
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
            CASE WHEN v_diff > 0 THEN v_diff ELSE 0.00 END,
            CASE WHEN v_diff < 0 THEN ABS(v_diff) ELSE 0.00 END,
            v_item.actual_quantity,
            0.00,
            'تسوية جردية: ' || v_adj.reason,
            v_user_id
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'لا توجد بنود في إذن التسوية';
    END IF;

    UPDATE public.inventory_adjustments
    SET status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_adjustment_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم اعتماد تسوية الجرد وتحديث أرصدة المخزون',
        'adjustment_number', v_adj.adjustment_number
    );
END;
$$;


-- ------------------------------------------------------------------------------
-- 6. FULL BACKUP EXPORT & RECOVERY STRATEGY (تصدير النسخة الاحتياطية واستراتيجية التعافي)
-- ------------------------------------------------------------------------------
-- BACKUP & DISASTER RECOVERY ARCHITECTURAL STRATEGY:
-- 1. SCOPE OF EXPORT:
--    - Business Data: categories, products, customers, suppliers.
--    - Financial & Inventory Documents: stock_receipts (+items), stock_issues (+items),
--      sales_invoices (+items), inventory_adjustments (+items).
--    - Immutable Audit Trails: inventory_movements, backup_metadata.
--    - Configuration: application_settings.
--    - Allowlist Metadata: authorized_users (user_id, email, full_name, is_active, created_at).
-- 2. SECURITY EXCLUSIONS:
--    - Passwords, cryptographic hashes, OTPs, session secrets, and JWT tokens are
--      STRICTLY EXCLUDED and NEVER exported (they reside securely in the private auth.users table).
-- 3. DISASTER RECOVERY & RE-PROVISIONING WORKFLOW:
--    a. Clean Installation: Execute `supabase/combined_setup.sql` on the target database instance.
--    b. User Re-Provisioning: In Supabase Auth Dashboard, re-create the two authorized users
--       using their emails recorded in `data.authorized_users`.
--    c. Allowlist Activation: Call `SELECT public.provision_authorized_user(new_uid, full_name, email);`
--       for each user using their newly generated Supabase Auth UID.
--    d. Data Ingestion: Ingest records in foreign-key dependency order (settings, categories,
--       contacts, products, documents, items, movements, backup_metadata). User references (`created_by`, `approved_by`)
--       are safely mapped to the active authorized users to guarantee referential integrity.
-- ------------------------------------------------------------------------------
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

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'تصدير النسخة الاحتياطية مقتصر على المستخدمين المصرح لهم فقط';
    END IF;

    SELECT jsonb_build_object(
        'system', 'Al Amira Inventory System',
        'company', 'الأميرة للتوريدات العامة والتجارة',
        'schema_version', '1.0.0',
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
                            'is_active', au.is_active,
                            'created_at', au.created_at
                        )
                    ),
                    '[]'::jsonb
                )
                FROM public.authorized_users au
            ),
            'backup_metadata', (SELECT COALESCE(jsonb_agg(to_jsonb(bm)), '[]'::jsonb) FROM public.backup_metadata bm)
        )
    ) INTO v_data;

    RETURN v_data;
END;
$$;


CREATE OR REPLACE FUNCTION public.restore_full_backup(p_backup JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Disabled for security: Full database restoration cannot be safely executed via web client RPC
    -- due to the critical risks of trigger-disabling DDL (ALTER TABLE DISABLE TRIGGER),
    -- table lock contention, and referential integrity hazards.
    -- Restoration must be performed by database administrators using pg_restore, psql, or Supabase CLI.
    RAISE EXCEPTION 'استعادة النسخة الاحتياطية المباشرة عبر واجهة المتصفح معطلة لأسباب أمنية ولحماية سلامة قاعدة البيانات وسجل الحركات الرقابي المعصوم. لإجراء استعادة شاملة، يرجى استخدام أدوات إدارة قاعدة البيانات الرسمية (psql أو لوحة تحكم Supabase).';
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. COMPATIBILITY WRAPPERS & EXPLICIT FUNCTION ACCESS REVOCATION & GRANTS
-- ------------------------------------------------------------------------------
-- Compatibility wrappers for any legacy or helper calls
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT public.is_authorized_user();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    -- In the Two Equal Users model, both authorized users have full access
    SELECT public.is_authorized_user();
$$;

-- Revoke all execute rights from anonymous and public roles, and grant only to authenticated.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_authorized_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_stock_receipt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_stock_issue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_stock_adjustment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_full_backup() TO authenticated;
-- restore_full_backup is explicitly revoked from all roles for database safety
REVOKE EXECUTE ON FUNCTION public.restore_full_backup(JSONB) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. PRODUCT LIFECYCLE MANAGEMENT (SECURE DELETION & ARCHIVING)
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
    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'غير مصرح لك بتنفيذ هذه العملية. يرجى تسجيل الدخول بحساب مصرح له.';
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
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود أذون صرف مخزني مسجلة له. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.inventory_adjustment_items WHERE product_id = p_product_id) INTO v_has_adjustments;
    IF v_has_adjustments THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود تسويات جرد مرتبطة به. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.inventory_movements WHERE product_id = p_product_id) INTO v_has_movements;
    IF v_has_movements THEN
        RAISE EXCEPTION 'لا يمكن حذف الصنف "%" لوجود حركات مسجلة له في سجل الرقابة والتدقيق المخزني المعصوم. يرجى استخدام ميزة الإيقاف/الأرشفة.',
            v_product.name;
    END IF;

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

REVOKE EXECUTE ON FUNCTION public.delete_product(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;

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
    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'غير مصرح لك بتنفيذ هذه العملية. يرجى تسجيل الدخول بحساب مصرح له.';
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

REVOKE EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;


-- ------------------------------------------------------------------------------
-- 12. REGISTER PRODUCT WITH OPENING STOCK (تسجيل صنف برصيد افتتاحي أولي معتمد)
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'عملية غير مصرح بها: يجب تسجيل الدخول أولاً';
    END IF;

    IF NOT public.is_authorized_user() THEN
        RAISE EXCEPTION 'غير مصرح لك بتسجيل الأصناف. يجب أن يكون حسابك مسجلاً في قائمة المستخدمين المصرح لهم ونشطاً.';
    END IF;

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

    IF NOT p_allows_decimal_quantity THEN
        IF p_opening_quantity <> ROUND(p_opening_quantity, 0) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بوحدات صحيحة فقط ولا يقبل كميات كسرية (الرصيد المدخل: %)', v_clean_name, p_opening_quantity;
        END IF;
        IF p_min_stock_level <> ROUND(p_min_stock_level, 0) THEN
            RAISE EXCEPTION 'حد الأمان للمخزون يجب أن يكون عدداً صحيحاً طالما أن الصنف لا يقبل كسوراً';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.products WHERE sku = v_clean_sku) THEN
        RAISE EXCEPTION 'كود الصنف (%) مسجل مسبقاً في قاعدة البيانات. يرجى استخدام كود فريد.', v_clean_sku;
    END IF;

    -- Insert product with 0.00 initial stock
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
        0.000,
        p_description,
        true
    )
    RETURNING id INTO v_product_id;

    IF p_opening_quantity > 0 THEN
        PERFORM set_config('alamira.stock_movement_in_progress', '1', true);

        UPDATE public.products
        SET current_stock = p_opening_quantity,
            updated_at = now()
        WHERE id = v_product_id;

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
            'رصيد افتتاحي عند تسجيل الصنف (' || v_clean_sku || ')',
            'إثبات رصيد افتتاحي أولي بموجب الكمية الحالية المدخلة عند تأسيس الصنف',
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
            v_product_id,
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
            v_product_id,
            'adjustment',
            'inventory_adjustment',
            v_adj_id,
            v_adj_number,
            p_opening_quantity,
            0.000,
            p_opening_quantity,
            p_purchase_price,
            'رصيد افتتاحي / الكمية الحالية عند إضافة الصنف',
            v_user_id
        );
    END IF;

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
-- 13. REGISTER OPENING STOCK FOR EXISTING PRODUCT (رصيد افتتاحي لصنف موجود برصيد صفري)
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

    IF p_opening_quantity IS NULL OR p_opening_quantity < 0 THEN
        RAISE EXCEPTION 'الرصيد الافتتاحي لا يمكن أن يكون سالباً';
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

REVOKE EXECUTE ON FUNCTION public.register_product_with_opening_stock(TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_product_with_opening_stock(TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;
