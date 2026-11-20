-- =============================================================================
-- AL-AMIRA ERP V2 — PROPOSED PERFORMANCE & INDEXING OPTIMIZATIONS
-- =============================================================================
-- COMPANY: Al-Amira General Supplies & Trading (شركة الأميرة للتوريدات العامة والتجارة)
-- SUPABASE PROJECT: llmptlkvatndvrmnjiyj
-- STATUS: PROPOSAL ONLY — DO NOT RUN AUTOMATICALLY ON LIVE PRODUCTION DATABASE
-- 
-- IMPORTANT NOTICE:
-- This script contains advisory optimizations designed to reduce query latency,
-- minimize Supabase compute spikes, and lower egress bandwidth.
-- These changes MUST be reviewed by the database administrator and executed 
-- manually in the Supabase SQL Editor during a scheduled maintenance window.
-- =============================================================================

-- =============================================================================
-- 1. COMPOSITE INDEXES FOR FAST QUERYING & FILTERING
-- =============================================================================

-- 1.1 Sales Invoices Indexing
-- Optimizes queries filtering by invoice status and ordered by date or creation time.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_invoices_status_date
  ON public.sales_invoices (status, invoice_date DESC, created_at DESC);

-- Optimizes filtering invoices by author (crucial for SALES_OPERATOR draft isolation).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_invoices_created_by
  ON public.sales_invoices (created_by)
  WHERE created_by IS NOT NULL;

-- Optimizes foreign key joins with customers and customer statement queries.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_invoices_customer_id
  ON public.sales_invoices (customer_id);

-- 1.2 Sales Invoice Items Indexing
-- Optimizes items fetching during invoice detail queries and stock tracing.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_invoice_items_inv_prod
  ON public.sales_invoice_items (invoice_id, product_id);

-- 1.3 Inventory Movements Indexing
-- Optimizes dashboard recent movements (LIMIT 6) and product stock history cards.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_movements_created_at_desc
  ON public.inventory_movements (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements (product_id, created_at DESC);

-- 1.4 Products Table Indexing
-- Optimizes catalog lookups, low stock alerts, and active product listings.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_name
  ON public.products (is_active, name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_lower
  ON public.products (LOWER(sku));

-- 1.5 Audit Logs Indexing
-- Optimizes audit log viewer queries sorted by reverse chronological order.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp_desc
  ON public.audit_logs (timestamp DESC);

-- 1.6 Customers Indexing
-- Speeds up active customer count head queries and customer search autocomplete.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_active_name
  ON public.customers (is_active, name);


-- =============================================================================
-- 2. SERVER-SIDE AGGREGATION RPC: DASHBOARD KPIS
-- =============================================================================
-- Instead of transferring hundreds of invoice records over the network to calculate
-- daily and total sales in JavaScript, this RPC computes exact aggregates directly
-- within PostgreSQL in ~2-5 milliseconds.
--
-- Security:
-- - Strictly checks authorized_users allowlist.
-- - Respects role permissions (SALES_OPERATOR cannot access product stock/cost counts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(p_today_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_today_sales numeric(15, 2) := 0;
  v_today_count int := 0;
  v_total_sales numeric(15, 2) := 0;
  v_active_customers_count int := 0;
  v_total_products_count int := 0;
  v_low_stock_products_count int := 0;
BEGIN
  -- 1. Authenticate caller
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول لاستدعاء مؤشرات الأداء';
  END IF;

  SELECT role INTO v_role
  FROM public.authorized_users
  WHERE user_id = v_uid AND is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'غير مصرح: الحساب غير مسجل في قائمة المستخدمين المعتمدين';
  END IF;

  -- 2. Compute Invoice aggregates (Approved sales only)
  SELECT 
    COALESCE(SUM(CASE WHEN invoice_date = p_today_date THEN final_total ELSE 0 END), 0),
    COUNT(CASE WHEN invoice_date = p_today_date THEN 1 END),
    COALESCE(SUM(final_total), 0)
  INTO 
    v_today_sales,
    v_today_count,
    v_total_sales
  FROM public.sales_invoices
  WHERE status = 'approved';

  -- 3. Compute Active Customers Count
  SELECT COUNT(*) INTO v_active_customers_count
  FROM public.customers
  WHERE is_active = true;

  -- 4. Compute Inventory Metrics (ADMIN ONLY)
  IF v_role = 'ADMIN' THEN
    SELECT 
      COUNT(*),
      COUNT(CASE WHEN current_stock <= min_stock_level THEN 1 END)
    INTO 
      v_total_products_count,
      v_low_stock_products_count
    FROM public.products
    WHERE is_active = true;
  END IF;

  -- 5. Return structured JSON
  RETURN jsonb_build_object(
    'today_sales', v_today_sales,
    'today_invoices_count', v_today_count,
    'total_sales', v_total_sales,
    'active_customers_count', v_active_customers_count,
    'total_products_count', v_total_products_count,
    'low_stock_products_count', v_low_stock_products_count,
    'role', v_role,
    'computed_at', NOW()
  );
END;
$$;

-- Grant execution to authenticated users (enforced by internal authorization check)
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(date) TO authenticated;


-- =============================================================================
-- 3. ROLLBACK INSTRUCTIONS (IF NEEDED)
-- =============================================================================
-- If you need to revert any of the above indexes or functions, execute the following:
--
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_sales_invoices_status_date;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_sales_invoices_created_by;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_sales_invoices_customer_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_sales_invoice_items_inv_prod;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_inventory_movements_created_at_desc;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_inventory_movements_product_created;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_active_name;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_sku_lower;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_audit_logs_timestamp_desc;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_customers_active_name;
-- DROP FUNCTION IF EXISTS public.get_dashboard_kpis(date);
-- =============================================================================
