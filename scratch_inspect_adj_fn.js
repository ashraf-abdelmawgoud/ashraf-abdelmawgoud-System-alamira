const fs = require('fs');
const fn = fs.readFileSync('supabase/functions.sql', 'utf8');

const adjFnIdx = fn.indexOf('approve_stock_adjustment');
console.log('--- functions.sql: approve_stock_adjustment ---');
console.log(fn.substring(adjFnIdx, adjFnIdx + 2000));
