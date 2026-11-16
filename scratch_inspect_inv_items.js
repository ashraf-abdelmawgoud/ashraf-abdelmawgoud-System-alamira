const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf(".from('sales_invoice_items')\n                        .insert(");
console.log('--- sales_invoice_items insert ---');
console.log(html.substring(idx - 600, idx + 200));
