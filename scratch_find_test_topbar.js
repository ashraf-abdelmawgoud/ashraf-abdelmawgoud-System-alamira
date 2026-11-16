const fs = require('fs');
const glob = fs.readdirSync('D:/Projects/System_Excel').filter(f => f.startsWith('test_') && f.endsWith('.js'));
glob.forEach(file => {
  const content = fs.readFileSync('D:/Projects/System_Excel/' + file, 'utf8');
  if (content.includes('topbar') || content.includes('quick-btns')) {
    console.log(file, 'has topbar references');
  }
});
