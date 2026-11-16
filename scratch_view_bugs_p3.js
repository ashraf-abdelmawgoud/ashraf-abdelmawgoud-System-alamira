const fs = require('fs');
const content = fs.readFileSync('D:/Projects/System_Excel/BUG_REGISTER.md', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(250).join('\n'));
