const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scriptStart = html.indexOf('<script>');
const script = html.substring(scriptStart);

const idx = script.indexOf('openDeleteModal(');
console.log('--- openDeleteModal in script ---');
console.log(script.substring(idx, idx + 1500));
