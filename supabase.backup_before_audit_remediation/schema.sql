-- ==============================================================================
-- AL AMIRA INVENTORY & INVOICING SYSTEM (نظام الأميرة للتوريدات العامة والتجارة)
-- Comprehensive Relational Database Schema — Two Equal Authorized Users Model
-- File: supabase/schema.sql
-- ==============================================================================

-- Note: PostgreSQL 13+ has native gen_random_uuid() built into core.

-- ------------------------------------------------------------------------------
-- 1. SERVER-CONTROLLED ALLOWLIST OF AUTHORIZED USERS (قائمة المستخدمين المصرح لهم)
-- Exactly two equal authorized individuals maintain company operations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorized_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function to check if the current user is an active authorized user
CREATE OR REPLACE FUNCTION public.is_authorized_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.authorized_users
        WHERE user_id = auth.uid() AND is_active = true
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES (تصنيفات المنتجات)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS (دليل الأصناف والمنتجات)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    unit TEXT NOT NULL DEFAULT 'قطعة' CHECK (unit IN ('قطعة', 'متر', 'كجم', 'لفة', 'كرتونة', 'علبة', 'وحدة مخصصة')),
    purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    min_stock_level NUMERIC(14, 3) NOT NULL DEFAULT 5.000 CHECK (min_stock_level >= 0),
    current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0.000 CHECK (current_stock >= 0),
    allows_decimal_quantity BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. CUSTOMERS & SUPPLIERS (العملاء والموردون - سجلات تجارية فقط دون تسجيل دخول)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. STOCK RECEIPTS (أذون إضافة بضاعة للمخزن)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    supplier_invoice_number TEXT,
    notes TEXT,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
    created_by UUID REFERENCES public.authorized_users(user_id),
    approved_by UUID REFERENCES public.authorized_users(user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.stock_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. STOCK ISSUES (أذون صرف بضاعة من المخزن)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_number TEXT NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recipient_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
    created_by UUID REFERENCES public.authorized_users(user_id),
    approved_by UUID REFERENCES public.authorized_users(user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_issue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.stock_issues(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. SALES INVOICES (فواتير المبيعات مع الخصم المزدوج)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name_snapshot TEXT,
    customer_phone_snapshot TEXT,
    gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (gross_amount >= 0),
    item_discounts_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (item_discounts_amount >= 0),
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    invoice_discount_type TEXT NOT NULL DEFAULT 'none' CHECK (invoice_discount_type IN ('none', 'percentage', 'fixed')),
    invoice_discount_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (invoice_discount_value >= 0),
    invoice_discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (invoice_discount_amount >= 0),
    additional_charges NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (additional_charges >= 0),
    final_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (final_total >= 0),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
    cancellation_reason TEXT,
    created_by UUID REFERENCES public.authorized_users(user_id),
    approved_by UUID REFERENCES public.authorized_users(user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_sku_snapshot TEXT NOT NULL,
    product_name_snapshot TEXT NOT NULL,
    unit_snapshot TEXT NOT NULL,
    quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    gross_amount NUMERIC(14, 2) NOT NULL CHECK (gross_amount >= 0),
    discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
    discount_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_value >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    net_amount NUMERIC(14, 2) NOT NULL CHECK (net_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8. INVENTORY ADJUSTMENTS (تسويات الجرد المخزني)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_number TEXT NOT NULL UNIQUE,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    created_by UUID REFERENCES public.authorized_users(user_id),
    approved_by UUID REFERENCES public.authorized_users(user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES public.inventory_adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    recorded_quantity NUMERIC(14, 3) NOT NULL,
    actual_quantity NUMERIC(14, 3) NOT NULL CHECK (actual_quantity >= 0),
    difference NUMERIC(14, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. INVENTORY MOVEMENTS (سجل حركات المخزون المعصوم التراكمي)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'issue', 'sale', 'adjustment', 'reversal')),
    source_doc_type TEXT NOT NULL CHECK (source_doc_type IN ('stock_receipt', 'stock_issue', 'sales_invoice', 'inventory_adjustment')),
    source_doc_id UUID NOT NULL,
    source_doc_number TEXT NOT NULL,
    quantity_in NUMERIC(14, 3) NOT NULL DEFAULT 0.000 CHECK (quantity_in >= 0),
    quantity_out NUMERIC(14, 3) NOT NULL DEFAULT 0.000 CHECK (quantity_out >= 0),
    stock_balance_after NUMERIC(14, 3) NOT NULL CHECK (stock_balance_after >= 0),
    unit_cost_or_price NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES public.authorized_users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 10. APPLICATION SETTINGS & BACKUP METADATA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    records_count JSONB NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.authorized_users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 11. INDEXES FOR HIGH-PERFORMANCE SEARCH & AUDITING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

CREATE INDEX IF NOT EXISTS idx_receipts_supplier ON public.stock_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.stock_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON public.stock_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product ON public.stock_receipt_items(product_id);

CREATE INDEX IF NOT EXISTS idx_issues_status ON public.stock_issues(status);
CREATE INDEX IF NOT EXISTS idx_issue_items_issue ON public.stock_issue_items(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_items_product ON public.stock_issue_items(product_id);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.sales_invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_source ON public.inventory_movements(source_doc_type, source_doc_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON public.inventory_movements(created_at);

-- ------------------------------------------------------------------------------
-- 12. IMMUTABILITY TRIGGER FOR INVENTORY MOVEMENTS (لا يمكن التعديل أو الحذف)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_movement_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'سجلات حركات المخزون معصومة ولا يمكن تعديلها أو حذفها لأسباب الحوكمة والأمان المحاسبي';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_movement_update_delete ON public.inventory_movements;
CREATE TRIGGER trg_prevent_movement_update_delete
BEFORE UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_movement_modification();

-- ------------------------------------------------------------------------------
-- 13. PREVENT DIRECT STOCK TAMPERING ON PRODUCTS TABLE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_direct_stock_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
        IF current_setting('alamira.stock_movement_in_progress', true) IS DISTINCT FROM '1' THEN
            RAISE EXCEPTION 'لا يمكن تعديل رصيد المخزون مباشرة من جدول المنتجات. يجب استخدام أذون الإضافة أو الصرف أو فواتير المبيعات أو تسويات الجرد المعتمدة.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_direct_stock_tampering ON public.products;
CREATE TRIGGER trg_prevent_direct_stock_tampering
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_stock_tampering();

-- ------------------------------------------------------------------------------
-- 14. ENFORCE ZERO INITIAL STOCK ON PRODUCT CREATION
-- Enforces that newly inserted products always start with current_stock = 0.00.
-- Any opening balance must be added via an approved stock receipt with an audit trail.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_zero_initial_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.current_stock IS NOT NULL AND NEW.current_stock <> 0.00 THEN
        RAISE EXCEPTION 'غير مسموح بإنشاء صنف برصيد مخزني غير صفري (القيمة المدخلة: %). يجب أن يكون الرصيد الأولي 0.00 ويتم إثبات أي رصيد افتتاحي عبر إذن إضافة معتمد.', NEW.current_stock;
    END IF;
    NEW.current_stock := 0.00;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_zero_initial_stock ON public.products;
CREATE TRIGGER trg_enforce_zero_initial_stock
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_zero_initial_stock();

-- ------------------------------------------------------------------------------
-- 15. PERMISSION HARDENING: AUTHORIZED_USERS & PRODUCTS COLUMN-LEVEL ACCESS
-- ------------------------------------------------------------------------------
-- A. Revoke all write permissions on authorized_users for clients.
-- Browser clients can NEVER insert, update, or delete allowlist entries via REST.
REVOKE ALL ON TABLE public.authorized_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.authorized_users TO authenticated;

-- B. Revoke table-level UPDATE on products.
-- Authenticated clients cannot modify current_stock directly via REST API.
REVOKE UPDATE ON TABLE public.products FROM PUBLIC, anon, authenticated;

-- Grant column-level UPDATE on products to authenticated users, EXCLUDING current_stock
GRANT UPDATE (
    sku,
    name,
    category_id,
    unit,
    purchase_price,
    selling_price,
    min_stock_level,
    description,
    is_active,
    updated_at
) ON TABLE public.products TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.products TO authenticated;

