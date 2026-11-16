const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const repStart = html.indexOf('const ReportsModule =');
console.log('--- ReportsModule in index.html ---');
console.log(html.substring(repStart, repStart + 3500));
