const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const vsStart = html.indexOf('id="view-settings"');
console.log('view-settings start:', vsStart);
const vsEnd = html.indexOf('</section>', vsStart);
console.log('view-settings end:', vsEnd);
console.log('Length of view-settings:', vsEnd - vsStart);
