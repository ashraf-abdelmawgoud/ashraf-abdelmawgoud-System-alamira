const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const dpIdx = html.indexOf('deleteProduct(');
console.log('--- deleteProduct in index.html ---');
console.log(html.substring(dpIdx, dpIdx + 3000));
