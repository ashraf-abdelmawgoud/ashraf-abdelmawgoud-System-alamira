const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const fadIdx = html.indexOf('fetchAllData()');
console.log('fetchAllData at:', fadIdx);
if (fadIdx !== -1) {
  console.log(html.substring(fadIdx, fadIdx + 2000));
}
