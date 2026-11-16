const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const rtIdx = html.indexOf('renderTable()', invStart);
console.log(html.substring(rtIdx + 4000, rtIdx + 6000));
