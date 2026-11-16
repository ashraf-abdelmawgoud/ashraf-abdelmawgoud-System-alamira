const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const matches = [...html.matchAll(/settings-supabase-url-display/g)];
console.log('Matches:', matches.length);
