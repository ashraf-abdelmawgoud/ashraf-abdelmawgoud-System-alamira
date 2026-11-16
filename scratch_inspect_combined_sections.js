const fs = require('fs');

const combined = fs.readFileSync('supabase/combined_setup.sql', 'utf8');

// Find major section headers
const sections = [...combined.matchAll(/--\s*=+[\r\n]+--\s*([^\r\n]+)[\r\n]+--\s*=+/g)].map(m => m[1]);
console.log('Major section headers in combined_setup.sql:');
sections.forEach(s => console.log('  -', s));
