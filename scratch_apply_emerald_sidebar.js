const fs = require('fs');

const path = 'D:/Projects/System_Excel/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Identify existing sidebar CSS block
const sbStart = html.indexOf('/* --------------------------------------------------------------------------\n           Sidebar Navigation — Emerald Edition');
const sbEnd = html.indexOf('/* --------------------------------------------------------------------------\n           Main Content Area & Topbar', sbStart);

if (sbStart === -1 || sbEnd === -1) {
    throw new Error('Sidebar CSS block delimiters not found: ' + sbStart + ', ' + sbEnd);
}

const newSidebarCSS = `/* --------------------------------------------------------------------------
           Sidebar Navigation — Premium Emerald Edition
           Matched directly to the primary Sales Button (#047857 / #059669)
           -------------------------------------------------------------------------- */
        .sidebar {
            width: var(--sidebar-width);
            background: linear-gradient(180deg, #064e3b 0%, #054232 50%, #04382a 100%);
            color: #ffffff;
            height: 100vh;
            position: fixed;
            top: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            z-index: 100;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-left: 1px solid rgba(52, 211, 153, 0.22);
            box-shadow: -2px 0 12px rgba(0, 0, 0, 0.08);
        }

        .sidebar-brand {
            padding: 14px 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid rgba(52, 211, 153, 0.2);
            background: linear-gradient(180deg, #04382a 0%, #064e3b 100%);
            min-height: 76px;
        }

        .brand-banner-container {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            padding: 6px 10px;
            border-radius: var(--radius-sm);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(52, 211, 153, 0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .brand-banner-container:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .brand-official-logo {
            width: 100%;
            height: auto;
            max-height: 44px;
            object-fit: contain;
            display: block;
            image-rendering: -webkit-optimize-contrast;
        }

        .brand-fallback-badge {
            width: 100%;
            height: 40px;
            border-radius: var(--radius-sm);
            background: linear-gradient(135deg, #047857, #065f46);
            color: #ffffff;
            border: 1px solid rgba(52, 211, 153, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 800;
            gap: 8px;
        }

        .visually-hidden {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        }

        .sidebar-menu {
            flex: 1;
            overflow-y: auto;
            padding: 16px 10px;
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .menu-category {
            font-size: 10.5px;
            color: #a7f3d0;
            font-weight: 700;
            text-transform: uppercase;
            padding: 10px 14px 4px;
            letter-spacing: 0.8px;
            opacity: 0.85;
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 11px 14px;
            color: rgba(255, 255, 255, 0.9);
            text-decoration: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            font-size: 13.5px;
            position: relative;
            border: 1px solid transparent;
        }

        .menu-item i {
            font-size: 16px;
            width: 20px;
            text-align: center;
            color: #a7f3d0;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .menu-item:hover {
            background-color: rgba(52, 211, 153, 0.16);
            color: #ffffff;
            transform: translateX(-2px);
            border-color: rgba(52, 211, 153, 0.25);
        }

        .menu-item:hover i {
            color: #ffffff;
            transform: scale(1.1);
        }

        .menu-item.active {
            background: linear-gradient(135deg, #047857 0%, #059669 100%);
            color: #ffffff;
            font-weight: 800;
            border-right: 3.5px solid #34d399;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.18);
            border-top-color: transparent;
            border-bottom-color: transparent;
            border-left-color: transparent;
        }

        .menu-item.active i {
            color: #ffffff;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
        }

        .menu-badge {
            margin-right: auto;
            background-color: rgba(52, 211, 153, 0.25);
            color: #ecfdf5;
            font-size: 11px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 12px;
            border: 1px solid rgba(52, 211, 153, 0.4);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .sidebar-footer {
            padding: 14px 14px;
            border-top: 1px solid rgba(52, 211, 153, 0.22);
            background: linear-gradient(180deg, #053b2d 0%, #032a1f 100%);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .user-info-brief {
            display: flex;
            align-items: center;
            gap: 10px;
            overflow: hidden;
            flex: 1;
        }

        .user-avatar-sm {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #047857, #059669);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 14px;
            border: 1.5px solid #34d399;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            flex-shrink: 0;
        }

        .user-text-sm {
            line-height: 1.25;
            overflow: hidden;
        }

        .user-text-sm .u-name {
            font-weight: 700;
            color: #ffffff;
            font-size: 13px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        .user-text-sm .u-role {
            font-size: 11px;
            color: #a7f3d0;
            font-weight: 600;
            margin-top: 2px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        .sidebar-logout-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(52, 211, 153, 0.3);
            color: #ecfdf5;
            border-radius: var(--radius-sm);
            padding: 7px 10px;
            cursor: pointer;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .sidebar-logout-btn:hover {
            background: rgba(220, 38, 38, 0.25);
            border-color: rgba(220, 38, 38, 0.5);
            color: #fca5a5;
            transform: scale(1.06);
        }

        `;

html = html.substring(0, sbStart) + newSidebarCSS + html.substring(sbEnd);
console.log('Sidebar CSS replaced successfully!');

// 2. Update Footer button HTML
const oldFooterBtn = `<button class="btn btn-outline btn-sm" onclick="App.logout()" title="تسجيل الخروج" style="color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.15);">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>`;

const newFooterBtn = `<button class="btn btn-outline btn-sm sidebar-logout-btn" onclick="App.logout()" title="تسجيل الخروج من النظام" aria-label="تسجيل الخروج">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>`;

if (html.includes(oldFooterBtn)) {
    html = html.replace(oldFooterBtn, newFooterBtn);
    console.log('Sidebar Footer button updated successfully!');
} else {
    console.log('Old footer button not matched exactly, checking variants...');
}

// Write back updated index.html
fs.writeFileSync(path, html, 'utf8');
console.log('All changes written to index.html successfully!');
