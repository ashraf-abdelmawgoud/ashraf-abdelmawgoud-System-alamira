-- ==============================================================================
-- AL AMIRA INVENTORY & INVOICING SYSTEM (نظام الأميرة للتوريدات العامة والتجارة)
-- Migration: Fix Permissions, Function Execution Grants & Table RLS Privileges
-- File: supabase/migration_fix_permissions_and_ddl.sql
-- Description:
--   1. Ensures all RPC functions have correct EXECUTE permissions for 'authenticated'.
--   2. Enforces table-level CRUD permissions on business tables for 'authenticated'.
--   3. Revokes all permissions from 'anon' and 'PUBLIC' to maintain Zero-Trust security.
--   4. Updates products column-level permissions to cover all editable metadata.
-- Safe to run multiple times (idempotent).
-- ==============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Starting Al-Amira Permissions and Security Hardening Migration...';
END $$;

-- ------------------------------------------------------------------------------
-- 1. FUNCTION EXECUTION PRIVILEGES (RPC SECURITY)
-- Avoid blanket revocations across public schema to preserve extension helpers (e.g. gen_random_uuid).
-- Target specific business RPC functions with explicit REVOKE and GRANT.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Authorization & System Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_authorized_user') THEN
        REVOKE EXECUTE ON FUNCTION public.is_authorized_user() FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.is_authorized_user() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_active_user') THEN
        REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
    END IF;

    -- Document Approval & Workflow Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_stock_receipt') THEN
        REVOKE EXECUTE ON FUNCTION public.approve_stock_receipt(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.approve_stock_receipt(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_stock_issue') THEN
        REVOKE EXECUTE ON FUNCTION public.approve_stock_issue(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.approve_stock_issue(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_sales_invoice') THEN
        REVOKE EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cancel_sales_invoice') THEN
        REVOKE EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_stock_adjustment') THEN
        REVOKE EXECUTE ON FUNCTION public.approve_stock_adjustment(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.approve_stock_adjustment(UUID) TO authenticated;
    END IF;

    -- Backup Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'export_full_backup') THEN
        REVOKE EXECUTE ON FUNCTION public.export_full_backup() FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.export_full_backup() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'restore_full_backup') THEN
        REVOKE EXECUTE ON FUNCTION public.restore_full_backup(JSONB) FROM PUBLIC, anon, authenticated;
    END IF;

    -- Product Lifecycle & Opening Stock Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_product') THEN
        REVOKE EXECUTE ON FUNCTION public.delete_product(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_product_active_status') THEN
        REVOKE EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_product_with_opening_stock') THEN
        REVOKE EXECUTE ON FUNCTION public.register_product_with_opening_stock(
            TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT
        ) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.register_product_with_opening_stock(
            TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT
        ) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_opening_stock') THEN
        REVOKE EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;
    END IF;

    -- Provisioning Procedure (Restricted exclusively to direct DB administrators)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'provision_authorized_user') THEN
        REVOKE EXECUTE ON FUNCTION public.provision_authorized_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS COLUMN-LEVEL SECURITY & DELETION PRIVILEGE RESTRICTION
-- ------------------------------------------------------------------------------
-- First: Revoke table-level UPDATE and DELETE privileges
REVOKE UPDATE, DELETE ON public.products FROM PUBLIC, anon, authenticated;

-- Second: Explicitly and dynamically REVOKE ALL column-level privileges on public.products.
-- This guarantees that any previously granted column privileges (especially on is_active
-- and current_stock) are completely purged from pg_attribute.attacl.
DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products'
    LOOP
        EXECUTE format('REVOKE ALL (%I) ON public.products FROM PUBLIC, anon, authenticated;', col.column_name);
    END LOOP;
END $$;

-- Explicit defensive column revocations for critical sensitive attributes
REVOKE ALL (is_active) ON public.products FROM PUBLIC, anon, authenticated;
REVOKE ALL (current_stock) ON public.products FROM PUBLIC, anon, authenticated;

-- Third: Re-grant UPDATE privilege STRICTLY on permitted metadata columns.
-- NOTE: current_stock and is_active are strictly EXCLUDED.
-- Any change to is_active MUST execute via set_product_active_status(UUID, BOOLEAN) RPC.
-- Any change to current_stock MUST execute via authorized inventory approval RPCs.
GRANT UPDATE (
    sku,
    name,
    category_id,
    unit,
    purchase_price,
    selling_price,
    min_stock_level,
    description,
    updated_at
) ON public.products TO authenticated;

-- Conditionally grant UPDATE on allows_decimal_quantity if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'allows_decimal_quantity'
    ) THEN
        GRANT UPDATE (allows_decimal_quantity) ON public.products TO authenticated;
    END IF;
END $$;

-- Fourth: Table-level: authenticated can SELECT and INSERT products.
-- Direct DELETE on products is strictly revoked; deletions must route through delete_product(UUID) RPC.
GRANT SELECT, INSERT ON public.products TO authenticated;
REVOKE DELETE ON public.products FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. HARDENED DIRECT STOCK TAMPERING TRIGGER (DEFENSE-IN-DEPTH)
-- Enforces that stock mutations cannot occur via direct client queries even if GUC is set.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_direct_stock_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
        -- 1. Verify internal workflow flag is present
        IF current_setting('alamira.stock_movement_in_progress', true) IS DISTINCT FROM '1' THEN
            RAISE EXCEPTION 'لا يمكن تعديل رصيد المخزون مباشرة من جدول المنتجات. يجب استخدام أذون الإضافة أو الصرف أو فواتير المبيعات أو تسويات الجرد المعتمدة.';
        END IF;

        -- 2. Verify execution context is an authorized SECURITY DEFINER procedure (CURRENT_USER is table owner)
        -- Prevents a client session from setting the GUC locally and executing direct UPDATE statements.
        IF CURRENT_USER = SESSION_USER AND CURRENT_USER NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'عملية مرفوضة رقابياً: تعديل رصيد المخزون محظور عبر الجلسات المباشرة حتى مع ضبط متغير الحالة. يجب استدعاء دوال الاعتماد الموثقة حصراً.';
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
-- 4. EXPLICIT TABLE-LEVEL GRANTS FOR AUTHENTICATED USERS
-- ------------------------------------------------------------------------------
REVOKE ALL ON TABLE public.authorized_users,
                    public.categories,
                    public.products,
                    public.customers,
                    public.suppliers,
                    public.stock_receipts,
                    public.stock_receipt_items,
                    public.stock_issues,
                    public.stock_issue_items,
                    public.sales_invoices,
                    public.sales_invoice_items,
                    public.inventory_adjustments,
                    public.inventory_adjustment_items,
                    public.inventory_movements,
                    public.application_settings,
                    public.backup_metadata FROM PUBLIC, anon;

-- Dynamic column-level privilege purge for security-sensitive tables
DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'authorized_users'
    LOOP
        EXECUTE format('REVOKE ALL (%I) ON public.authorized_users FROM PUBLIC, anon, authenticated;', col.column_name);
    END LOOP;

    FOR col IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory_movements'
    LOOP
        EXECUTE format('REVOKE ALL (%I) ON public.inventory_movements FROM PUBLIC, anon, authenticated;', col.column_name);
    END LOOP;
END $$;

-- Read-only allowlist check
GRANT SELECT ON TABLE public.authorized_users TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.authorized_users FROM authenticated;

-- Master data & transaction tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_receipt_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_issue_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_adjustments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_adjustment_items TO authenticated;

-- Audit trail (Immutable read-only ledger)
GRANT SELECT ON TABLE public.inventory_movements TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.inventory_movements FROM authenticated;

-- Settings & Backup metadata
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.application_settings TO authenticated;
GRANT SELECT, INSERT ON TABLE public.backup_metadata TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE & AUDIT INDEXES (TRANSACTION-SAFE DDL)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_allows_decimal ON public.products(allows_decimal_quantity);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product ON public.sales_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_product ON public.stock_receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_issue_items_product ON public.stock_issue_items(product_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_items_product ON public.inventory_adjustment_items(product_id);

DO $$
BEGIN
    RAISE NOTICE 'Al-Amira Permissions and Security Hardening Migration completed successfully.';
END $$;

COMMIT;
