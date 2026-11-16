const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const rtIdx = html.indexOf('renderTable()', invStart);
console.log('--- renderTable in InvoicesModule ---');
console.log(html.substring(rtIdx, rtIdx + 3000));
