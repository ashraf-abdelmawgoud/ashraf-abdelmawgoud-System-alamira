const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const rpcRegex = /\.rpc\s*\(\s*['"]([^'"]+)['"]/g;
let m;
const rpcCalls = [];
while ((m = rpcRegex.exec(html)) !== null) {
    const start = m.index;
    const snippet = html.substring(start, start + 300).replace(/\s+/g, ' ');
    rpcCalls.push({ name: m[1], snippet });
}

console.log('Total .rpc calls in index.html:', rpcCalls.length);
rpcCalls.forEach((r, i) => console.log(`${i + 1}. RPC: "${r.name}" -> ${r.snippet.substring(0, 150)}`));
