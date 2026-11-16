const fs = require('fs');
const oldHtml = fs.readFileSync('index.html.backup_pre_redesign', 'utf8');

const regex = /BackupRestoreModule|exportBackup/g;
let m;
while ((m = regex.exec(oldHtml)) !== null) {
  console.log('Old match at', m.index, oldHtml.substring(m.index, m.index + 500));
}
