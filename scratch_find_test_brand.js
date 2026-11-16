const fs = require('fs');
const glob = fs.readdirSync('D:/Projects/System_Excel').filter(f => f.startsWith('test_') && f.endsWith('.js'));
glob.forEach(file => {
  const content = fs.readFileSync('D:/Projects/System_Excel/' + file, 'utf8');
  if (content.includes('brand-logo-icon') || content.includes('sidebar-brand') || content.includes('fa-crown')) {
    console.log(file, 'has brand references');
  }
});
