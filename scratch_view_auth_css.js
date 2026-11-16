const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('.auth-card') || l.includes('.auth-logo') || l.includes('.auth-screen')) {
    console.log(i + 1, l);
  }
});
