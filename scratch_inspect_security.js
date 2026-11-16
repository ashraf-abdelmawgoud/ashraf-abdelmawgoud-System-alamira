const fs = require('fs');

const rls = fs.readFileSync('supabase/rls.sql', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

console.log('--- rls.sql lines:', rls.split('\n').length);
// Extract all CREATE POLICY in rls.sql
const policies = [...rls.matchAll(/CREATE\s+POLICY\s+([a-zA-Z0-9_]+)\s+ON\s+public\.([a-zA-Z0-9_]+)\s+(?:FOR\s+([a-zA-Z0-9_]+))?\s*(?:TO\s+([a-zA-Z0-9_,\s]+))?\s*(?:USING\s*\(([\s\S]*?)\))?\s*(?:WITH\s+CHECK\s*\(([\s\S]*?)\))?;/gi)];
console.log('Total Policies in rls.sql:', policies.length);
policies.forEach((p, i) => {
    console.log(`${i+1}. Policy: ${p[1]} on ${p[2]} (FOR ${p[3] || 'ALL'} TO ${p[4] ? p[4].trim() : 'public'})`);
    if (p[5]) console.log(`   USING: ${p[5].replace(/\s+/g, ' ').substring(0, 100)}`);
    if (p[6]) console.log(`   CHECK: ${p[6].replace(/\s+/g, ' ').substring(0, 100)}`);
});

// Check GRANT permissions in rls.sql and functions.sql
console.log('\n--- GRANT statements in rls.sql:');
const grants = [...rls.matchAll(/GRANT\s+([a-zA-Z0-9_,\s]+)\s+ON\s+([a-zA-Z0-9_,\s\(\)\.]+)\s+TO\s+([a-zA-Z0-9_,\s]+);/gi)];
grants.forEach((g, i) => console.log(`${i+1}. GRANT ${g[1].trim()} ON ${g[2].trim()} TO ${g[3].trim()}`));

// Check Supabase init in index.html
console.log('\n--- Supabase client init in index.html:');
const initIdx = html.indexOf('supabase.createClient');
console.log(html.substring(Math.max(0, initIdx - 100), initIdx + 300));
