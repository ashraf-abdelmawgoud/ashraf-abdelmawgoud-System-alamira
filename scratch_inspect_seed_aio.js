const fs = require('fs');

console.log('--- all_in_one_setup.sql ---');
console.log(fs.readFileSync('supabase/all_in_one_setup.sql', 'utf8'));

console.log('\n--- seed.sql ---');
console.log(fs.readFileSync('supabase/seed.sql', 'utf8'));
