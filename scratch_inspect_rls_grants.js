const fs = require('fs');

const rls = fs.readFileSync('supabase/rls.sql', 'utf8');

const regex = /GRANT\s+[\s\S]*?;/gi;
let m;
console.log('All GRANT statements in rls.sql:');
while ((m = regex.exec(rls)) !== null) {
    console.log('---------------------------------');
    console.log(m[0].replace(/\s+/g, ' ').trim());
}
