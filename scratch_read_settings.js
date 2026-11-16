const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const ssIdx = html.indexOf('const SettingsSection');
console.log('--- SettingsSection definition ---');
console.log(html.substring(ssIdx, ssIdx + 3000));

// Find BackupRestoreModule definition
const brmIdx = html.indexOf('BackupRestoreModule');
let searchPos = ssIdx - 8000;
const brmPos = html.indexOf('BackupRestore', searchPos);
console.log('\n--- BackupRestore around:', brmPos);
if (brmPos !== -1) {
  console.log(html.substring(brmPos - 50, brmPos + 2500));
}
