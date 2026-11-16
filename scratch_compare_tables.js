const fs = require('fs');

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

// Extract all CREATE TABLE names and their columns from schema.sql
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

console.log('Schema Tables & Columns count:');
Object.entries(schemaTables).forEach(([t, cols]) => console.log(`  Table: ${t} (${cols.length} cols: ${cols.join(', ')})`));

// Find all from('table') in index.html
const htmlTables = [...new Set([...html.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)].map(m => m[1].toLowerCase()))];
console.log('\nTables used in index.html:');
htmlTables.forEach(t => {
    const exists = Boolean(schemaTables[t]);
    console.log(`  ${exists ? '✅' : '❌ MISMATCH:'} ${t}`);
});
