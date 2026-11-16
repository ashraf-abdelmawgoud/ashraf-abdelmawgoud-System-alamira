const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const pcIdx = html.indexOf('promptCancel(', invStart);
console.log('--- promptCancel & executeCancel in InvoicesModule ---');
console.log(html.substring(pcIdx, pcIdx + 2000));
