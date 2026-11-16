const fs = require('fs');
const html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// Find auth HTML
const authStart = html.indexOf('<div id="auth-screen"');
const authEnd = html.indexOf('<!-- ========================================================================\n         2. APPLICATION SIDEBAR', authStart);
console.log('=== CURRENT AUTH HTML ===\n', html.substring(authStart, authEnd));

// Search for references to auth elements in scripts
const scriptStart = html.indexOf('<script>');
const script = html.substring(scriptStart);

const ids = ['auth-screen', 'login-form', 'login-email', 'login-password', 'btn-login-submit', 'auth-mode-indicator', 'auth-logo', 'auth-card'];
ids.forEach(id => {
    const matches = [...script.matchAll(new RegExp(id, 'g'))];
    console.log(`ID "${id}" occurrences in script:`, matches.length);
});
