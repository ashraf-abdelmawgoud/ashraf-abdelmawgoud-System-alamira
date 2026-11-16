const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('sidebar-') || l.includes('toggleSidebar') || l.includes('sidebar.classList') || l.includes('menu-item')) {
    if (i > 1350) { // JS area
      console.log(i + 1, l.trim());
    }
  }
});
