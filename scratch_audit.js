const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('HTML length:', html.length);
console.log('Total lines:', html.split('\n').length);

// 1. Check all views
const views = ['view-dashboard', 'view-products', 'view-sales', 'view-customers', 'view-suppliers', 'view-reports', 'view-settings'];
views.forEach(v => {
  const exists = html.includes(`id="${v}"`);
  console.log(`View ${v}: ${exists ? 'EXISTS' : 'MISSING'}`);
});

// 2. Check view-settings content
const sIdx = html.indexOf('id="view-settings"');
if (sIdx !== -1) {
  const endIdx = html.indexOf('</div>', sIdx + 1500);
  console.log('\n--- VIEW-SETTINGS PREVIEW ---');
  console.log(html.substring(sIdx, sIdx + 1200));
}

// 3. Check for remaining navy/gold/orange in non-print CSS
// Let's find CSS block
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
const css = html.substring(styleStart, styleEnd);
console.log('\nCSS block size:', css.length);

// 4. Check duplicate IDs
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const idCounts = {};
idMatches.forEach(id => {
  idCounts[id] = (idCounts[id] || 0) + 1;
});
const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
console.log('\nDuplicate IDs count:', duplicates.length);
if (duplicates.length > 0) {
  console.log('Duplicates:', duplicates.slice(0, 20));
}
