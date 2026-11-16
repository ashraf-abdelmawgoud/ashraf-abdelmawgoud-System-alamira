const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const ecIdx = html.indexOf('executeCancel()', invStart);
console.log('--- executeCancel definition ---');
console.log(html.substring(ecIdx, ecIdx + 1500));
