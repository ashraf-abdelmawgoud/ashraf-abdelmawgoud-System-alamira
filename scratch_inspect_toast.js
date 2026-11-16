const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const stIdx = html.indexOf('function showToast');
console.log('--- showToast definition ---');
console.log(html.substring(stIdx, stIdx + 800));
