const fs = require('fs');

let content = fs.readFileSync('supabase/combined_setup.sql', 'utf8');
const hadCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. approve_stock_receipt
const targetReceipt = `        SELECT ri.*, p.name AS product_name, p.current_stock AS prod_stock, p.allows_decimal_quantity
        FROM public.stock_receipt_items ri
        JOIN public.products p ON p.id = ri.product_id
        WHERE ri.receipt_id = p_receipt_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementReceipt = `        SELECT ri.*, p.name AS product_name, p.current_stock AS prod_stock, p.allows_decimal_quantity, p.is_active
        FROM public.stock_receipt_items ri
        JOIN public.products p ON p.id = ri.product_id
        WHERE ri.receipt_id = p_receipt_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن استلام بضاعة جديدة له. يرجى تفعيل الصنف أولاً.', v_item.product_name;
        END IF;`;

if (content.includes(targetReceipt)) {
  content = content.replace(targetReceipt, replacementReceipt);
  console.log('[combined_setup.sql] Added is_active check to approve_stock_receipt');
}

// 2. approve_stock_issue
const targetIssue = `        SELECT ii.*, p.name AS product_name, p.allows_decimal_quantity
        FROM public.stock_issue_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.issue_id = p_issue_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementIssue = `        SELECT ii.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.stock_issue_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.issue_id = p_issue_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن صرف بضاعة له من المخزن.', v_item.product_name;
        END IF;`;

if (content.includes(targetIssue)) {
  content = content.replace(targetIssue, replacementIssue);
  console.log('[combined_setup.sql] Added is_active check to approve_stock_issue');
}

// 3. approve_sales_invoice
const targetInvoice = `        SELECT ii.*, p.name AS current_p_name, p.sku AS current_p_sku, p.unit AS current_p_unit, p.allows_decimal_quantity
        FROM public.sales_invoice_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.invoice_id = p_invoice_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementInvoice = `        SELECT ii.*, p.name AS current_p_name, p.sku AS current_p_sku, p.unit AS current_p_unit, p.allows_decimal_quantity, p.is_active
        FROM public.sales_invoice_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.invoice_id = p_invoice_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن بيعه أو إدراجه في فواتير معتمدة.', v_item.current_p_name;
        END IF;`;

if (content.includes(targetInvoice)) {
  content = content.replace(targetInvoice, replacementInvoice);
  console.log('[combined_setup.sql] Added is_active check to approve_sales_invoice');
}

// 4. approve_stock_adjustment
const targetAdj = `    FOR v_item IN
        SELECT ai.*, p.name AS product_name, p.allows_decimal_quantity
        FROM public.inventory_adjustment_items ai
        JOIN public.products p ON p.id = ai.product_id
        WHERE ai.adjustment_id = p_adjustment_id
    LOOP
        v_item_count := v_item_count + 1;`;

const replacementAdj = `    FOR v_item IN
        SELECT ai.*, p.name AS product_name, p.allows_decimal_quantity, p.is_active
        FROM public.inventory_adjustment_items ai
        JOIN public.products p ON p.id = ai.product_id
        WHERE ai.adjustment_id = p_adjustment_id
    LOOP
        v_item_count := v_item_count + 1;

        IF NOT v_item.is_active THEN
            RAISE EXCEPTION 'لا يمكن اعتماد تسوية جردية لصنف موقوف/مؤرشف ("%").', v_item.product_name;
        END IF;`;

if (content.includes(targetAdj)) {
  content = content.replace(targetAdj, replacementAdj);
  console.log('[combined_setup.sql] Added is_active check to approve_stock_adjustment');
}

// 5. register_opening_stock
const targetOpenStock = `    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود';
    END IF;

    IF v_product.current_stock <> 0 THEN`;

const replacementOpenStock = `    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود';
    END IF;

    IF NOT v_product.is_active THEN
        RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن تسجيل رصيد افتتاحي له. يرجى إعادة تفعيل الصنف أولاً.', v_product.name;
    END IF;

    IF v_product.current_stock <> 0 THEN`;

if (content.includes(targetOpenStock)) {
  content = content.replace(targetOpenStock, replacementOpenStock);
  console.log('[combined_setup.sql] Added is_active check to register_opening_stock');
}

if (hadCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('supabase/combined_setup.sql', content, 'utf8');
console.log('combined_setup.sql updated successfully!');
