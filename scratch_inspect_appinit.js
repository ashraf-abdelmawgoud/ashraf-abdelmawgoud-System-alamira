const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const appInitIdx = html.indexOf('init() {');
console.log('App.init at:', appInitIdx);
if (appInitIdx !== -1) {
  console.log(html.substring(appInitIdx, appInitIdx + 1200));
}
