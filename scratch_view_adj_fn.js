const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('record_stock_adjustment') || l.includes('saveAdjustment') || l.includes('openAdjustmentModal') || l.includes('openNewAdjustmentModal')) {
        console.log(i + 1, l.trim());
    }
});
