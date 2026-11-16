const fs = require('fs');
const testCode = fs.readFileSync('test_ui_redesign.js', 'utf8');

const lines = testCode.split('\n');
console.log('Lines around 122:');
for (let i = 110; i < 135 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
