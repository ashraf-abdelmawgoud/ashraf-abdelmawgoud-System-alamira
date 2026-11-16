const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find sidebar
const sidebarIdx = html.indexOf('id="sidebar"');
if (sidebarIdx !== -1) {
  console.log('--- SIDEBAR ---');
  console.log(html.substring(sidebarIdx, sidebarIdx + 2000));
}

// Find navigate
const navPos = html.indexOf('navigate =');
const navPos2 = html.indexOf('function navigate');
const navPos3 = html.indexOf('navigate(');
console.log('navigate positions:', navPos, navPos2, navPos3);

if (navPos !== -1) {
  console.log('navigate = ...', html.substring(navPos, navPos + 500));
}
if (navPos2 !== -1) {
  console.log('function navigate ...', html.substring(navPos2, navPos2 + 500));
}
