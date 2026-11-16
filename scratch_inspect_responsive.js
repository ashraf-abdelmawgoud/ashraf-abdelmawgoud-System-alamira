const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /sidebar|topbar|mobile/gi;
let m;
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
const css = html.substring(styleStart, styleEnd);

const mqPos = css.indexOf('@media');
console.log('--- ALL MEDIA QUERIES IN CSS ---');
let pos = 0;
while ((pos = css.indexOf('@media', pos)) !== -1) {
  console.log(css.substring(pos, pos + 400));
  pos += 10;
}
