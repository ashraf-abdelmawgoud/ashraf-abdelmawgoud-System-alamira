const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const idx = html.indexOf('formatErrorMessage');
console.log(html.substring(Math.max(0, idx - 150), idx + 400));
