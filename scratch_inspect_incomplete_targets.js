const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');

console.log('=== Lines 130 - 165 ===');
console.log(lines.slice(130, 165).join('\n'));

// Search for inventory adjustments form / modal
console.log('\n=== Search: Adjustments Form ===');
lines.forEach((l, i) => {
    if (l.includes('modal-adjustment') || l.includes('record_stock_adjustment') || l.includes('saveAdjustment')) {
        console.log(i + 1, l.trim());
    }
});

// Search for ExportModule / exportToExcel / fullBackup
console.log('\n=== Search: ExportModule ===');
lines.forEach((l, i) => {
    if (l.includes('ExportModule') || l.includes('exportToExcel') || l.includes('export_full_backup')) {
        console.log(i + 1, l.trim());
    }
});
