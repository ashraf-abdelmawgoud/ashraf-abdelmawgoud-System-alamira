const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const adjPos = html.indexOf('const AdjustmentsModule =');
console.log('--- AdjustmentsModule in index.html ---');
console.log(html.substring(adjPos, adjPos + 2500));
