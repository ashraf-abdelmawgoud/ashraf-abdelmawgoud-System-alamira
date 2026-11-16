const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Search for login screen / modal
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('login') || l.includes('auth') || l.includes('تسجيل الدخول')) {
    if (l.includes('id=') || l.includes('class=')) {
      console.log(i + 1, l);
    }
  }
});
