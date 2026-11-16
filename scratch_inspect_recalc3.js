const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const rcIdx = html.indexOf('recalculate() {', invStart);
console.log(html.substring(rcIdx + 1200, rcIdx + 3000));
