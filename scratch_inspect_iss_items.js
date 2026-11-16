const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf(".from('stock_issue_items')");
console.log('--- stock_issue_items insert ---');
console.log(html.substring(idx - 400, idx + 300));
