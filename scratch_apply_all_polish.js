const fs = require('fs');

const path = 'D:/Projects/System_Excel/index.html';
let html = fs.readFileSync(path, 'utf8');

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

if (!html.includes(oldBrandCSS)) {
    throw new Error('oldBrandCSS not found in html');
}
html = html.replace(oldBrandCSS, newBrandCSS);
console.log('1. Brand CSS replaced successfully');

// 2. Topbar CSS Replacement
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

const newTopbarCSS = `        .topbar {
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

        .topbar-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .topbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .topbar-primary-action-wrap {
            display: flex;
            align-items: center;
        }

        .topbar-primary-action {
            box-shadow: 0 2px 6px rgba(4, 120, 87, 0.25);
            font-weight: 700;
            padding: 6px 14px;
            font-size: 13px;
        }

        .compact-backup-alert {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            transition: all 0.2s ease;
        }
        .compact-backup-alert:hover {
            opacity: 0.9;
            transform: scale(1.02);
        }`;

if (!html.includes(oldTopbarCSS)) {
    throw new Error('oldTopbarCSS not found in html');
}
html = html.replace(oldTopbarCSS, newTopbarCSS);
console.log('2. Topbar CSS replaced successfully');

// 3. Sidebar Brand HTML Replacement
const oldBrandHTML = `<div class="sidebar-brand">
            <div class="brand-logo-icon">
                <i class="fa-solid fa-crown"></i>
            </div>
            <div class="brand-text">
                <h1>شركة الأميرة</h1>
                <p>للتوريدات العامة والتجارة</p>
            </div>
        </div>`;

const newBrandHTML = `<div class="sidebar-brand">
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

if (!html.includes(oldBrandHTML)) {
    throw new Error('oldBrandHTML not found in html');
}
html = html.replace(oldBrandHTML, newBrandHTML);
console.log('3. Brand HTML replaced successfully');

// 4. Topbar Header HTML Replacement
const topbarStart = html.indexOf('<header class="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart) + '</header>'.length;
const currentTopbar = html.substring(topbarStart, topbarEnd);

const newTopbarHTML = `<header class="topbar">
            <div class="topbar-left">
                <button class="mobile-toggle" onclick="App.toggleSidebar()" aria-label="تبديل القائمة الجانبية">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="page-header-title">
                    <i id="page-icon" class="fa-solid fa-gauge"></i>
                    <span id="page-title">لوحة التحكم</span>
                </div>
                <!-- Single Globally Important Action: Sales Invoice -->
                <div class="topbar-primary-action-wrap">
                    <button class="btn btn-primary btn-sm topbar-primary-action" onclick="App.openNewInvoiceModal()" title="تحرير وإصدار فاتورة مبيعات جديدة للعميل">
                        <i class="fa-solid fa-plus"></i> <span>فاتورة مبيعات</span>
                    </button>
                </div>
            </div>

            <div class="topbar-right">
                <!-- Compact Backup Freshness Alert Badge -->
                <div id="topbar-backup-alert" class="status-pill warning compact-backup-alert" style="display: none; cursor: pointer;" onclick="App.navigate('view-settings')" title="تنبيه: مضى أكثر من 24 ساعة على آخر نسخة احتياطية - انقر للانتقال للنسخ الاحتياطي والتحقق">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span class="backup-alert-label">نسخة احتياطية مطلوبة</span>
                </div>

                <!-- Compact Supabase Connection Pill -->
                <div id="connection-pill" class="status-pill online" onclick="App.openConfigModal()" style="cursor: pointer;" title="انقر لتعديل إعدادات الربط السحابي">
                    <i class="fa-solid fa-cloud"></i>
                    <span id="connection-status-text">متصل بالسحابة</span>
                </div>

                <!-- Date Display -->
                <div class="topbar-date-display" style="font-size: 12px; font-weight: 700; color: var(--color-forest, #052e16); display: flex; align-items: center; gap: 6px;">
                    <i class="fa-regular fa-calendar-days" style="color: var(--color-bright-emerald, #059669);"></i>
                    <span id="current-arabic-date">--</span>
                </div>
            </div>
        </header>`;

html = html.substring(0, topbarStart) + newTopbarHTML + html.substring(topbarEnd);
console.log('4. Topbar HTML replaced successfully');

// 5. Quick Actions Bar Replacement in view-dashboard
const qaStart = html.indexOf('<!-- Quick Actions Bar -->');
const qaEnd = html.indexOf('<!-- Dashboard 2-Column Section -->');
const currentQA = html.substring(qaStart, qaEnd);

const newQAHTML = `<!-- Dedicated Quick Actions Panel -->
                <div class="dashboard-quick-actions-panel card" style="margin-bottom: 24px; border: 1px solid rgba(4, 120, 87, 0.2); background: #ffffff;">
                    <div class="card-header" style="background: linear-gradient(180deg, #fbfdfc 0%, #f4f9f6 100%); padding: 12px 18px; border-bottom: 1px solid var(--border-light);">
                        <span class="card-title" style="font-size: 14px; font-weight: 800; color: var(--color-forest, #052e16); margin: 0;">
                            <i class="fa-solid fa-bolt" style="color: var(--color-bright-emerald, #059669);"></i> الإجراءات السريعة
                        </span>
                        <span style="font-size: 12px; color: var(--text-muted);">العمليات اليومية المباشرة الأكثر تكراراً</span>
                    </div>
                    <div class="card-body" style="padding: 16px 18px;">
                        <div class="dashboard-actions-grid" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                            <!-- 1. Primary: Sales Invoice -->
                            <button class="btn btn-primary" onclick="App.openNewInvoiceModal()" style="padding: 10px 20px; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(4, 120, 87, 0.25);" title="تحرير وإصدار فاتورة مبيعات جديدة للعميل">
                                <i class="fa-solid fa-plus-circle" style="font-size: 16px;"></i> <span>فاتورة مبيعات جديدة</span>
                            </button>
                            <!-- 2. Secondary: Goods Receipt -->
                            <button class="btn btn-outline" onclick="App.openNewReceiptModal()" style="padding: 9px 16px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;" title="تسجيل إذن استلام بضاعة للمخزن من مورد">
                                <i class="fa-solid fa-dolly" style="color: var(--color-emerald, #047857);"></i> <span>إذن استلام بضاعة</span>
                            </button>
                            <!-- 3. Secondary: Add Product -->
                            <button class="btn btn-outline" onclick="App.openAddProductModal()" style="padding: 9px 16px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;" title="تعريف صنف جديد في المخزون">
                                <i class="fa-solid fa-box-open" style="color: var(--color-emerald, #047857);"></i> <span>إضافة صنف</span>
                            </button>
                            <!-- 4. Secondary: Goods Issue -->
                            <button class="btn btn-outline" onclick="App.openNewIssueModal()" style="padding: 9px 16px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;" title="إصدار إذن صرف بضاعة من المخزن">
                                <i class="fa-solid fa-truck-ramp-box" style="color: var(--color-emerald, #047857);"></i> <span>إذن صرف</span>
                            </button>
                        </div>
                    </div>
                </div>

                `;

html = html.substring(0, qaStart) + newQAHTML + html.substring(qaEnd);
console.log('5. Quick Actions HTML replaced successfully');

// 6. Refine Empty states in DashboardModule.render()
const oldLowStockEmpty = `if (critical.length === 0) {
                    lowStockTable.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; color: var(--text-muted); padding: 16px;\">جميع مستويات المخزون آمنة وممتازة</td></tr>';
                }`;

const newLowStockEmpty = `if (critical.length === 0) {
                    lowStockTable.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; padding: 28px 16px; color: var(--text-muted);\"><div style=\"display:flex; flex-direction:column; align-items:center; gap:8px;\"><i class=\"fa-solid fa-circle-check\" style=\"font-size:24px; color: var(--color-bright-emerald, #059669);\"></i><span style=\"font-weight:700; color: var(--color-forest, #052e16); font-size:13px;\">المخزون في حالة آمنة وممتازة</span><span style=\"font-size:11px;\">لا توجد أي أصناف وصلت لحد الطلب أو نفدت حالياً</span></div></td></tr>';
                }`;

if (!html.includes(oldLowStockEmpty)) {
    throw new Error('oldLowStockEmpty not found in html');
}
html = html.replace(oldLowStockEmpty, newLowStockEmpty);

const oldRecentEmpty = `if (recent.length === 0) {
                    recentMovementsTable.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; color: var(--text-muted); padding: 16px;\">لا توجد حركات مخزون مسجلة بعد</td></tr>';
                }`;

const newRecentEmpty = `if (recent.length === 0) {
                    recentMovementsTable.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; padding: 28px 16px; color: var(--text-muted);\"><div style=\"display:flex; flex-direction:column; align-items:center; gap:8px;\"><i class=\"fa-solid fa-clock-rotate-left\" style=\"font-size:24px; color: var(--text-muted); opacity: 0.6;\"></i><span style=\"font-weight:700; color: var(--color-forest, #052e16); font-size:13px;\">لا توجد حركات مخزنية مسجلة</span><span style=\"font-size:11px;\">ستظهر هنا أحدث حركات الوارد والمنصرف والتسويات فور إجرائها</span></div></td></tr>';
                }`;

if (!html.includes(oldRecentEmpty)) {
    throw new Error('oldRecentEmpty not found in html');
}
html = html.replace(oldRecentEmpty, newRecentEmpty);
console.log('6. Empty states refined successfully');

// 7. Write back updated index.html
fs.writeFileSync(path, html, 'utf8');
console.log('All changes applied successfully to index.html!');
