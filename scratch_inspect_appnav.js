const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const navIdx = html.indexOf('navigate(viewId');
console.log('--- App.navigate definition ---');
console.log(html.substring(navIdx - 50, navIdx + 600));
