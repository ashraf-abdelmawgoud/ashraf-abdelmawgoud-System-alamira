const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /\.from\(['"]sales_invoice_items['"]\)/g;
let m;
while ((m = regex.exec(html)) !== null) {
    console.log('--- sales_invoice_items op at', m.index);
    console.log(html.substring(m.index, m.index + 800));
}
