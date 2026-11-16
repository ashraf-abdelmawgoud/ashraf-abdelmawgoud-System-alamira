const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const sStart = html.indexOf('<style>');
const sEnd = html.indexOf('</style>');
console.log('Style start:', sStart, 'end:', sEnd);

// Check media queries and responsive rules near sEnd
console.log('CSS near end:');
console.log(html.substring(sEnd - 1200, sEnd));
