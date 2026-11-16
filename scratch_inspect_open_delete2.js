const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const prodModIdx = html.indexOf('const ProductsModule =');
const idx = html.indexOf('openDeleteModal', prodModIdx);
console.log('--- ProductsModule.openDeleteModal ---');
console.log(html.substring(idx, idx + 1500));
