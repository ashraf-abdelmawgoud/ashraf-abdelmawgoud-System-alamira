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
  let fixed = false;
  if (content.includes('END $;')) {
    content = content.replace(/END \$;/g, 'END $$;');
    fixed = true;
  }
  if (content.includes('END; $;')) {
    content = content.replace(/END; \$;/g, 'END;\n$$;');
    fixed = true;
  }
  if (fixed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed in:', f);
  }
  
  // Verify $$ pairs are even
  const count = (content.match(/\$\$/g) || []).length;
  console.log(`${f}: $$ count = ${count} (${count % 2 === 0 ? 'EVEN - OK' : 'ODD - ERROR!'})`);
});
