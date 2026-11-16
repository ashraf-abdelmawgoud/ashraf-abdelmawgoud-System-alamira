const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const emStart = html.indexOf('const ExportModule =');
console.log('--- ExportModule in index.html ---');
console.log(html.substring(emStart, emStart + 3500));
