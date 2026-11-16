const fs = require('fs');

let sql = fs.readFileSync('supabase/migration_opening_balance.sql', 'utf8');

// 1. Add BEGIN; at top
const targetTop = `-- ------------------------------------------------------------------------------
-- 1. FUNCTION: register_product_with_opening_stock`;

const replacementTop = `BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: register_product_with_opening_stock`;

if (!sql.includes(targetTop)) {
  console.error('targetTop not found in migration_opening_balance.sql');
  process.exit(1);
}
sql = sql.replace(targetTop, replacementTop);

// 2. Add is_active check in register_opening_stock
const targetActiveCheck = `    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود';
    END IF;

    IF v_product.current_stock <> 0 THEN`;

const replacementActiveCheck = `    IF NOT FOUND THEN
        RAISE EXCEPTION 'الصنف المطلوب غير موجود';
    END IF;

    IF NOT v_product.is_active THEN
        RAISE EXCEPTION 'الصنف "%" موقوف/مؤرشف ولا يمكن تسجيل رصيد افتتاحي له. يرجى إعادة تفعيل الصنف أولاً.', v_product.name;
    END IF;

    IF v_product.current_stock <> 0 THEN`;

if (!sql.includes(targetActiveCheck)) {
  console.error('targetActiveCheck not found');
  process.exit(1);
}
sql = sql.replace(targetActiveCheck, replacementActiveCheck);

// 3. Add COMMIT; at bottom
const targetBottom = `REVOKE EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;`;

const replacementBottom = `REVOKE EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_opening_stock(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;

COMMIT;`;

if (!sql.includes(targetBottom)) {
  console.error('targetBottom not found');
  process.exit(1);
}
sql = sql.replace(targetBottom, replacementBottom);

fs.writeFileSync('supabase/migration_opening_balance.sql', sql, 'utf8');
console.log('migration_opening_balance.sql successfully updated!');
