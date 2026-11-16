const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /catch\s*\((?:err|error)\)\s*\{/g;
let m;
let count = 0;
while ((m = regex.exec(html)) !== null && count < 10) {
  count++;
  console.log(`Catch ${count} at ${m.index}:`, html.substring(m.index, m.index + 200).replace(/\n/g, ' '));
}
console.log('Total catch blocks:', html.split(/catch\s*\((?:err|error)\)/).length - 1);
