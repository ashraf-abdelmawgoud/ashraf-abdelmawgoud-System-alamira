const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Check navigation links
const navMatches = [...html.matchAll(/onclick=["']navigate\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
console.log('Nav targets:', [...new Set(navMatches)]);

// Check all elements with class view-section
const viewSectionMatches = [...html.matchAll(/id=["']([^"']+)["'][^>]*class=["'][^"']*view-section[^"']*["']/g)].map(m => m[1]);
console.log('View section IDs:', viewSectionMatches);

// Check navigate function definition
const navFuncIdx = html.indexOf('function navigate(');
if (navFuncIdx !== -1) {
  console.log('\n--- navigate() function ---');
  console.log(html.substring(navFuncIdx, navFuncIdx + 1200));
}
