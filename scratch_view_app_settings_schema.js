const fs = require('fs');
const schema = fs.readFileSync('D:/Projects/System_Excel/supabase/schema.sql', 'utf8');

const start = schema.indexOf('application_settings');
if (start !== -1) {
    console.log(schema.substring(start - 20, start + 1000));
} else {
    console.log('application_settings not found');
}
