const fs = require('fs');
const fn = fs.readFileSync('D:/Projects/System_Excel/supabase/functions.sql', 'utf8');

const start = fn.indexOf('approve_stock_adjustment');
if (start !== -1) {
    console.log(fn.substring(start - 20, start + 2500));
} else {
    console.log('approve_stock_adjustment not found');
}
