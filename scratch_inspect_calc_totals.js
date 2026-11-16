const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const calcIdx = html.indexOf('calculateTotals(');
console.log('--- InvoicesModule.calculateTotals ---');
console.log(html.substring(calcIdx, calcIdx + 2000));
