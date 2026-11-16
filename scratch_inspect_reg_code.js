const fs = require('fs');

const fns = fs.readFileSync('supabase/functions.sql', 'utf8');

const regIdx = fns.indexOf('register_product_with_opening_stock');
console.log('--- functions.sql: register_product_with_opening_stock ---');
console.log(fns.substring(regIdx, regIdx + 3000));
