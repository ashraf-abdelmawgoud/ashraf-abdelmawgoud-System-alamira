const fs = require('fs');

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const combined = fs.readFileSync('supabase/combined_setup.sql', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

console.log('--- schema.sql: settings tables ---');
const schemaSettings = [...schema.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]*setting[a-zA-Z0-9_]*)/gi)].map(m => m[1]);
console.log('schema.sql settings tables:', schemaSettings);

console.log('\n--- combined_setup.sql: settings tables ---');
const combinedSettings = [...combined.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]*setting[a-zA-Z0-9_]*)/gi)].map(m => m[1]);
console.log('combined_setup.sql settings tables:', combinedSettings);

console.log('\n--- index.html: settings tables referenced ---');
const htmlSettings = [...html.matchAll(/\.from\(['"]([^'"]*setting[^'"]*)['"]\)/gi)].map(m => m[1]);
console.log('index.html settings tables referenced:', [...new Set(htmlSettings)]);
