const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /\.from\(['"]sales_invoices['"]\)\s*\.(insert|update)\s*\(([\s\S]*?)\)\s*\.(select|then|eq)/g;
let m;
while ((m = regex.exec(html)) !== null) {
    console.log(`\nOp: ${m[1]}`);
    console.log(m[2]);
}
