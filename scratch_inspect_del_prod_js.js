const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scriptStart = html.indexOf('<script>');
const script = html.substring(scriptStart);

const idx = script.indexOf('delete_product');
console.log('--- delete_product in script ---');
console.log(script.substring(idx - 200, idx + 1200));
