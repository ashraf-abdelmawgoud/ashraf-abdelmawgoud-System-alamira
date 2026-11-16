const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find Company Info
console.log('--- COMPANY INFO REFERENCES ---');
const companyMatches = [...html.matchAll(/(company[A-Za-z0-9_]*|Company[A-Za-z0-9_]*)/g)].map(m => m[1]);
console.log('Company identifiers:', [...new Set(companyMatches)].slice(0, 20));

// Find ConfigModal
console.log('\n--- CONFIG / MODAL REFERENCES ---');
const configMatches = [...html.matchAll(/openConfigModal|configModal|systemConfig/gi)].map(m => m[0]);
console.log('Config matches:', [...new Set(configMatches)]);

// Find BackupRestoreModule
console.log('\n--- BackupRestoreModule ---');
const brmIdx = html.indexOf('const BackupRestoreModule');
const brmIdx2 = html.indexOf('BackupRestoreModule =');
console.log('BackupRestoreModule at:', brmIdx, brmIdx2);
const pos = brmIdx !== -1 ? brmIdx : brmIdx2;
if (pos !== -1) {
  console.log(html.substring(pos, pos + 1500));
}

// Find SettingsSection
console.log('\n--- SettingsSection ---');
const ssIdx = html.indexOf('SettingsSection');
if (ssIdx !== -1) {
  console.log(html.substring(ssIdx, ssIdx + 1000));
}
