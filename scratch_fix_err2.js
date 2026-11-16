const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('const App = {\n            async \n            formatErrorMessage', 'const App = {\n            formatErrorMessage');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed async formatErrorMessage');
