const fs = require('fs');

const path = 'D:/Projects/System_Excel/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Add Favicon if not present
if (!html.includes('rel="icon"')) {
    html = html.replace('<!-- Google Fonts: Cairo -->', '<link rel="icon" type="image/png" href="assets/logo.png">\n    <!-- Google Fonts: Cairo -->');
    console.log('1. Favicon added');
}

// 2. Update CSS for Sidebar Brand, Auth Screen, and Print
const oldBrandCSS = `        .sidebar-brand {
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

const newBrandCSS = `        .sidebar-brand {
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid rgba(52, 211, 153, 0.15);
            background: linear-gradient(180deg, #021a0d 0%, #052e16 100%);
            min-height: 74px;
        }

        .brand-banner-container {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            padding: 5px 8px;
            border-radius: var(--radius-sm);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(52, 211, 153, 0.25);
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
            height: 38px;
            border-radius: var(--radius-sm);
            background: linear-gradient(135deg, #047857, #065f46);
            color: #ffffff;
            border: 1px solid rgba(52, 211, 153, 0.3);
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
        }`;

if (!html.includes(oldBrandCSS)) {
    throw new Error('oldBrandCSS not found in html');
}
html = html.replace(oldBrandCSS, newBrandCSS);
console.log('2. Brand CSS updated successfully');

// 3. Update Auth CSS
const oldAuthCSS = `        .auth-logo {
            width: 68px;
            height: 68px;
            background: linear-gradient(135deg, var(--gold-primary), #dfba45);
            border-radius: var(--radius-md);
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: var(--navy-darker);
            box-shadow: 0 8px 20px var(--gold-glow);
        }`;

const newAuthCSS = `        .auth-logo-wrapper {
            margin: 0 auto 16px;
            padding: 10px 16px;
            background: #ffffff;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-light);
            box-shadow: 0 4px 12px rgba(4, 120, 87, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 360px;
        }

        .auth-official-logo {
            width: 100%;
            height: auto;
            max-height: 52px;
            object-fit: contain;
            display: block;
            image-rendering: -webkit-optimize-contrast;
        }

        .auth-subtitle {
            font-size: 13px;
            color: var(--color-emerald, #047857);
            font-weight: 700;
            margin-bottom: 22px;
        }`;

if (!html.includes(oldAuthCSS)) {
    throw new Error('oldAuthCSS not found in html');
}
html = html.replace(oldAuthCSS, newAuthCSS);
console.log('3. Auth CSS updated successfully');

// 4. Update Print CSS for logo
const oldPrintH1CSS = `            .print-company-info h1 {
                font-size: 18pt;
                font-weight: 900;
                color: #0a192f;
                margin: 0 0 2px 0;
            }`;

const newPrintH1CSS = `            .print-official-logo {
                max-height: 48px;
                max-width: 320px;
                width: auto;
                object-fit: contain;
                display: block;
                margin-bottom: 6px;
                image-rendering: -webkit-optimize-contrast;
            }
            .print-company-info h1 {
                font-size: 18pt;
                font-weight: 900;
                color: #0a192f;
                margin: 0 0 2px 0;
            }`;

if (!html.includes(oldPrintH1CSS)) {
    throw new Error('oldPrintH1CSS not found in html');
}
html = html.replace(oldPrintH1CSS, newPrintH1CSS);
console.log('4. Print CSS updated successfully');

// 5. Update HTML: Auth Screen
const oldAuthHTML = `<div class="auth-logo">
                <i class="fa-solid fa-crown"></i>
            </div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--navy-dark); margin-bottom: 4px;">الأميرة للتوريدات العامة والتجارة</h2>
            <p style="font-size: 13px; color: var(--gold-primary); font-weight: 700; margin-bottom: 24px;">نظام إدارة المخزون والفواتير السحابي</p>`;

const newAuthHTML = `<div class="auth-logo-wrapper">
                <img src="assets/logo.png" alt="شركة الأميرة للتوريدات العامة والتجارة" class="auth-official-logo">
            </div>
            <p class="auth-subtitle">نظام إدارة المخزون والمبيعات السحابي المعتمد</p>`;

if (!html.includes(oldAuthHTML)) {
    throw new Error('oldAuthHTML not found in html');
}
html = html.replace(oldAuthHTML, newAuthHTML);
console.log('5. Auth HTML updated successfully');

// 6. Update HTML: Sidebar Brand
const oldSidebarHTML = `<div class="sidebar-brand">
            <div class="brand-logo-container">
                <img id="company-official-logo" src="assets/logo.png" alt="شعار شركة الأميرة للتوريدات العامة والتجارة" class="brand-official-logo" onerror="this.style.display='none'; document.getElementById('brand-fallback-badge').style.display='flex';">
                <div id="brand-fallback-badge" class="brand-fallback-badge" style="display: none;">
                    <i class="fa-solid fa-building-columns"></i>
                </div>
            </div>
            <div class="brand-text">
                <h1 class="brand-company-title">شركة الأميرة</h1>
                <p class="brand-company-sub">للتوريدات العامة والتجارة</p>
            </div>
        </div>`;

const newSidebarHTML = `<div class="sidebar-brand">
            <div class="brand-banner-container">
                <img id="company-official-logo" src="assets/logo.png" alt="شعار شركة الأميرة للتوريدات العامة والتجارة" class="brand-official-logo" onerror="this.style.display='none'; document.getElementById('brand-fallback-badge').style.display='flex';">
                <div id="brand-fallback-badge" class="brand-fallback-badge" style="display: none;">
                    <i class="fa-solid fa-building-columns"></i>
                    <span>شركة الأميرة للتوريدات العامة والتجارة</span>
                </div>
            </div>
            <div class="brand-text visually-hidden">
                <h1 class="brand-company-title">شركة الأميرة</h1>
                <p class="brand-company-sub">للتوريدات العامة والتجارة</p>
            </div>
        </div>`;

if (!html.includes(oldSidebarHTML)) {
    throw new Error('oldSidebarHTML not found in html');
}
html = html.replace(oldSidebarHTML, newSidebarHTML);
console.log('6. Sidebar HTML updated successfully');

// 7. Update HTML: Print Area Header
const oldPrintHTML = `<div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-crown" style="color: #c59b27; font-size: 20pt;"></i>
                    <h1 id="print-company-name">الأميرة للتوريدات العامة والتجارة</h1>
                </div>`;

const newPrintHTML = `<div class="print-logo-wrap">
                    <img src="assets/logo.png" alt="شركة الأميرة للتوريدات العامة والتجارة" class="print-official-logo">
                    <h1 id="print-company-name" style="display:none;">الأميرة للتوريدات العامة والتجارة</h1>
                </div>`;

if (!html.includes(oldPrintHTML)) {
    throw new Error('oldPrintHTML not found in html');
}
html = html.replace(oldPrintHTML, newPrintHTML);
console.log('7. Print Area HTML updated successfully');

// Write back updated index.html
fs.writeFileSync(path, html, 'utf8');
console.log('All official logo integrations applied successfully to index.html!');
