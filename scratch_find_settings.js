const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('Contains BackupRestoreModule:', html.includes('BackupRestoreModule'));
console.log('Contains SettingsSection:', html.includes('SettingsSection'));

// Search occurrences of BackupRestoreModule
let idx = 0;
while ((idx = html.indexOf('BackupRestoreModule', idx)) !== -1) {
  console.log('BackupRestoreModule at:', idx, 'snippet:', html.substring(Math.max(0, idx - 40), idx + 80).replace(/\n/g, ' '));
  idx += 19;
}

// Search occurrences of SettingsSection
idx = 0;
while ((idx = html.indexOf('SettingsSection', idx)) !== -1) {
  console.log('SettingsSection at:', idx, 'snippet:', html.substring(Math.max(0, idx - 40), idx + 80).replace(/\n/g, ' '));
  idx += 15;
}
