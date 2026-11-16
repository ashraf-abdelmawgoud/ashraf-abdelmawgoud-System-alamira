const fs = require('fs');
const testPg = fs.readFileSync('test_real_postgresql_integration.js', 'utf8');

const lines = testPg.split('\n');
console.log('Total lines in test_real_postgresql_integration.js:', lines.length);

// Print lines 20-80
console.log(lines.slice(20, 90).join('\n'));
