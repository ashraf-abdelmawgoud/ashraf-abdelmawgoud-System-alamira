const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const cdIdx = html.indexOf('confirmDelete(');
console.log('--- confirmDelete ---');
console.log(html.substring(cdIdx, cdIdx + 3000));
