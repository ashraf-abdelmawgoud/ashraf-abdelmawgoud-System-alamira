const fs = require('fs');

const fns = fs.readFileSync('supabase/functions.sql', 'utf8');

const regex = /register_product_with_opening_stock/g;
let m;
while ((m = regex.exec(fns)) !== null) {
    console.log('Match at', m.index);
    console.log(fns.substring(Math.max(0, m.index - 100), m.index + 200));
}
