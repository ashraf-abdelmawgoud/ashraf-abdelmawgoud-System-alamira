const fs = require('fs');
const fn = fs.readFileSync('supabase/functions.sql', 'utf8');

const adjFnIdx = fn.indexOf('approve_stock_adjustment');
console.log(fn.substring(adjFnIdx + 1500, adjFnIdx + 3000));
