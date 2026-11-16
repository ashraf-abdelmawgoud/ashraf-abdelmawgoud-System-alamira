const fs = require('fs');

let sql = fs.readFileSync('supabase/migration_decimal_quantities.sql', 'utf8');

// 1. Replace inventory_adjustment_items ALTER statement
const targetAlter = `-- Inventory Adjustment Items
ALTER TABLE public.inventory_adjustment_items 
ALTER COLUMN system_stock TYPE NUMERIC(14, 3),
ALTER COLUMN physical_stock TYPE NUMERIC(14, 3),
ALTER COLUMN difference TYPE NUMERIC(14, 3);`;

const replacementAlter = `-- Inventory Adjustment Items: safely support either legacy or canonical column names
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
ALTER COLUMN difference TYPE NUMERIC(14, 3);`;

if (!sql.includes(targetAlter)) {
  console.error('targetAlter not found in migration_decimal_quantities.sql');
  process.exit(1);
}
sql = sql.replace(targetAlter, replacementAlter);

// 2. In approve_stock_receipt: add is_active check
const targetReceiptSelect = `        SELECT ri.*, p.name AS product_name, p.current_stock AS prod_stock, p.allows_decimal_quantity
        FROM public.stock_receipt_items ri
        JOIN public.products p ON p.id = ri.product_id
        WHERE ri.receipt_id = p_receipt_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementReceiptSelect = `        SELECT ri.*, p.name AS product_name, p.current_stock AS prod_stock, p.allows_decimal_quantity, p.is_active
        FROM public.stock_receipt_items ri
        JOIN public.products p ON p.id = ri.product_id
        WHERE ri.receipt_id = p_receipt_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن استلام بضاعة جديدة له. يرجى تفعيل الصنف أولاً.', v_item.product_name;
        END IF;`;

if (!sql.includes(targetReceiptSelect)) {
  console.error('targetReceiptSelect not found');
  process.exit(1);
}
sql = sql.replace(targetReceiptSelect, replacementReceiptSelect);

// 3. In approve_stock_issue: add is_active check
const targetIssueSelect = `        SELECT ii.*, p.name AS product_name, p.allows_decimal_quantity
        FROM public.stock_issue_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.issue_id = p_issue_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementIssueSelect = `        SELECT ii.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.stock_issue_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.issue_id = p_issue_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن صرف بضاعة له من المخزن.', v_item.product_name;
        END IF;`;

if (!sql.includes(targetIssueSelect)) {
  console.error('targetIssueSelect not found');
  process.exit(1);
}
sql = sql.replace(targetIssueSelect, replacementIssueSelect);

// 4. In approve_sales_invoice: add is_active check
const targetInvoiceSelect = `        SELECT ii.*, p.name AS current_p_name, p.sku AS current_p_sku, p.unit AS current_p_unit, p.allows_decimal_quantity
        FROM public.sales_invoice_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.invoice_id = p_invoice_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementInvoiceSelect = `        SELECT ii.*, p.name AS current_p_name, p.sku AS current_p_sku, p.unit AS current_p_unit, p.allows_decimal_quantity, p.is_active
        FROM public.sales_invoice_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.invoice_id = p_invoice_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن بيعه أو إدراجه في فواتير معتمدة.', v_item.current_p_name;
        END IF;`;

if (!sql.includes(targetInvoiceSelect)) {
  console.error('targetInvoiceSelect not found');
  process.exit(1);
}
sql = sql.replace(targetInvoiceSelect, replacementInvoiceSelect);

// 5. In approve_stock_adjustment: replace physical_stock/system_stock with canonical actual_quantity/recorded_quantity and add is_active check
const targetAdjLoop = `    FOR v_item IN
        SELECT ai.*, p.name AS product_name, p.allows_decimal_quantity
        FROM public.inventory_adjustment_items ai
        JOIN public.products p ON p.id = ai.product_id
        WHERE ai.adjustment_id = p_adjustment_id
    LOOP
        v_item_count := v_item_count + 1;

        IF v_item.physical_stock < 0 THEN
            RAISE EXCEPTION 'الرصيد الفعلي لا يمكن أن يكون سالباً للصنف "%"', v_item.product_name;
        END IF;

        IF NOT v_item.allows_decimal_quantity AND (v_item.physical_stock <> ROUND(v_item.physical_stock, 0)) THEN
            RAISE EXCEPTION 'الصنف "%" يباع بالعدد الصحيح فقط ولا يقبل أرصدة كسرية (الرصيد المدخل: %)', v_item.product_name, v_item.physical_stock;
        END IF;

        SELECT current_stock INTO v_cur_stock
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        v_diff := v_item.physical_stock - v_cur_stock;

        -- Update adjustment item difference based on exact locked stock
        UPDATE public.inventory_adjustment_items
        SET system_stock = v_cur_stock,
            difference = v_diff
        WHERE id = v_item.id;

        -- Apply physical stock to product
        UPDATE public.products
        SET current_stock = v_item.physical_stock,
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
            v_item.physical_stock,
            COALESCE(v_adj.reason, 'تسوية جرد مخزني معتمدة'),
            v_user_id
        );
    END LOOP;`;

const replacementAdjLoop = `    FOR v_item IN
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
    END LOOP;`;

if (!sql.includes(targetAdjLoop)) {
  console.error('targetAdjLoop not found');
  process.exit(1);
}
sql = sql.replace(targetAdjLoop, replacementAdjLoop);

// 6. Explicit permissions before COMMIT
const targetEnd = `END;
$$;

COMMIT;`;

const replacementEnd = `END;
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

COMMIT;`;

if (!sql.includes(targetEnd)) {
  console.error('targetEnd not found');
  process.exit(1);
}
sql = sql.replace(targetEnd, replacementEnd);

fs.writeFileSync('supabase/migration_decimal_quantities.sql', sql, 'utf8');
console.log('migration_decimal_quantities.sql successfully corrected!');
