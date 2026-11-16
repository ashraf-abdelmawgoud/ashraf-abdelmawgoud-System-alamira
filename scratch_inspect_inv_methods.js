const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const invStart = html.indexOf('InvoicesModule = {');
const invEnd = html.indexOf('AdjustmentsModule = {', invStart);
const invCode = html.substring(invStart, invEnd !== -1 ? invEnd : invStart + 40000);

// Find all methods in InvoicesModule
const methods = [...invCode.matchAll(/([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g)].map(m => m[1]);
console.log('Methods in InvoicesModule:', [...new Set(methods)]);
