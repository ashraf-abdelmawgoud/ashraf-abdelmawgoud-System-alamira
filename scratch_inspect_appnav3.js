const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const navIdx = html.indexOf('navigate(viewId');
console.log(html.substring(navIdx + 1000, navIdx + 2000));
