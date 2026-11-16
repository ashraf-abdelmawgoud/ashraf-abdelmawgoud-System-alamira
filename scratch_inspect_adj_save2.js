const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const adjPos = html.indexOf('const AdjustmentsModule =');
console.log(html.substring(adjPos + 4800, adjPos + 7500));
