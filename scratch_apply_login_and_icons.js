const fs = require('fs');

const path = 'D:/Projects/System_Excel/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Target Auth Screen CSS
const cssStart = html.indexOf('/* --------------------------------------------------------------------------\n           Auth Screen');
const cssEnd = html.indexOf('/* --------------------------------------------------------------------------\n           Print Area & Styling', cssStart);

if (cssStart === -1 || cssEnd === -1) {
    throw new Error('Auth CSS block not found!');
}

const newAuthCSS = `/* --------------------------------------------------------------------------
           Auth Screen — Minimal Emerald Edition
           -------------------------------------------------------------------------- */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #e6f7ef 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            z-index: 1500;
            overflow-y: auto;
        }

        .auth-card {
            background-color: #ffffff;
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 410px;
            padding: 36px 30px 32px;
            box-shadow: 0 12px 32px -4px rgba(6, 78, 59, 0.08), 0 4px 12px -2px rgba(6, 78, 59, 0.04);
            border: 1px solid rgba(4, 120, 87, 0.12);
            text-align: center;
            position: relative;
        }

        .auth-logo-wrapper {
            margin: 0 auto 12px;
            padding: 4px 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 320px;
        }

        .auth-official-logo {
            width: 100%;
            height: auto;
            max-height: 52px;
            object-fit: contain;
            display: block;
            image-rendering: -webkit-optimize-contrast;
        }

        .auth-blessing {
            font-size: 13.5px;
            font-weight: 700;
            color: var(--color-emerald, #047857);
            margin: 0 auto 24px;
            padding: 6px 16px;
            background: var(--color-soft-mint, #ecfdf5);
            border-radius: 20px;
            display: inline-block;
            border: 1px solid rgba(52, 211, 153, 0.25);
            letter-spacing: 0.2px;
        }

        .auth-form-group {
            margin-bottom: 18px;
            text-align: right;
        }

        .auth-form-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 700;
            color: var(--text-dark, #102a23);
            margin-bottom: 6px;
        }

        .auth-form-group label i {
            color: var(--color-emerald, #047857);
            font-size: 14px;
            width: 16px;
            text-align: center;
        }

        .auth-input {
            width: 100%;
            padding: 11px 14px;
            font-size: 14px;
            border: 1.5px solid #d1fae5;
            border-radius: var(--radius-sm);
            background-color: #ffffff;
            color: var(--text-dark, #102a23);
            transition: all 0.2s ease;
            outline: none;
            box-sizing: border-box;
            font-family: inherit;
        }

        .auth-input:focus {
            border-color: var(--color-emerald, #047857);
            box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.15);
            background-color: #ffffff;
        }

        .auth-submit-btn {
            width: 100%;
            padding: 12px 18px;
            font-size: 15px;
            font-weight: 800;
            background: linear-gradient(135deg, #047857 0%, #059669 100%);
            color: #ffffff;
            border-radius: var(--radius-sm);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25);
            transition: all 0.2s ease;
            margin-top: 10px;
        }

        .auth-submit-btn i {
            font-size: 16px;
            transition: transform 0.2s ease;
        }

        .auth-submit-btn:hover {
            box-shadow: 0 6px 16px rgba(4, 120, 87, 0.35);
            transform: translateY(-1px);
        }

        .auth-submit-btn:hover i {
            transform: translateX(-3px);
        }

        .auth-submit-btn:active {
            transform: translateY(0);
        }

        `;

html = html.substring(0, cssStart) + newAuthCSS + html.substring(cssEnd);
console.log('1. Auth Screen CSS replaced successfully');

// 2. Target Auth Screen HTML
const htmlStart = html.indexOf('<div id="auth-screen"');
const htmlEnd = html.indexOf('<!-- ========================================================================\n         2. APPLICATION SIDEBAR', htmlStart);

if (htmlStart === -1 || htmlEnd === -1) {
    throw new Error('Auth HTML block not found!');
}

const newAuthHTML = `<div id="auth-screen" class="auth-screen">
        <div class="auth-card">
            <!-- 1. Official Company Logo -->
            <div class="auth-logo-wrapper">
                <img src="assets/logo.png" alt="شركة الأميرة للتوريدات العامة والتجارة" class="auth-official-logo">
            </div>

            <!-- 2. Sacred Blessing Phrase -->
            <div class="auth-blessing">
                <span>ما شاء الله تبارك الرحمن</span>
            </div>

            <!-- 3. Clean Authentication Form -->
            <form id="login-form" onsubmit="App.handleLogin(event)" autocomplete="on">
                <div class="auth-form-group">
                    <label class="form-label" for="login-email">
                        <i class="fa-solid fa-envelope"></i> البريد الإلكتروني
                    </label>
                    <input type="email" id="login-email" class="form-control auth-input" placeholder="user@alamira.com" value="" required autocomplete="username">
                </div>

                <div class="auth-form-group">
                    <label class="form-label" for="login-password">
                        <i class="fa-solid fa-lock"></i> كلمة المرور
                    </label>
                    <input type="password" id="login-password" class="form-control auth-input" placeholder="••••••••" value="" required autocomplete="current-password">
                </div>

                <!-- 4. Full-width Emerald Login Button with Icon -->
                <button type="submit" id="btn-login-submit" class="auth-submit-btn">
                    <i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول
                </button>
            </form>

            <!-- Hidden indicators preserved for JS compatibility without visual clutter -->
            <div style="display: none;" aria-hidden="true">
                <span id="auth-mode-indicator"></span>
            </div>
        </div>
    </div>

    `;

html = html.substring(0, htmlStart) + newAuthHTML + html.substring(htmlEnd);
console.log('2. Auth Screen HTML replaced successfully');

// 3. Improve General Icon CSS (Sidebar, Tabs, Buttons)
const oldMenuItemI = `.menu-item i {
            font-size: 16px;
            width: 20px;
            text-align: center;
            color: #a7f3d0;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }`;

const newMenuItemI = `.menu-item i {
            font-size: 18px;
            width: 22px;
            text-align: center;
            color: #d1fae5;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            flex-shrink: 0;
        }`;

if (html.includes(oldMenuItemI)) {
    html = html.replace(oldMenuItemI, newMenuItemI);
    console.log('3. Sidebar menu icon CSS updated successfully');
} else {
    console.log('Sidebar menu icon CSS already matched or slightly different');
}

// 4. Add high-contrast rules for tabs and buttons icons
const tabRulesTarget = `.inv-tab {
            padding: 10px 16px;`;

const newTabRules = `.inv-tab i {
            font-size: 15px;
            color: #065f46;
            transition: color 0.18s ease, transform 0.18s ease;
        }

        .inv-tab:hover i, .inv-tab.active i {
            color: var(--color-emerald, #047857);
            transform: scale(1.08);
        }

        .btn i {
            font-size: 14px;
            flex-shrink: 0;
            line-height: 1;
        }

        .btn-outline i {
            color: var(--color-emerald, #047857);
            transition: color 0.2s ease, transform 0.2s ease;
        }

        .card-title i {
            font-size: 16px;
            margin-left: 6px;
        }

        .inv-tab {
            padding: 10px 16px;`;

if (html.includes(tabRulesTarget)) {
    html = html.replace(tabRulesTarget, newTabRules);
    console.log('4. High-contrast icon rules for tabs, buttons, and card titles added successfully');
}

// Write back updated index.html
fs.writeFileSync(path, html, 'utf8');
console.log('All changes applied successfully to index.html!');
