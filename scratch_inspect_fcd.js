const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const fcdIdx = html.indexOf('fetchCloudData');
console.log('fetchCloudData at:', fcdIdx);
if (fcdIdx !== -1) {
  console.log(html.substring(fcdIdx - 20, fcdIdx + 2000));
}
