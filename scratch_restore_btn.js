const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Find the Backup Status Banner buttons in view-settings
const targetStr = `<button class="btn btn-primary" onclick="BackupRestoreModule.createFullBackup()">
                                        <i class="fa-solid fa-download"></i> إنشاء نسخة احتياطية كاملة (JSON)
                                    </button>`;

const replacementStr = `<button class="btn btn-primary" onclick="BackupRestoreModule.createFullBackup()">
                                        <i class="fa-solid fa-download"></i> إنشاء نسخة احتياطية كاملة (JSON)
                                    </button>
                                    <button id="btn-restore-backup" class="btn btn-outline" onclick="BackupRestoreModule.triggerRestoreFileDialog()" title="استعادة عبر الخادم فقط">
                                        <i class="fa-solid fa-upload"></i> استعادة نسخة احتياطية
                                    </button>
                                    <input type="file" id="backup-file-input" accept=".json" style="display: none;" onchange="BackupRestoreModule.triggerRestoreFileDialog()">`;

html = html.replace(targetStr, replacementStr);
fs.writeFileSync('index.html', html, 'utf8');
console.log('Restored btn-restore-backup and backup-file-input');
