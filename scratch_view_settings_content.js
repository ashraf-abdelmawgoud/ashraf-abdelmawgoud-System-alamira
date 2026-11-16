const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const vsStart = html.indexOf('id="view-settings"');
const vsEnd = html.indexOf('</section>', vsStart) + 10;
console.log(html.substring(vsStart - 30, vsStart + 500));
console.log('...\n', html.substring(vsEnd - 300, vsEnd));
