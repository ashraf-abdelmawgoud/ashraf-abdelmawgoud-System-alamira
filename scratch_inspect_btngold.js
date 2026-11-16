const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find btn-gold in CSS
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
const css = html.substring(styleStart, styleEnd);
const btnGoldCssIdx = css.indexOf('.btn-gold');
if (btnGoldCssIdx !== -1) {
  console.log('--- .btn-gold CSS ---');
  console.log(css.substring(btnGoldCssIdx, btnGoldCssIdx + 300));
}

// Find all HTML elements with btn-gold
const btnGoldMatches = [...html.matchAll(/<[^>]+class=["'][^"']*btn-gold[^"']*["'][^>]*>/g)].map(m => m[0]);
console.log('\n--- btn-gold HTML Elements (count: ' + btnGoldMatches.length + ') ---');
btnGoldMatches.forEach((el, i) => console.log(`${i+1}: ${el.substring(0, 150)}`));
