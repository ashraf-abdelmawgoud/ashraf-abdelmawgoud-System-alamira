const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');
const rootLines = lines.slice(0, 100);
console.log(rootLines.join('\n'));
