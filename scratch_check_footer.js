const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const idx = html.indexOf('class="sidebar-footer"');
console.log(html.substring(idx, idx + 800));
