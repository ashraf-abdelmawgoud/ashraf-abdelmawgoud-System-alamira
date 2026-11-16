const fs = require('fs');

const fns = fs.readFileSync('supabase/functions.sql', 'utf8');

const cnclFnIdx = fns.indexOf('cancel_sales_invoice(');
console.log('--- functions.sql: cancel_sales_invoice ---');
console.log(fns.substring(cnclFnIdx, cnclFnIdx + 3000));
