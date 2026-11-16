const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find App.navigate
const appNavIdx = html.indexOf('navigate:');
console.log('App.navigate index:', appNavIdx);
if (appNavIdx !== -1) {
  console.log(html.substring(appNavIdx - 50, appNavIdx + 1200));
}

// Find view-settings complete HTML
const vsStart = html.indexOf('id="view-settings"');
const vsEnd = html.indexOf('</main>', vsStart);
console.log('\n--- VIEW-SETTINGS FULL HTML ---');
console.log(html.substring(vsStart, vsEnd !== -1 ? vsEnd : vsStart + 5000));
