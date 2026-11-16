const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart) + '</header>'.length;
console.log('=== TOPBAR ===\n', html.substring(topbarStart, topbarEnd));

const qaStart = html.indexOf('<!-- Quick Actions Bar -->');
const qaEnd = html.indexOf('<!-- Dashboard 2-Column Section -->');
console.log('=== QUICK ACTIONS ===\n', html.substring(qaStart, qaEnd));
