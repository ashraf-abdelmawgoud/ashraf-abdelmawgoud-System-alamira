const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const cssStart = html.indexOf('/* --------------------------------------------------------------------------\n           Auth Screen');
const cssEnd = html.indexOf('/* --------------------------------------------------------------------------\n           Print Area & Styling', cssStart);
console.log('=== CSS TARGET ===\n', html.substring(cssStart, cssEnd));

const htmlStart = html.indexOf('<div id="auth-screen"');
const htmlEnd = html.indexOf('<!-- ========================================================================\n         2. APPLICATION SIDEBAR', htmlStart);
console.log('=== HTML TARGET ===\n', html.substring(htmlStart, htmlEnd));
