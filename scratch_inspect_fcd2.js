const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const fcdIdx = html.indexOf('fetchCloudData');
console.log(html.substring(fcdIdx + 1500, fcdIdx + 3000));
