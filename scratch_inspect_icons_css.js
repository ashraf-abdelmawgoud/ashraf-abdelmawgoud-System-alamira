const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Check current menu-item i CSS
const miMatch = html.match(/\.menu-item i\s*\{[\s\S]*?\}/);
console.log('=== menu-item i ===\n', miMatch ? miMatch[0] : 'not found');

// Check btn CSS
const btnMatch = html.match(/\.btn i\s*\{[\s\S]*?\}/);
console.log('=== btn i ===\n', btnMatch ? btnMatch[0] : 'not found');

// Check card-title CSS
const ctMatch = html.match(/\.card-title i\s*\{[\s\S]*?\}/);
console.log('=== card-title i ===\n', ctMatch ? ctMatch[0] : 'not found');
