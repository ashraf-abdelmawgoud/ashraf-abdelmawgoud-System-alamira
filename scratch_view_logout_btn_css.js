const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const match = html.match(/\.sidebar-logout-btn[\s\S]*?\}/g);
console.log(match);
