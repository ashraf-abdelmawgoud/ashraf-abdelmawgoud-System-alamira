const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const rcIdx = html.indexOf('recalculate()', invStart);
console.log('--- recalculate ---');
console.log(html.substring(rcIdx, rcIdx + 2500));
