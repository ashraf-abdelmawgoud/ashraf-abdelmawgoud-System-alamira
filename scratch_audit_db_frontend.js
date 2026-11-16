const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Find all table references in index.html
const fromMatches = [...html.matchAll(/(?:client|\.supabaseClient)\.from\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
console.log('Tables referenced in index.html:', [...new Set(fromMatches)]);

// 2. Find all RPC calls in index.html
const rpcMatches = [...html.matchAll(/(?:client|\.supabaseClient)\.rpc\(['"]([^'"]+)['"](?:\s*,\s*(\{[\s\S]*?\}))?\)/g)].map(m => ({
    name: m[1],
    params: m[2] ? m[2].replace(/\s+/g, ' ') : 'none'
}));
console.log('\nRPCs called in index.html:');
rpcMatches.forEach(r => console.log(`  - ${r.name} with params: ${r.params.substring(0, 100)}`));

// 3. Find all SQL files in supabase directory
const sqlFiles = fs.readdirSync('supabase').filter(f => f.endsWith('.sql'));
console.log('\nSQL Files in supabase/:', sqlFiles);

// 4. For each SQL file, extract created tables and functions
const sqlInventory = {};
sqlFiles.forEach(file => {
    const content = fs.readFileSync(path.join('supabase', file), 'utf8');
    const tables = [...content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)].map(m => m[1].toLowerCase());
    const functions = [...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/gi)].map(m => ({
        name: m[1].toLowerCase(),
        signature: m[2].replace(/\s+/g, ' ').trim()
    }));
    sqlInventory[file] = { tables, functions };
});

console.log('\n=== SQL FUNCTIONS PER FILE ===');
Object.entries(sqlInventory).forEach(([file, data]) => {
    console.log(`\nFile: ${file} (Tables: ${data.tables.length}, Functions: ${data.functions.length})`);
    data.functions.forEach(f => console.log(`  - ${f.name}(${f.signature})`));
});
