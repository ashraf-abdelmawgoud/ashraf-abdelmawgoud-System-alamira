const fs = require('fs');

const rls = fs.readFileSync('supabase/rls.sql', 'utf8');
console.log(rls.substring(0, 3000));
