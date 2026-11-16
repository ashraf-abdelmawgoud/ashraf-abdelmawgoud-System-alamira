const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');
console.log('--- KPI CSS (415-470) ---');
console.log(lines.slice(414, 470).join('\n'));
console.log('--- DASHBOARD 2COL (1125-1150) ---');
console.log(lines.slice(1125, 1150).join('\n'));
