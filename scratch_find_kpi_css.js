const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('.grid-kpi') || l.includes('.kpi-card') || l.includes('.dashboard-2col')) {
    console.log(i + 1, l);
  }
});
