const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('DEFAULT_SUPABASE_URL') || l.includes('DEFAULT_SUPABASE_KEY') || l.includes('supabase.co')) {
        console.log(i + 1, l.trim());
    }
});
