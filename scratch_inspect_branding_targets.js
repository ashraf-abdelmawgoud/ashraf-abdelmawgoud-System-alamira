const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Target 1: Auth screen card header
const authStart = html.indexOf('<div class=\"auth-card\">');
const authEnd = html.indexOf('<form id=\"login-form\"', authStart);
console.log('=== AUTH HEADER ===\n', html.substring(authStart, authEnd));

// Target 2: Print header container
const printStart = html.indexOf('<div class=\"print-header-container\">');
const printEnd = html.indexOf('<!-- Party & Document Info Grid -->', printStart);
console.log('=== PRINT HEADER ===\n', html.substring(printStart, printEnd));

// Target 3: Sidebar brand
const sbStart = html.indexOf('<div class=\"sidebar-brand\">');
const sbEnd = html.indexOf('</div>\n\n        <ul class=\"sidebar-menu\">', sbStart) + 6;
console.log('=== SIDEBAR BRAND ===\n', html.substring(sbStart, sbEnd));
