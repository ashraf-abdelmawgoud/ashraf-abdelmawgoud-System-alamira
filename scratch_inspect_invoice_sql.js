const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /\.from\(['"]sales_invoices['"]\)\s*\.(insert|update)/g;
let m;
while ((m = regex.exec(html)) !== null) {
    console.log('--- sales_invoices op at', m.index);
    console.log(html.substring(m.index, m.index + 800));
}
