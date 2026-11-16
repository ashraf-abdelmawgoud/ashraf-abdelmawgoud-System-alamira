const fs = require('fs');

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

// Build schema tables
const tableBlocks = [...schema.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi)];
const schemaTables = {};
tableBlocks.forEach(tb => {
    const tableName = tb[1].toLowerCase();
    const body = tb[2];
    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--') && !l.startsWith('CONSTRAINT') && !l.startsWith('PRIMARY KEY') && !l.startsWith('CHECK') && !l.startsWith('FOREIGN KEY'));
    const cols = [];
    lines.forEach(line => {
        const m = line.match(/^([a-zA-Z0-9_]+)\s+/);
        if (m && !['constraint', 'primary', 'foreign', 'check', 'unique'].includes(m[1].toLowerCase())) {
            cols.push(m[1].toLowerCase());
        }
    });
    schemaTables[tableName] = cols;
});

// Find all .from('table').insert(...) and .update(...)
const opRegex = /\.from\(['"]([^'"]+)['"]\)\s*\.(insert|update|upsert)\s*\(\s*(\[[^\]]*\]|\{[^\}]*\})/g;
let m;
const operations = [];
while ((m = opRegex.exec(html)) !== null) {
    operations.push({
        table: m[1],
        op: m[2],
        content: m[3]
    });
}

console.log('Operations found:', operations.length);
operations.forEach((op, i) => {
    console.log(`\n${i+1}. Table: "${op.table}", Op: ${op.op}`);
    // extract keys
    const keyMatches = [...op.content.matchAll(/([a-zA-Z0-9_]+)\s*:/g)].map(k => k[1]);
    console.log(`   Keys:`, [...new Set(keyMatches)]);
    const validCols = schemaTables[op.table.toLowerCase()] || [];
    const invalidKeys = [...new Set(keyMatches)].filter(k => !validCols.includes(k.toLowerCase()));
    if (invalidKeys.length > 0) {
        console.log(`   ❌ INVALID / UNKNOWN COLUMNS FOR ${op.table}:`, invalidKeys);
    } else {
        console.log(`   ✅ All keys match schema columns.`);
    }
});
