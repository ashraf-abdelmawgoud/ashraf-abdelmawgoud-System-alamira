const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Check button styles
const btnMatches = html.match(/\.btn\s*\{[\s\S]*?\}/);
if (btnMatches) console.log('Button CSS:\n', btnMatches[0]);

// Check table styles
const tableMatches = html.match(/\.data-table\s*\{[\s\S]*?\}/);
if (tableMatches) console.log('Table CSS:\n', tableMatches[0]);
