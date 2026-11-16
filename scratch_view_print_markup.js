const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const printStart = html.indexOf('id="print-area"');
if (printStart !== -1) {
  console.log(html.substring(printStart - 10, printStart + 1500));
} else {
  console.log('print-area not found');
}
