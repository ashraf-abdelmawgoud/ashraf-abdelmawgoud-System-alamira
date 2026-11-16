const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const raIdx = html.indexOf('renderAll() {');
console.log('renderAll at:', raIdx);
if (raIdx !== -1) {
  console.log(html.substring(raIdx, raIdx + 1200));
}
