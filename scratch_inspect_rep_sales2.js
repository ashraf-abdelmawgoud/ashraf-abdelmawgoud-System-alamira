const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const repStart = html.indexOf('const ReportsModule =');
const sbpIdx = html.indexOf('sales_by_period', repStart);
console.log('--- sales_by_period ---');
console.log(html.substring(sbpIdx - 50, sbpIdx + 2000));
