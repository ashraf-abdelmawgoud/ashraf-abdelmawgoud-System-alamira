const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

// Extract script blocks
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;
let errors = 0;

while ((match = regex.exec(content)) !== null) {
    scriptIndex++;
    const srcMatch = match[0].match(/src=["'](.*?)["']/i);
    if (srcMatch) {
        console.log(`Script ${scriptIndex}: External (${srcMatch[1]}) - skipping eval`);
        continue;
    }
    const jsCode = match[1];
    if (!jsCode.trim()) continue;

    try {
        new Function(jsCode);
        console.log(`Script ${scriptIndex}: Inline JS syntax OK (${jsCode.length} chars)`);
    } catch (e) {
        console.error(`Script ${scriptIndex} Syntax Error:`, e.message);
        errors++;
    }
}

if (errors === 0) {
    console.log('ALL SCRIPTS SYNTAX CHECK PASSED!');
    process.exit(0);
} else {
    console.error(`Found ${errors} script error(s)!`);
    process.exit(1);
}
