const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const vdStart = html.indexOf('id="view-dashboard"');
const vdEnd = html.indexOf('</section>', vdStart);
console.log('--- VIEW-DASHBOARD ---');
console.log(html.substring(vdStart, vdEnd + 10));
