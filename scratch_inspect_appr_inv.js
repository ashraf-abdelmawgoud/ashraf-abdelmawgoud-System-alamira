const fs = require('fs');

const fns = fs.readFileSync('supabase/functions.sql', 'utf8');

const invFnIdx = fns.indexOf('approve_sales_invoice(');
console.log('--- functions.sql: approve_sales_invoice ---');
console.log(fns.substring(invFnIdx, invFnIdx + 3000));
