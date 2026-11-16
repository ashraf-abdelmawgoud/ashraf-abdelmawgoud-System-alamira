const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /BackupRestoreModule\s*[:=]/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Match at', m.index, html.substring(m.index, m.index + 500));
}
