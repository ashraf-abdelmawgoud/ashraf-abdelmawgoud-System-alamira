-- ==============================================================================
-- AL AMIRA INVENTORY & INVOICING SYSTEM (نظام الأميرة للتوريدات العامة والتجارة)
-- Hardened Row Level Security (RLS) Policies — Two Equal Authorized Users Model
-- File: supabase/rls.sql
-- ==============================================================================

-- Enable RLS on all business tables
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. AUTHORIZED USERS ALLOWLIST POLICIES
-- Read-only for authenticated authorized users. Direct INSERT, UPDATE, DELETE
-- are strictly prohibited from client REST APIs to prevent allowlist manipulation.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_users_select" ON public.authorized_users;
CREATE POLICY "auth_users_select" ON public.authorized_users
FOR SELECT TO authenticated
USING (public.is_authorized_user());

DROP POLICY IF EXISTS "auth_users_update" ON public.authorized_users;
DROP POLICY IF EXISTS "auth_users_insert" ON public.authorized_users;
DROP POLICY IF EXISTS "auth_users_delete" ON public.authorized_users;

-- Explicitly revoke write privileges on authorized_users
REVOKE INSERT, UPDATE, DELETE ON public.authorized_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.authorized_users TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES POLICIES (FULL ACCESS FOR BOTH AUTHORIZED USERS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user());

DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated USING (public.is_authorized_user());

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS POLICIES (FULL ACCESS FOR BOTH AUTHORIZED USERS)
-- Enforces initial stock of zero on insert.
-- Direct balance editing is blocked by column-level permissions and trigger.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (
    public.is_authorized_user() AND (current_stock = 0.00 OR current_stock IS NULL)
);

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (public.is_authorized_user());

-- Enforce PostgreSQL Column-Level Permissions on products:
-- Revoke table-level UPDATE and grant update only on non-stock attributes
REVOKE UPDATE ON public.products FROM PUBLIC, anon, authenticated;
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
) ON public.products TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.products TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. CUSTOMERS & SUPPLIERS POLICIES (FULL ACCESS FOR BOTH AUTHORIZED USERS)
-- Customers and suppliers are business records only and NEVER log in.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user());

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user());

DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "suppliers_delete" ON public.suppliers;
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated USING (public.is_authorized_user());

-- ------------------------------------------------------------------------------
-- 5. STOCK RECEIPTS & ITEMS POLICIES
-- Draft documents can be edited; approvals happen strictly via atomic RPC.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "receipts_select" ON public.stock_receipts;
CREATE POLICY "receipts_select" ON public.stock_receipts FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "receipts_insert" ON public.stock_receipts;
CREATE POLICY "receipts_insert" ON public.stock_receipts FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "receipts_update" ON public.stock_receipts;
CREATE POLICY "receipts_update" ON public.stock_receipts FOR UPDATE TO authenticated USING (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "receipts_delete" ON public.stock_receipts;
CREATE POLICY "receipts_delete" ON public.stock_receipts FOR DELETE TO authenticated USING (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "receipt_items_select" ON public.stock_receipt_items;
CREATE POLICY "receipt_items_select" ON public.stock_receipt_items FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "receipt_items_all" ON public.stock_receipt_items;
CREATE POLICY "receipt_items_all" ON public.stock_receipt_items FOR ALL TO authenticated USING (
    public.is_authorized_user() AND
    EXISTS (SELECT 1 FROM public.stock_receipts sr WHERE sr.id = receipt_id AND sr.status = 'draft')
);

-- ------------------------------------------------------------------------------
-- 6. STOCK ISSUES & ITEMS POLICIES
-- Draft documents can be edited; approvals happen strictly via atomic RPC.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "issues_select" ON public.stock_issues;
CREATE POLICY "issues_select" ON public.stock_issues FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "issues_insert" ON public.stock_issues;
CREATE POLICY "issues_insert" ON public.stock_issues FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "issues_update" ON public.stock_issues;
CREATE POLICY "issues_update" ON public.stock_issues FOR UPDATE TO authenticated USING (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "issues_delete" ON public.stock_issues;
CREATE POLICY "issues_delete" ON public.stock_issues FOR DELETE TO authenticated USING (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "issue_items_select" ON public.stock_issue_items;
CREATE POLICY "issue_items_select" ON public.stock_issue_items FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "issue_items_all" ON public.stock_issue_items;
CREATE POLICY "issue_items_all" ON public.stock_issue_items FOR ALL TO authenticated USING (
    public.is_authorized_user() AND
    EXISTS (SELECT 1 FROM public.stock_issues si WHERE si.id = issue_id AND si.status = 'draft')
);

-- ------------------------------------------------------------------------------
-- 7. SALES INVOICES & ITEMS POLICIES
-- Draft invoices can be edited; approvals/cancellations happen via atomic RPC.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "invoices_select" ON public.sales_invoices;
CREATE POLICY "invoices_select" ON public.sales_invoices FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "invoices_insert" ON public.sales_invoices;
CREATE POLICY "invoices_insert" ON public.sales_invoices FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "invoices_update" ON public.sales_invoices;
CREATE POLICY "invoices_update" ON public.sales_invoices FOR UPDATE TO authenticated USING (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "invoices_delete" ON public.sales_invoices;
CREATE POLICY "invoices_delete" ON public.sales_invoices FOR DELETE TO authenticated USING (public.is_authorized_user() AND status = 'draft');

DROP POLICY IF EXISTS "invoice_items_select" ON public.sales_invoice_items;
CREATE POLICY "invoice_items_select" ON public.sales_invoice_items FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "invoice_items_all" ON public.sales_invoice_items;
CREATE POLICY "invoice_items_all" ON public.sales_invoice_items FOR ALL TO authenticated USING (
    public.is_authorized_user() AND
    EXISTS (SELECT 1 FROM public.sales_invoices si WHERE si.id = invoice_id AND si.status = 'draft')
);

-- ------------------------------------------------------------------------------
-- 8. INVENTORY ADJUSTMENTS POLICIES
-- Both authorized users can manage draft adjustments; approval is via RPC.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "adjustments_select" ON public.inventory_adjustments;
CREATE POLICY "adjustments_select" ON public.inventory_adjustments FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "adjustments_write" ON public.inventory_adjustments;
CREATE POLICY "adjustments_write" ON public.inventory_adjustments FOR ALL TO authenticated USING (
    public.is_authorized_user() AND status = 'draft'
);

DROP POLICY IF EXISTS "adjustment_items_select" ON public.inventory_adjustment_items;
CREATE POLICY "adjustment_items_select" ON public.inventory_adjustment_items FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "adjustment_items_write" ON public.inventory_adjustment_items;
CREATE POLICY "adjustment_items_write" ON public.inventory_adjustment_items FOR ALL TO authenticated USING (
    public.is_authorized_user() AND
    EXISTS (SELECT 1 FROM public.inventory_adjustments ia WHERE ia.id = adjustment_id AND ia.status = 'draft')
);

-- ------------------------------------------------------------------------------
-- 9. INVENTORY MOVEMENTS POLICIES (AUDIT TRAIL)
-- Read-only for authorized users; direct insert/update/delete blocked.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "movements_select" ON public.inventory_movements;
CREATE POLICY "movements_select" ON public.inventory_movements FOR SELECT TO authenticated USING (public.is_authorized_user());

-- ------------------------------------------------------------------------------
-- 10. SETTINGS & BACKUP METADATA POLICIES
-- Both authorized users have full access to view, update settings and create backups.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "settings_select" ON public.application_settings;
CREATE POLICY "settings_select" ON public.application_settings FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "settings_write" ON public.application_settings;
CREATE POLICY "settings_write" ON public.application_settings FOR ALL TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "backup_select" ON public.backup_metadata;
CREATE POLICY "backup_select" ON public.backup_metadata FOR SELECT TO authenticated USING (public.is_authorized_user());

DROP POLICY IF EXISTS "backup_insert" ON public.backup_metadata;
CREATE POLICY "backup_insert" ON public.backup_metadata FOR INSERT TO authenticated WITH CHECK (public.is_authorized_user());
