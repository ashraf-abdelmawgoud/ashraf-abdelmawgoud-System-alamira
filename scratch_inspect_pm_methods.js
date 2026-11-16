const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const prodStart = html.indexOf('ProductsModule = {');
const prodEnd = html.indexOf('ReceiptsModule = {', prodStart);
const prodCode = html.substring(prodStart, prodEnd !== -1 ? prodEnd : prodStart + 30000);

// Find all methods in ProductsModule
const methods = [...prodCode.matchAll(/([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g)].map(m => m[1]);
console.log('Methods in ProductsModule:', [...new Set(methods)]);

// Find delete methods
const delIdx = prodCode.indexOf('delete');
console.log('--- delete in ProductsModule ---');
console.log(prodCode.substring(delIdx - 50, delIdx + 2000));
