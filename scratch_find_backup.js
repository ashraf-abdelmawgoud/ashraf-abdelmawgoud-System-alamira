const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /exportBackup|backup|restore/gi;
let m;
const found = new Set();
while ((m = regex.exec(html)) !== null) {
  const line = html.substring(Math.max(0, m.index - 30), m.index + 50).replace(/\n/g, ' ');
  // find identifiers
  const idMatch = line.match(/[a-zA-Z0-9_.]*(?:backup|restore)[a-zA-Z0-9_.]*/i);
  if (idMatch) found.add(idMatch[0]);
}
console.log('Found identifiers:', [...found]);
