const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all module definitions in index.html
const moduleMatches = [...html.matchAll(/(?:const|var|let)\s+([A-Za-z0-9_]+Module)\s*=/g)].map(m => m[1]);
console.log('Module definitions in index.html:', moduleMatches);

// Find where ExportModule is defined
const emIdx = html.indexOf('const ExportModule');
console.log('ExportModule index:', emIdx);
if (emIdx !== -1) {
  console.log(html.substring(emIdx - 100, emIdx + 500));
}

// Find the end of scripts in index.html
const lastScriptIdx = html.lastIndexOf('</script>');
console.log('Last script index:', lastScriptIdx);
console.log(html.substring(lastScriptIdx - 1500, lastScriptIdx));
