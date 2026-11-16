const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const repStart = html.indexOf('const ReportsModule =');
const siIdx = html.indexOf("reportType === 'sales_invoices'", repStart);
console.log('--- sales_invoices report logic ---');
console.log(html.substring(siIdx, siIdx + 2000));
