const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// 1. Check colors in CSS outside @media print
const printStart = html.indexOf('@media print');
const printEnd = html.indexOf('</style>', printStart);
const nonPrintHtml = html.substring(0, printStart) + html.substring(printEnd);

console.log('--- COLOR AUDIT (Outside @media print) ---');
// Check for navy, gold, orange in CSS classes or inline styles
const navyMatches = [...nonPrintHtml.matchAll(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g)].map(m => m[0].toLowerCase());
const navyColors = ['#0a192f', '#1b2a4a', '#0d1b2a', '#1e293b'];
const goldColors = ['#c59b27', '#d4af37', '#e5c07b', '#b38728'];
const orangeColors = ['#f97316', '#ea580c', '#c2410c'];

console.log('Matches for navy #0a192f in non-print:', nonPrintHtml.split('#0a192f').length - 1);
console.log('Matches for gold #c59b27 in non-print:', nonPrintHtml.split('#c59b27').length - 1);
console.log('Matches for class btn-gold in non-print:', nonPrintHtml.split('btn-gold').length - 1);

// Find where btn-gold is used
const btnGoldMatches = [...html.matchAll(/class=["'][^"']*btn-gold[^"']*["']/g)];
console.log('btn-gold count:', btnGoldMatches.length);

// 2. Check all onclick handlers to make sure every function exists
const onclicks = [...html.matchAll(/onclick=["']([^"']+)["']/g)].map(m => m[1]);
console.log('\nTotal onclick handlers:', onclicks.length);

// 3. Check all modals and modal IDs
const modalMatches = [...html.matchAll(/id=["'](modal-[^"']+)["']/g)].map(m => m[1]);
console.log('\nModal IDs found:', modalMatches);

// 4. Check responsive media queries in CSS
const styleBlock = html.substring(html.indexOf('<style>'), html.indexOf('</style>'));
const mediaQueries = [...styleBlock.matchAll(/@media\s*\([^)]+\)/g)].map(m => m[0]);
console.log('\nMedia queries in CSS:', mediaQueries);
