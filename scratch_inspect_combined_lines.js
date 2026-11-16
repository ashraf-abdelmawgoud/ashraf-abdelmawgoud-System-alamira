const fs = require('fs');
const combined = fs.readFileSync('supabase/combined_setup.sql', 'utf8');

const lines = combined.split('\n');
console.log('Total lines in combined_setup.sql:', lines.length);

// Print lines with -- ===
lines.forEach((l, i) => {
    if (l.includes('-- ===') && lines[i+1]) {
        console.log(`Line ${i+1}: ${lines[i+1].trim()}`);
    }
});
