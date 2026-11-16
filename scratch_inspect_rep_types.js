const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const repStart = html.indexOf('const ReportsModule =');
const repEnd = html.indexOf('const ExportModule =', repStart);
const repCode = html.substring(repStart, repEnd);

const regex = /reportType\s*===\s*['"]([^'"]+)['"]/g;
let m;
console.log('Report types handled in ReportsModule:');
while ((m = regex.exec(repCode)) !== null) {
    console.log('  -', m[1]);
}
