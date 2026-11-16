const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /async\s+([A-Za-z0-9_]*load[A-Za-z0-9_]*|refresh[A-Za-z0-9_]*|fetch[A-Za-z0-9_]*)\s*\(/gi;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Function:', m[1], 'at', m.index);
}
