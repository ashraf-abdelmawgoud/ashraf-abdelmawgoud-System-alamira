const fs = require('fs');

let html = fs.readFileSync('D:/Projects/System_Excel/index.html', 'utf8');

// 1. Sidebar Brand CSS Replacement
const oldBrandCSS = `        .sidebar-brand {
            padding: 18px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(52, 211, 153, 0.15);
            background: linear-gradient(180deg, #031a0d 0%, #052e16 100%);
        }

        .brand-logo-icon {
            width: 42px;
            height: 42px;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, #34d399, #10b981);
            color: #052e16;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 10px rgba(52, 211, 153, 0.3);
            flex-shrink: 0;
        }

        .brand-text h1 {
            font-size: 14px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.3;
        }

        .brand-text p {
            font-size: 10px;
            color: #34d399;
            font-weight: 600;
        }`;

const newBrandCSS = `        .sidebar-brand {
            padding: 14px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(52, 211, 153, 0.15);
            background: linear-gradient(180deg, #021a0d 0%, #052e16 100%);
            min-height: 72px;
        }

        .brand-logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .brand-official-logo {
            max-height: 44px;
            max-width: 130px;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
            border-radius: var(--radius-sm);
            image-rendering: -webkit-optimize-contrast;
        }

        .brand-fallback-badge {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, #047857, #065f46);
            color: #34d399;
            border: 1px solid rgba(52, 211, 153, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
            flex-shrink: 0;
        }

        .brand-text {
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
        }

        .brand-text h1, .brand-text .brand-company-title {
            font-size: 14px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.3;
            letter-spacing: -0.2px;
            margin: 0;
            white-space: nowrap;
        }

        .brand-text p, .brand-text .brand-company-sub {
            font-size: 10px;
            color: #34d399;
            font-weight: 600;
            margin: 2px 0 0 0;
            white-space: nowrap;
        }`;

console.log('Match oldBrandCSS:', html.includes(oldBrandCSS));
