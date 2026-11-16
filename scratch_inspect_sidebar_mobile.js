const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Search mobile-toggle and sidebar backdrop
const mtIdx = html.indexOf('mobile-toggle');
console.log('--- mobile-toggle in HTML ---');
console.log(html.substring(mtIdx - 50, mtIdx + 400));

// Check if sidebar backdrop overlay exists
const sbOverlay = html.indexOf('sidebar-overlay');
console.log('sidebar-overlay exists?', sbOverlay !== -1);
