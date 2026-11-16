const fs = require('fs');

const migrations = [
    'supabase/migration_decimal_quantities.sql',
    'supabase/migration_product_lifecycle.sql',
    'supabase/migration_opening_balance.sql',
    'supabase/combined_setup.sql'
];

migrations.forEach(m => {
    console.log(`\n======================================================`);
    console.log(`FILE: ${m}`);
    console.log(`======================================================`);
    const content = fs.readFileSync(m, 'utf8');
    const lines = content.split('\n');
    console.log('Lines count:', lines.length);
    console.log('Header comments:');
    console.log(lines.slice(0, 25).join('\n'));
});
