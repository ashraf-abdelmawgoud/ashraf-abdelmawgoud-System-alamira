const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const custStart = html.indexOf('const CustomersModule =');
console.log('--- CustomersModule in index.html ---');
console.log(html.substring(custStart, custStart + 3500));
