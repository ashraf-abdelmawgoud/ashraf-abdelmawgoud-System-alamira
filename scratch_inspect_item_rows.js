const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('const itemRows');
console.log('--- itemRows definition ---');
console.log(html.substring(idx - 100, idx + 1200));
