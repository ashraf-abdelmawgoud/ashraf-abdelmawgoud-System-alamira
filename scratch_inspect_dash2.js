const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const needle = 'id="view-dashboard"';
const idx = html.indexOf(needle);
if (idx !== -1) {
  console.log(html.substring(idx + 2500, idx + 6500));
}
