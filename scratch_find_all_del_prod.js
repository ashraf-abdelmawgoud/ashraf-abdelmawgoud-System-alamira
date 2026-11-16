const fs = require('fs');

const combined = fs.readFileSync('supabase/combined_setup.sql', 'utf8');

const regex = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.delete_product/g;
let m;
while ((m = regex.exec(combined)) !== null) {
    console.log('GRANT delete_product at', m.index);
    console.log(combined.substring(m.index, m.index + 120));
}

const createRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.delete_product/g;
while ((m = createRegex.exec(combined)) !== null) {
    console.log('CREATE delete_product at', m.index);
    console.log(combined.substring(m.index, m.index + 120));
}
