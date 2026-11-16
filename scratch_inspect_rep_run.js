const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const repStart = html.indexOf('const ReportsModule =');
console.log(html.substring(repStart + 3500, repStart + 7000));
