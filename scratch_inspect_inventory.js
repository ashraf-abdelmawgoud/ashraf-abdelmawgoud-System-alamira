const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const viStart = html.indexOf('id="view-inventory"');
const viEnd = html.indexOf('id="view-invoices"', viStart);
console.log('--- VIEW-INVENTORY ---');
console.log(html.substring(viStart, viStart + 2000));
