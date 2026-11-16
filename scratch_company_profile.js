const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /company_profile|companyProfile|companyName|alamira_company/gi;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Match at', m.index, html.substring(Math.max(0, m.index - 50), m.index + 120).replace(/\n/g, ' '));
}
