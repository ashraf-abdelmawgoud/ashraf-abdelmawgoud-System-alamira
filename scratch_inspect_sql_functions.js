const fs = require('fs');

// Check all SQL files for function definitions
const sqlFiles = [
    'supabase/schema.sql',
    'supabase/functions.sql',
    'supabase/combined_setup.sql',
    'supabase/migration_decimal_quantities.sql',
    'supabase/migration_opening_balance.sql',
    'supabase/migration_product_lifecycle.sql',
    'supabase/rls.sql',
    'supabase/seed.sql',
    'supabase/all_in_one_setup.sql'
];

sqlFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    console.log(`\n================== ${file} ==================`);
    const fnRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*RETURNS\s+([\s\S]*?)\s+AS/gi;
    let m;
    while ((m = fnRegex.exec(content)) !== null) {
        console.log(`Function: ${m[1]}`);
        console.log(`  Params: ${m[2].replace(/\s+/g, ' ').trim()}`);
        console.log(`  Returns: ${m[3].replace(/\s+/g, ' ').trim()}`);
    }
});
