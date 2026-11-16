const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const idRegex = /id=["']([^"']+)["']/g;
const ids = {};
let match;
let duplicateCount = 0;
while ((match = idRegex.exec(html)) !== null) {
    const id = match[1];
    if (ids[id]) {
        ids[id]++;
        duplicateCount++;
        console.error('Duplicate ID:', id);
    } else {
        ids[id] = 1;
    }
}
console.log('Total IDs:', Object.keys(ids).length, 'Duplicates:', duplicateCount);
