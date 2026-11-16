const fs = require('fs');

const files = [
  'supabase/migration_decimal_quantities.sql',
  'supabase/migration_product_lifecycle.sql',
  'supabase/migration_opening_balance.sql',
  'supabase/migration_fix_permissions_and_ddl.sql',
  'supabase/functions.sql',
  'supabase/schema.sql',
  'supabase/combined_setup.sql'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/END \$;/g, () => 'END $$;');
  content = content.replace(/END; \$;/g, () => 'END;\n$$;');
  fs.writeFileSync(f, content, 'utf8');
  
  // Verify
  const verified = fs.readFileSync(f, 'utf8');
  const hasSingle = verified.includes('END $;') || verified.includes('END; $;');
  console.log(f, 'has single $;', hasSingle);
});
