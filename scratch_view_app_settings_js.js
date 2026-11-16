const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');

console.log('=== Reading Settings (lines 4145 - 4180) ===');
console.log(lines.slice(4145, 4180).join('\n'));

console.log('\n=== Saving Settings (lines 4520 - 4560) ===');
console.log(lines.slice(4520, 4560).join('\n'));
