const fs = require('fs');
const files = [
    'FULL_SYSTEM_AUDIT.md',
    'BUG_REGISTER.md',
    'DATABASE_COMPATIBILITY_REPORT.md',
    'SECURITY_AUDIT.md',
    'TEST_COVERAGE_REPORT.md',
    'PRODUCTION_READINESS_CHECKLIST.md',
    'REMEDIATION_ROADMAP.md'
];

files.forEach(f => {
    const text = fs.readFileSync('D:/Projects/System_Excel/' + f, 'utf8');
    const matches = [...text.matchAll(/BUG-[A-Z]+-[0-9]+/g)].map(m => m[0]);
    const unique = [...new Set(matches)];
    console.log(f, unique);
});
