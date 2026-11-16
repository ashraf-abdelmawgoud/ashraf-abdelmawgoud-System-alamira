const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const spIdx = html.indexOf('async saveProduct(');
console.log(html.substring(spIdx + 7500, spIdx + 10500));
