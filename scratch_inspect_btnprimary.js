const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
const css = html.substring(styleStart, styleEnd);

const btnPrimaryIdx = css.indexOf('.btn-primary');
if (btnPrimaryIdx !== -1) {
  console.log('--- .btn-primary CSS ---');
  console.log(css.substring(btnPrimaryIdx, btnPrimaryIdx + 300));
}
