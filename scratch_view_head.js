const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const headEnd = html.indexOf('</head>');
console.log(html.substring(0, headEnd));
