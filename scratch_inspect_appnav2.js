const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const navIdx = html.indexOf('navigate(viewId');
console.log(html.substring(navIdx, navIdx + 1500));
