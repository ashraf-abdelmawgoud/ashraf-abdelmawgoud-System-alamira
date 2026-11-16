const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Search for printInvoice or print functions
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('printInvoice') || l.includes('PrintModule') || l.includes('printReceipt') || l.includes('printIssue') || l.includes('printAdjustment')) {
    console.log(i + 1, l);
  }
});
