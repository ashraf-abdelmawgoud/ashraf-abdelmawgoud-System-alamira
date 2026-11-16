const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /ProductsModule\s*[:=]/g;
let m;
while ((m = regex.exec(html)) !== null) {
    console.log('Match at', m.index);
    console.log(html.substring(m.index, m.index + 500));
}
