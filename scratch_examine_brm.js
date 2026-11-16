const fs = require('fs');
const oldHtml = fs.readFileSync('index.html.backup_pre_redesign', 'utf8');

const idx = oldHtml.indexOf('BackupRestoreModule = {');
console.log(oldHtml.substring(idx, idx + 3500));
