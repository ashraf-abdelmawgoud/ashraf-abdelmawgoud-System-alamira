const fs = require('fs');

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const combined = fs.readFileSync('supabase/combined_setup.sql', 'utf8');

const regex = /GRANT\s+[\s\S]*?;/gi;
console.log('--- GRANTs in schema.sql:');
let m;
while ((m = regex.exec(schema)) !== null) {
    console.log(m[0].replace(/\s+/g, ' ').trim());
}

console.log('\n--- GRANTs in combined_setup.sql:');
while ((m = regex.exec(combined)) !== null) {
    console.log(m[0].replace(/\s+/g, ' ').trim());
}
