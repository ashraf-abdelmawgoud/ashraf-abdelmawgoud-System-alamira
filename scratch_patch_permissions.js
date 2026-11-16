const fs = require('fs');

let sql = fs.readFileSync('supabase/migration_fix_permissions_and_ddl.sql', 'utf8');

// 1. Add BEGIN; at top
const targetTop = `DO $$
BEGIN
    RAISE NOTICE 'Starting Al-Amira Permissions and Security Hardening Migration...';
END $$;`;

const replacementTop = `BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Starting Al-Amira Permissions and Security Hardening Migration...';
END $$;`;

if (!sql.includes(targetTop)) {
  console.error('targetTop not found');
  process.exit(1);
}
sql = sql.replace(targetTop, replacementTop);

// 2. Replace blanket revocation with targeted RPC revocations
const targetFuncSection = `-- ------------------------------------------------------------------------------
-- 1. FUNCTION EXECUTION PRIVILEGES (RPC SECURITY)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- Grant EXECUTE on core RPC business functions to 'authenticated'
DO $$
BEGIN
    -- Authorization & System Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_authorized_user') THEN
        GRANT EXECUTE ON FUNCTION public.is_authorized_user() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_active_user') THEN
        GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
    END IF;

    -- Document Approval & Workflow Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_stock_receipt') THEN
        GRANT EXECUTE ON FUNCTION public.approve_stock_receipt(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_stock_issue') THEN
        GRANT EXECUTE ON FUNCTION public.approve_stock_issue(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_sales_invoice') THEN
        GRANT EXECUTE ON FUNCTION public.approve_sales_invoice(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cancel_sales_invoice') THEN
        GRANT EXECUTE ON FUNCTION public.cancel_sales_invoice(UUID, TEXT) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_stock_adjustment') THEN
        GRANT EXECUTE ON FUNCTION public.approve_stock_adjustment(UUID) TO authenticated;
    END IF;

    -- Backup Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'export_full_backup') THEN
        GRANT EXECUTE ON FUNCTION public.export_full_backup() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'restore_full_backup') THEN
        REVOKE EXECUTE ON FUNCTION public.restore_full_backup(JSONB) FROM PUBLIC, anon, authenticated;
    END IF;

    -- Product Lifecycle & Opening Stock Functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_product') THEN
        GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_product_active_status') THEN
        GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_product_with_opening_stock') THEN
        GRANT EXECUTE ON FUNCTION public.register_product_with_opening_stock(
            TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT
        ) TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_opening_stock') THEN
        GRANT EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;
    END IF;
END $$;`;

const replacementFuncSection = `-- ------------------------------------------------------------------------------
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
END $$;`;

if (!sql.includes(targetFuncSection)) {
  console.error('targetFuncSection not found');
  process.exit(1);
}
sql = sql.replace(targetFuncSection, replacementFuncSection);

// 3. Conditional column-level permissions
const targetProdCols = `REVOKE UPDATE ON public.products FROM PUBLIC, anon, authenticated;
GRANT UPDATE (
    sku,
    name,
    category_id,
    unit,
    purchase_price,
    selling_price,
    min_stock_level,
    description,
    allows_decimal_quantity,
    is_active,
    updated_at
) ON public.products TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.products TO authenticated;`;

const replacementProdCols = `REVOKE UPDATE ON public.products FROM PUBLIC, anon, authenticated;
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

-- Conditionally grant UPDATE on optional/migrated columns only if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'allows_decimal_quantity'
    ) THEN
        GRANT UPDATE (allows_decimal_quantity) ON public.products TO authenticated;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active'
    ) THEN
        GRANT UPDATE (is_active) ON public.products TO authenticated;
    END IF;
END $$;

GRANT SELECT, INSERT, DELETE ON public.products TO authenticated;`;

if (!sql.includes(targetProdCols)) {
  console.error('targetProdCols not found');
  process.exit(1);
}
sql = sql.replace(targetProdCols, replacementProdCols);

// 4. Add COMMIT; at end
const targetEndNotice = `DO $$
BEGIN
    RAISE NOTICE 'Al-Amira Permissions and Security Hardening Migration completed successfully.';
END $$;`;

const replacementEndNotice = `DO $$
BEGIN
    RAISE NOTICE 'Al-Amira Permissions and Security Hardening Migration completed successfully.';
END $$;

COMMIT;`;

if (!sql.includes(targetEndNotice)) {
  console.error('targetEndNotice not found');
  process.exit(1);
}
sql = sql.replace(targetEndNotice, replacementEndNotice);

fs.writeFileSync('supabase/migration_fix_permissions_and_ddl.sql', sql, 'utf8');
console.log('migration_fix_permissions_and_ddl.sql successfully updated!');
