const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const spIdx = html.indexOf('async saveProduct(');
console.log('--- ProductsModule.saveProduct in index.html ---');
console.log(html.substring(spIdx, spIdx + 3000));
