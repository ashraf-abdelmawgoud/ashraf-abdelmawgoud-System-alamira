const fs = require('fs');
let html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

const oldTopbarCSS = `        .topbar {
            height: 60px;
            background-color: var(--bg-surface);
            border-bottom: 1px solid var(--border-light);
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 90;
            box-shadow: var(--shadow-sm);
        }

        .topbar-left, .topbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }`;

console.log('Match oldTopbarCSS:', html.includes(oldTopbarCSS));
