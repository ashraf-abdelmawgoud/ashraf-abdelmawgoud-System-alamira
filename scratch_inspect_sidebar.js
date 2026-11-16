const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Find button colors
console.log('=== BUTTON CSS ===');
const btnPrimary = html.match(/\.btn-primary\s*\{[\s\S]*?\}/);
if (btnPrimary) console.log(btnPrimary[0]);

const btnGold = html.match(/\.btn-gold\s*\{[\s\S]*?\}/);
if (btnGold) console.log(btnGold[0]);

const topbarBtn = html.match(/\.topbar-primary-action\s*\{[\s\S]*?\}/);
if (topbarBtn) console.log(topbarBtn[0]);

// Find sidebar CSS
console.log('=== SIDEBAR CSS ===');
const sbMatch = html.match(/\/\* -+\s*Sidebar Navigation[\s\S]*?Main Content Area/);
if (sbMatch) console.log(sbMatch[0]);

// Find sidebar HTML
console.log('=== SIDEBAR HTML ===');
const sbHtmlMatch = html.match(/<aside id="sidebar"[\s\S]*?<\/aside>/);
if (sbHtmlMatch) console.log(sbHtmlMatch[0]);
