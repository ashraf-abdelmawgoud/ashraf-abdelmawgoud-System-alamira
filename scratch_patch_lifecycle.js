const fs = require('fs');

let sql = fs.readFileSync('supabase/migration_product_lifecycle.sql', 'utf8');

// Ensure transactional block and is_active column check at start
const targetStart = `-- ------------------------------------------------------------------------------
-- 1. FUNCTION: delete_product`;

const replacementStart = `BEGIN;

-- ------------------------------------------------------------------------------
-- 0. SCHEMA PREREQUISITE: ENSURE is_active COLUMN EXISTS ON PRODUCTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.is_active IS 
'حالة تفعيل الصنف: true = نشط ومتاح للعمليات التجارية، false = موقوف/مؤرشف لحفظ السجلات المحاسبية والرقابية';

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: delete_product`;

if (!sql.includes(targetStart)) {
  console.error('targetStart not found in migration_product_lifecycle.sql');
  process.exit(1);
}
sql = sql.replace(targetStart, replacementStart);

// Update permissions at end to include explicit REVOKE from PUBLIC, anon and COMMIT
const targetEnd = `-- ------------------------------------------------------------------------------
-- 3. PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;`;

const replacementEnd = `-- ------------------------------------------------------------------------------
-- 3. PERMISSIONS: REVOKE FROM PUBLIC/ANON AND GRANT TO AUTHENTICATED
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.delete_product(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_active_status(UUID, BOOLEAN) TO authenticated;

COMMIT;`;

if (!sql.includes(targetEnd)) {
  console.error('targetEnd not found in migration_product_lifecycle.sql');
  process.exit(1);
}
sql = sql.replace(targetEnd, replacementEnd);

fs.writeFileSync('supabase/migration_product_lifecycle.sql', sql, 'utf8');
console.log('migration_product_lifecycle.sql successfully updated!');
