const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const custStart = html.indexOf('const CustomersModule =');
console.log(html.substring(custStart + 3000, custStart + 6000));
