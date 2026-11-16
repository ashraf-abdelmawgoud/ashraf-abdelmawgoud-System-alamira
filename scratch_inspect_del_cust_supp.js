const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const custStart = html.indexOf('const CustomersModule =');
const delIdx = html.indexOf('async deleteCustomer(', custStart);
console.log('--- deleteCustomer in CustomersModule ---');
console.log(html.substring(delIdx, delIdx + 1500));

const suppStart = html.indexOf('const SuppliersModule =');
const delSupIdx = html.indexOf('async deleteSupplier(', suppStart);
console.log('\n--- deleteSupplier in SuppliersModule ---');
console.log(html.substring(delSupIdx, delSupIdx + 1500));
