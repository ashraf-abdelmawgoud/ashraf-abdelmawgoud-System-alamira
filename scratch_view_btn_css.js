const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');
console.log(lines.slice(505, 560).join('\n'));
