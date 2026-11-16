const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');
let start = -1;
lines.forEach((l, i) => {
  if (l.includes('const DashboardModule =') || l.includes('var DashboardModule =') || l.includes('DashboardModule = {')) {
    start = i;
  }
});
console.log('DashboardModule at line', start + 1);
if (start !== -1) {
  console.log(lines.slice(start, start + 100).join('\n'));
}
