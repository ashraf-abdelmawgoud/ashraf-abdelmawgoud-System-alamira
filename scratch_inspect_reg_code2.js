const fs = require('fs');

const fns = fs.readFileSync('supabase/functions.sql', 'utf8');

const regIdx = fns.indexOf('register_product_with_opening_stock');
console.log(fns.substring(regIdx + 2500, regIdx + 4500));
