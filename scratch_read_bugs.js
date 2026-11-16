const fs = require('fs');
const content = fs.readFileSync('D:/Projects/System_Excel/BUG_REGISTER.md', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.startsWith('## ') || l.startsWith('### ')) {
        console.log(l);
    }
});
