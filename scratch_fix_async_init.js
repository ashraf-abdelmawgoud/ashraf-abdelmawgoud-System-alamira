const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Find init() right after formatErrorMessage
const idx = html.indexOf('formatErrorMessage');
const initIdx = html.indexOf('init() {', idx);
console.log('init() at:', initIdx);
console.log(html.substring(initIdx - 20, initIdx + 40));

html = html.substring(0, initIdx) + 'async init() {' + html.substring(initIdx + 'init() {'.length);
fs.writeFileSync('index.html', html, 'utf8');
console.log('Restored async init()');
