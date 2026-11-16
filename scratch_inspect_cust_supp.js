const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const vcStart = html.indexOf('id="view-customers"');
const vsStart = html.indexOf('id="view-suppliers"');
const vrStart = html.indexOf('id="view-reports"');
console.log('--- VIEW-CUSTOMERS ---');
console.log(html.substring(vcStart, vcStart + 1000));
console.log('\n--- VIEW-SUPPLIERS ---');
console.log(html.substring(vsStart, vsStart + 1000));
