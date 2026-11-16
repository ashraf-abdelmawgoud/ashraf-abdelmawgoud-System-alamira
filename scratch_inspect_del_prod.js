const fs = require('fs');

const combined = fs.readFileSync('supabase/combined_setup.sql', 'utf8');

const regex = /delete_product/g;
let m;
while ((m = regex.exec(combined)) !== null) {
    console.log('Match at', m.index);
    console.log(combined.substring(Math.max(0, m.index - 100), m.index + 200));
}
