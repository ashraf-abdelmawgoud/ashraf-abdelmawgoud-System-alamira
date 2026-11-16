const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /settings/gi;
let m;
while ((m = regex.exec(html)) !== null) {
  const line = html.substring(Math.max(0, m.index - 30), m.index + 80).replace(/\n/g, ' ');
  if (line.includes('AppState.settings') || line.includes('settings.company_profile') || line.includes('from(\'settings\')')) {
    console.log('Match at', m.index, line);
  }
}
