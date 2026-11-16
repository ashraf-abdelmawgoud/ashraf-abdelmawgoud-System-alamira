const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mqIdx = html.indexOf('@media (max-width: 768px)');
console.log('--- MEDIA QUERY 768px ---');
console.log(html.substring(mqIdx, mqIdx + 2000));
