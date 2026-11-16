const fs = require('fs');
const content = fs.readFileSync('D:/Projects/System_Excel/BUG_REGISTER.md', 'utf8');
const lines = content.split('\n');

const bugTargets = ['BUG-HIGH-04', 'BUG-MED-03', 'BUG-MED-04', 'BUG-LOW-02', 'BUG-LOW-03'];
bugTargets.forEach(target => {
    console.log(`\n=================== ${target} ===================`);
    const idx = lines.findIndex(l => l.includes(target));
    if (idx !== -1) {
        console.log(lines.slice(Math.max(0, idx - 2), idx + 25).join('\n'));
    } else {
        console.log('Not found');
    }
});
