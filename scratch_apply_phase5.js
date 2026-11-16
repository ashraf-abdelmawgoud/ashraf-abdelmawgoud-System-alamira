const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add sidebar-overlay to HTML
if (!html.includes('id="sidebar-overlay"')) {
    html = html.replace(
        '<aside id="sidebar" class="sidebar">',
        '<div id="sidebar-overlay" class="sidebar-overlay" onclick="App.toggleSidebar()"></div>\n    <aside id="sidebar" class="sidebar">'
    );
    console.log('Added sidebar-overlay');
}

// 2. Add responsive CSS rules and sidebar-overlay CSS before </style>
const cssEndTag = '</style>';
const cssEndIdx = html.indexOf(cssEndTag);

const newCssRules = `
        /* Sidebar Mobile Overlay */
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(2, 44, 34, 0.55);
            backdrop-filter: blur(2px);
            z-index: 99;
            transition: opacity 0.25s ease;
        }
        .sidebar-overlay.active {
            display: block;
        }

        /* Dashboard 2-Column Responsive Container */
        .dashboard-2col {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
            gap: 20px;
        }

        /* Emerald KPI Card Primary Theme */
        .kpi-card.primary {
            background-color: var(--color-surface, #ffffff);
            border-right: 4px solid var(--color-emerald, #047857);
        }
        .kpi-card.primary .kpi-icon {
            background-color: var(--color-soft-mint, #ecfdf5);
            color: var(--color-emerald, #047857);
        }

        /* Responsive Breakpoints (360px, 390px, 768px, 992px, 1440px) */
        @media (max-width: 992px) {
            .sidebar {
                transform: translateX(100%);
            }
            .sidebar.mobile-open {
                transform: translateX(0);
            }
            .main-wrapper {
                margin-right: 0;
                width: 100%;
            }
            .mobile-toggle {
                display: block;
            }
        }

        @media (max-width: 768px) {
            .main-content {
                padding: 12px 10px;
            }
            .topbar {
                padding: 10px 14px;
            }
            .page-header-title {
                font-size: 14px;
            }
            .topbar-right {
                gap: 8px;
            }
            .user-info-text {
                display: none;
            }
            .btn {
                padding: 8px 12px;
                font-size: 13px;
                min-height: 42px;
            }
            .grid-kpi {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 10px;
            }
            .kpi-card {
                padding: 12px;
            }
            .kpi-value {
                font-size: 18px;
            }
            .kpi-icon {
                width: 38px;
                height: 38px;
                font-size: 16px;
            }
            .modal-backdrop {
                padding: 8px;
            }
            .modal-box {
                width: 100% !important;
                max-width: 100% !important;
                max-height: 94vh;
                border-radius: var(--radius-sm);
            }
            .modal-header {
                padding: 12px 14px;
            }
            .modal-body {
                padding: 12px 10px;
                max-height: calc(94vh - 120px);
                overflow-y: auto;
            }
            .modal-footer {
                padding: 10px 12px;
                flex-wrap: wrap;
                gap: 8px;
            }
            .modal-footer .btn {
                flex: 1 1 calc(50% - 8px);
                min-width: 110px;
                justify-content: center;
            }
            .inv-tabs-bar {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                flex-wrap: nowrap;
                white-space: nowrap;
                padding-bottom: 2px;
            }
            .inv-tab {
                padding: 10px 14px;
                font-size: 12px;
                flex-shrink: 0;
            }
            .table-responsive {
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
        }

        @media (max-width: 480px) {
            .grid-kpi {
                grid-template-columns: 1fr !important;
                gap: 8px;
            }
            .topbar {
                padding: 8px 10px;
            }
            .topbar-left {
                gap: 8px;
            }
            #connection-pill {
                padding: 4px 8px;
                font-size: 10px;
            }
            #connection-pill span {
                display: none;
            }
            .btn {
                min-height: 44px;
            }
            .form-row {
                grid-template-columns: 1fr !important;
                gap: 10px;
            }
            .modal-footer .btn {
                flex: 1 1 100%;
                min-width: 100%;
            }
            .dashboard-2col {
                grid-template-columns: 1fr !important;
            }
            .card-header {
                flex-direction: column;
                align-items: flex-start !important;
                gap: 10px;
            }
            .card-header > div:last-child {
                width: 100%;
                justify-content: flex-start;
            }
            #invoice-search, #customer-search, #supplier-search, #inventory-search-input {
                width: 100% !important;
            }
        }

        @media (max-width: 360px) {
            body {
                font-size: 12px;
            }
            .brand-text h1 {
                font-size: 14px;
            }
            .brand-text p {
                font-size: 10px;
            }
            .kpi-value {
                font-size: 16px;
            }
        }

        @media (min-width: 1440px) {
            .main-content {
                max-width: 1600px;
                margin: 0 auto;
            }
        }
`;

// Replace existing responsive media queries block in CSS
const oldMqStart = html.indexOf('/* Responsive */');
if (oldMqStart !== -1 && oldMqStart < cssEndIdx) {
    html = html.substring(0, oldMqStart) + '/* Responsive Layout & Mobile Drawer */\n' + newCssRules + '\n    ' + html.substring(cssEndIdx);
    console.log('Replaced old media query block with modern mobile responsive rules');
}

// 3. Update view-dashboard:
// Change kpi-card gold to kpi-card primary
html = html.replace(
    '<div class="kpi-card gold" style="cursor: pointer;" onclick="App.navigate(\'view-invoices\')">',
    '<div class="kpi-card primary" style="cursor: pointer;" onclick="App.navigate(\'view-invoices\')">'
);

// Change dashboard 2-column inline grid to class dashboard-2col
html = html.replace(
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">',
    '<div class="dashboard-2col">'
);

// 4. Replace view-settings in HTML with the 5-tab Settings Workspace
const settingsOldStart = html.indexOf('<section id="view-settings" class="view-section">');
const settingsOldEnd = html.indexOf('</section>', settingsOldStart) + 10;

const settingsNewHtml = `<section id="view-settings" class="view-section">
                <!-- Settings tabs header -->
                <div class="card" style="margin-bottom: 0; border-radius: var(--radius-md) var(--radius-md) 0 0; border-bottom: none;">
                    <div class="inv-tabs-bar">
                        <button class="inv-tab active" id="settings-tab-company" onclick="SettingsSection.switchTab('company')">
                            <i class="fa-solid fa-building"></i> بيانات وهوية المؤسسة
                        </button>
                        <button class="inv-tab" id="settings-tab-backup" onclick="SettingsSection.switchTab('backup')">
                            <i class="fa-solid fa-shield-halved"></i> النسخ الاحتياطي وتصدير البيانات
                        </button>
                        <button class="inv-tab" id="settings-tab-supabase" onclick="SettingsSection.switchTab('supabase')">
                            <i class="fa-solid fa-cloud"></i> الربط السحابي والأمان
                        </button>
                        <button class="inv-tab" id="settings-tab-account" onclick="SettingsSection.switchTab('account')">
                            <i class="fa-solid fa-user-circle"></i> معلومات الحساب
                        </button>
                        <button class="inv-tab" id="settings-tab-system" onclick="SettingsSection.switchTab('system')">
                            <i class="fa-solid fa-circle-info"></i> حالة النظام والتدقيق
                        </button>
                    </div>
                </div>

                <!-- 1. Settings Tab: Company Info & Branding -->
                <div class="inv-tab-panel active" id="settings-panel-company">
                    <div class="card" style="border-radius: 0 0 var(--radius-md) var(--radius-md);">
                        <div class="card-header">
                            <span class="card-title">
                                <i class="fa-solid fa-building" style="color: var(--color-emerald, #047857);"></i> بيانات وهوية شركة الأميرة
                            </span>
                            <span class="badge badge-emerald">الهوية الرسمية للمطبوعات</span>
                        </div>
                        <div class="card-body">
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                                تستخدم هذه البيانات تلقائياً في ترويسة فواتير المبيعات المطبوعة بمقاس A4 وأذون المخزن الرسمية. تظهر بيانات السجل التجاري والبطاقة الضريبية فقط في حال إدخالها.
                            </p>
                            <form id="form-company-settings" onsubmit="SettingsSection.saveCompanyProfile(event)">
                                <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 16px;">
                                    <div class="form-group">
                                        <label class="form-label required">اسم المؤسسة التجاري</label>
                                        <input type="text" id="setting-company-name" class="form-control" required value="الأميرة للتوريدات العامة والتجارة">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label required">طبيعة النشاط التجاري</label>
                                        <input type="text" id="setting-company-activity" class="form-control" required value="توريدات عامة وتجارة">
                                    </div>
                                </div>
                                <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 16px;">
                                    <div class="form-group">
                                        <label class="form-label">رقم الهاتف / خدمة العملاء</label>
                                        <input type="text" id="setting-company-phone" class="form-control" placeholder="مثال: 01000000000">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">العنوان والمقر الرئيسي</label>
                                        <input type="text" id="setting-company-address" class="form-control" placeholder="جمهورية مصر العربية">
                                    </div>
                                </div>
                                <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 16px;">
                                    <div class="form-group">
                                        <label class="form-label">رقم السجل التجاري (اختياري)</label>
                                        <input type="text" id="setting-company-reg" class="form-control" placeholder="يترك فارغاً إذا لم يكن مسجلاً">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">رقم التسجيل الضريبي (اختياري)</label>
                                        <input type="text" id="setting-company-tax" class="form-control" placeholder="يترك فارغاً إذا لم يكن مسجلاً">
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label class="form-label">ملاحظات وشروط الفاتورة الافتراضية (تظهر فقط عند كتابتها)</label>
                                    <textarea id="setting-company-notes" class="form-control" rows="2" placeholder="أي شروط تعاقدية عامة تود إظهارها في أسفل الفواتير..."></textarea>
                                </div>
                                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                                    <button type="submit" id="btn-save-company-settings" class="btn btn-primary" style="min-width: 160px;">
                                        <i class="fa-solid fa-floppy-disk"></i> حفظ بيانات المؤسسة
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- 2. Settings Tab: Backup & Exports -->
                <div class="inv-tab-panel" id="settings-panel-backup">
                    <div style="border-radius: 0 0 var(--radius-md) var(--radius-md); overflow: hidden;">
                        <!-- Backup Status Banner -->
                        <div class="card" style="border-right: 4px solid var(--color-emerald, #047857);">
                            <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                                <div>
                                    <h3 style="font-size: 16px; font-weight: 800; color: var(--text-dark); margin-bottom: 4px;">
                                        <i class="fa-solid fa-shield-halved" style="color: var(--color-emerald, #047857);"></i> حالة النسخ الاحتياطي للنظام
                                    </h3>
                                    <p style="font-size: 13px; color: var(--text-muted);">
                                        آخر نسخة احتياطية: <strong id="last-backup-timestamp-text" style="color: var(--text-dark);">لم يتم إنشاء نسخة بعد</strong>
                                    </p>
                                </div>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <button class="btn btn-primary" onclick="BackupRestoreModule.createFullBackup()">
                                        <i class="fa-solid fa-download"></i> إنشاء نسخة احتياطية كاملة (JSON)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Excel Export Card -->
                        <div class="card">
                            <div class="card-header">
                                <span class="card-title"><i class="fa-solid fa-file-excel" style="color: #107c41;"></i> تصدير البيانات الشامل إلى Excel (.xlsx)</span>
                            </div>
                            <div class="card-body">
                                <p style="font-size: 13px; color: var(--text-dark); margin-bottom: 16px;">
                                    يقوم النظام بتصدير ملف إكسل حقيقي كامل يحتوي على <strong>13 ورقة عمل منفصلة (Worksheets)</strong> مع خلايا رقمية حقيقية لجميع القيم والكميات والأسعار لسهولة إجراء المعادلات والتحليلات المحاسبية فور فتح الملف.
                                </p>

                                <div style="background-color: var(--color-soft-mint, #ecfdf5); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 20px;">
                                    <div style="font-weight: 700; color: var(--text-dark); margin-bottom: 8px;">أوراق العمل المتضمنة بالملف:</div>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 12px; color: var(--text-dark);">
                                        <div><i class="fa-solid fa-check text-success"></i> 1. دليل الأصناف (Products)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 2. التصنيفات (Categories)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 3. العملاء (Customers)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 4. الموردون (Suppliers)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 5. فواتير المبيعات (Invoices)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 6. بنود الفواتير (Invoice Items)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 7. أذون الاستلام (Stock Receipts)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 8. بنود الاستلام (Receipt Items)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 9. أذون الصرف (Stock Issues)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 10. بنود أذون الصرف (Issue Items)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 11. حركات المخزون (Movements)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 12. تسويات الجرد (Adjustments)</div>
                                        <div><i class="fa-solid fa-check text-success"></i> 13. الملخص اليومي (Daily Summary)</div>
                                    </div>
                                </div>

                                <button class="btn btn-success" onclick="ExportModule.exportFullExcelWorkbook()">
                                    <i class="fa-solid fa-file-arrow-down"></i> تصدير جميع البيانات الآن إلى ملف Excel
                                </button>
                            </div>
                        </div>

                        <!-- Security Policy Note on Restore -->
                        <div class="card" style="border-right: 4px solid var(--info);">
                            <div class="card-body">
                                <h4 style="font-size: 14px; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">
                                    <i class="fa-solid fa-lock" style="color: var(--info);"></i> سياسة الأمان واستعادة البيانات المحاسبية
                                </h4>
                                <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.6; margin: 0;">
                                    حفاظاً على سلامة دفتر الأستاذ وسجل الحركات الرقابي المعصوم من التعديل (Immutable Ledger)، يتم استيراد واستعادة قواعد البيانات حصرياً من جانب الخادم (Server-Side) بواسطة مسؤولي النظام وأدوات Supabase الرسمية. ملفات JSON و Excel المصدرة توفر نسخة كاملة فورية ومستقلة لكافة بيانات المؤسسة.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Settings Tab: Supabase Cloud & Security -->
                <div class="inv-tab-panel" id="settings-panel-supabase">
                    <div class="card" style="border-radius: 0 0 var(--radius-md) var(--radius-md);">
                        <div class="card-header">
                            <span class="card-title"><i class="fa-solid fa-cloud" style="color: var(--color-emerald, #047857);"></i> إعدادات الربط السحابي والأمان (Supabase)</span>
                            <div id="connection-pill-settings" class="status-pill online">
                                <i class="fa-solid fa-cloud"></i>
                                <span>متصل بسحابة Supabase</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                                النظام متصل بقاعدة بيانات PostgreSQL السحابية المدارة عبر Supabase، مع تفعيل سياسات أمان مستوى الصفوف (Row Level Security - RLS).
                            </p>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px;">
                                <div style="background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">عنوان خادم المشروع السحابي (Project URL)</div>
                                    <div id="settings-supabase-url-display" style="font-size: 13px; font-weight: 700; color: var(--navy-dark); direction: ltr; text-align: left; word-break: break-all;">
                                        https://jyluvkuxrcqgkhnkwkba.supabase.co
                                    </div>
                                </div>
                                <div style="background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">مفتاح الوصول العام (Anon Key — مؤمن)</div>
                                    <div style="font-size: 13px; font-weight: 700; color: var(--navy-dark); direction: ltr; text-align: left;">
                                        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9••••••••••••••••
                                    </div>
                                </div>
                                <div style="background: var(--color-soft-mint, #ecfdf5); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">سياسات أمان مستوى الصفوف (RLS)</div>
                                    <div style="font-size: 13px; font-weight: 800; color: var(--color-dark-emerald, #064e3b);">
                                        <i class="fa-solid fa-shield-halved text-success"></i> مفعّلة ونشطة على كافة الجداول
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                                <button class="btn btn-primary" onclick="App.openConfigModal()">
                                    <i class="fa-solid fa-sliders"></i> تعديل إعدادات الاتصال السحابي
                                </button>
                                <button class="btn btn-outline" onclick="App.resetToDefaultConfig()">
                                    <i class="fa-solid fa-rotate-left"></i> استعادة الإعدادات الافتراضية
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. Settings Tab: Account Details & Session -->
                <div class="inv-tab-panel" id="settings-panel-account">
                    <div class="card" style="border-radius: 0 0 var(--radius-md) var(--radius-md);">
                        <div class="card-header">
                            <span class="card-title"><i class="fa-solid fa-user-circle" style="color: var(--color-emerald, #047857);"></i> معلومات الحساب وجلسة العمل</span>
                        </div>
                        <div class="card-body">
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                                بيانات المستخدم المصرح له والمسجل دخوله حالياً في النظام.
                            </p>
                            <div style="background: var(--color-soft-mint, #ecfdf5); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 20px; max-width: 600px;">
                                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                                    <div class="user-avatar-sm" id="settings-user-avatar" style="width: 56px; height: 56px; font-size: 22px; background: var(--color-emerald, #047857); color: #fff; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800;">م</div>
                                    <div>
                                        <div style="font-size: 18px; font-weight: 800; color: var(--text-dark);" id="settings-user-name">مستخدم النظام</div>
                                        <div style="font-size: 13px; color: var(--color-dark-emerald, #064e3b); font-weight: 600;" id="settings-user-email">admin@alamira.com</div>
                                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                                            <span class="badge badge-emerald" style="font-size: 10px;">مدير النظام — كامل الصلاحيات</span>
                                        </div>
                                    </div>
                                </div>
                                <div style="border-top: 1px solid var(--border-light); padding-top: 16px;">
                                    <button class="btn btn-outline" onclick="App.logout()" style="color: var(--danger); border-color: var(--danger);">
                                        <i class="fa-solid fa-right-from-bracket"></i> تسجيل الخروج من النظام
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 5. Settings Tab: System Info & Audit Status -->
                <div class="inv-tab-panel" id="settings-panel-system">
                    <div class="card" style="border-radius: 0 0 var(--radius-md) var(--radius-md);">
                        <div class="card-header">
                            <span class="card-title"><i class="fa-solid fa-circle-info" style="color: var(--color-emerald, #047857);"></i> حالة النظام والترقيات والتدقيق</span>
                            <span class="badge badge-emerald">Al-Amira RTL v5.0</span>
                        </div>
                        <div class="card-body">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px;">
                                <div style="background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">إصدار الواجهة البرمجية</div>
                                    <div style="font-size: 14px; font-weight: 800; color: var(--color-emerald, #047857);">Enterprise Emerald Edition v5.0</div>
                                </div>
                                <div style="background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">نمط الواجهة والتصميم</div>
                                    <div style="font-size: 14px; font-weight: 800; color: var(--navy-dark);">Arabic RTL — زمردي هادئ</div>
                                </div>
                                <div style="background: var(--bg-main); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px;">
                                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">طبيعة دفتر الأستاذ</div>
                                    <div style="font-size: 14px; font-weight: 800; color: var(--color-dark-emerald, #064e3b);">سجل حركات غير قابل للتعديل (Immutable)</div>
                                </div>
                            </div>

                            <h4 style="font-size: 14px; font-weight: 800; color: var(--navy-dark); margin-bottom: 10px;">
                                <i class="fa-solid fa-code-branch" style="color: var(--color-emerald, #047857);"></i> حالة دوال الخادم المتقدمة (Database RPCs & Migrations):
                            </h4>
                            <div class="table-responsive">
                                <table class="data-table" style="font-size: 12.5px;">
                                    <thead>
                                        <tr>
                                            <th>اسم الدالة (RPC)</th>
                                            <th>الغرض المحاسبي / الفني</th>
                                            <th>الحالة البرمجية بالواجهة</th>
                                            <th>الحالة بقاعدة البيانات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><code>create_product_opening_balance</code></td>
                                            <td>تسجيل الصنف بالرصيد الافتتاحي وإنشاء قيد المخزن</td>
                                            <td><span class="badge badge-emerald">مدمجة ومكتملة</span></td>
                                            <td><span class="badge badge-warning">بانتظار تنفيذ Migration</span></td>
                                        </tr>
                                        <tr>
                                            <td><code>archive_product</code></td>
                                            <td>أرشفة وتعطيل الصنف مع الفحص الرقابي</td>
                                            <td><span class="badge badge-emerald">مدمجة ومكتملة</span></td>
                                            <td><span class="badge badge-warning">بانتظار تنفيذ Migration</span></td>
                                        </tr>
                                        <tr>
                                            <td><code>export_full_backup</code></td>
                                            <td>استخراج النسخة السحابية الشاملة بصيغة JSON</td>
                                            <td><span class="badge badge-emerald">مدمجة ومكتملة</span></td>
                                            <td><span class="badge badge-emerald">مدعومة سحابياً / مع بديل احتياطي</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>`;

html = html.substring(0, settingsOldStart) + settingsNewHtml + html.substring(settingsOldEnd);
console.log('Replaced view-settings HTML successfully');

// 5. Update App.toggleSidebar and App.navigate to handle sidebar-overlay
html = html.replace(
    'toggleSidebar() {\n                document.getElementById(\'sidebar\').classList.toggle(\'mobile-open\');\n            },',
    `toggleSidebar() {
                const sb = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sb) sb.classList.toggle('mobile-open');
                if (overlay) overlay.classList.toggle('active');
            },`
);

// In App.navigate, ensure sidebar-overlay active is removed
html = html.replace(
    `document.getElementById('sidebar').classList.remove('mobile-open');`,
    `const sb = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sb) sb.classList.remove('mobile-open');
                if (overlay) overlay.classList.remove('active');`
);

// 6. Update SettingsSection definition in JavaScript
const ssOldStart = html.indexOf('const SettingsSection = {');
const ssOldEnd = html.indexOf('const CustomersModule = {', ssOldStart);

const newSettingsAndBackupModules = `const BackupRestoreModule = {
            cachedRestoreData: null,

            renderStatus() {
                const tsEl = document.getElementById('last-backup-timestamp-text');
                const lastTime = AppState.lastBackupTime || localStorage.getItem('alamira_last_backup_time');
                if (tsEl) {
                    if (lastTime) {
                        const d = new Date(lastTime);
                        tsEl.innerText = d.toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });
                    } else {
                        tsEl.innerText = 'لم يتم إنشاء نسخة بعد';
                    }
                }
            },

            async createFullBackup() {
                if (!App.requireCloud()) return;

                showToast('جاري استخراج النسخة الاحتياطية وتجميع بيانات النظام...', 'info');

                try {
                    let backupPayload = null;
                    // 1. Attempt to call server-side RPC if available
                    try {
                        const { data, error } = await AppState.supabaseClient.rpc('export_full_backup');
                        if (!error && data) {
                            backupPayload = data;
                        }
                    } catch (rpcErr) {
                        console.warn('RPC export_full_backup not available, falling back to client-assembled dataset:', rpcErr);
                    }

                    // 2. If RPC not available, assemble full comprehensive dataset from AppState
                    if (!backupPayload) {
                        backupPayload = {
                            metadata: {
                                system: 'Al-Amira Sales & Inventory System',
                                version: '5.0',
                                export_date: new Date().toISOString(),
                                exported_by: AppState.currentUser ? AppState.currentUser.id : null,
                                source: 'cloud_snapshot'
                            },
                            data: {
                                products: AppState.products || [],
                                categories: AppState.categories || [],
                                customers: AppState.customers || [],
                                suppliers: AppState.suppliers || [],
                                sales_invoices: AppState.invoices || [],
                                sales_invoice_items: AppState.invoiceItems || [],
                                stock_receipts: AppState.receipts || [],
                                stock_receipt_items: AppState.receiptItems || [],
                                stock_issues: AppState.issues || [],
                                stock_issue_items: AppState.issueItems || [],
                                inventory_movements: AppState.movements || [],
                                inventory_adjustments: AppState.adjustments || [],
                                settings: AppState.settings || {}
                            }
                        };
                    }

                    const jsonStr = JSON.stringify(backupPayload, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const filename = 'AlAmira_Backup_' + new Date().toISOString().slice(0, 10) + '_' + Date.now() + '.json';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    AppState.lastBackupTime = new Date().toISOString();
                    localStorage.setItem('alamira_last_backup_time', AppState.lastBackupTime);
                    this.renderStatus();
                    App.checkBackupWarning();
                    showToast('تم استخراج وتحميل النسخة الاحتياطية بنجاح (' + filename + ')', 'success');
                } catch (err) {
                    showToast('فشل إنشاء النسخة الاحتياطية: ' + (err.message || err), 'error');
                }
            },

            triggerRestoreFileDialog() {
                alert('تنبيه أمني وإرشادي:\\n\\nحفاظاً على سلامة البيانات وسجل الحركات المحاسبي المعصوم من التعديل، تم تعطيل الاستعادة المباشرة من داخل المتصفح لأسباب أمنية.\\n\\nلإجراء استعادة شاملة لقاعدة البيانات، يجب تنفيذها بواسطة مسؤولي النظام عبر أدوات الخادم الرسمية (psql أو لوحة تحكم Supabase).\\n\\nخاصية تصدير النسخ الاحتياطية (JSON & Excel) تعمل بكفاءة تامة وتوفر سجلاً كاملاً للبيانات.');
            }
        };

        const SettingsSection = {
            currentTab: 'company',

            switchTab(tab) {
                this.currentTab = tab;
                document.querySelectorAll('#view-settings .inv-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#view-settings .inv-tab-panel').forEach(p => p.classList.remove('active'));

                const tabBtn = document.getElementById('settings-tab-' + tab);
                const panel = document.getElementById('settings-panel-' + tab);
                if (tabBtn) tabBtn.classList.add('active');
                if (panel) panel.classList.add('active');

                if (tab === 'company') this.loadCompanyProfile();
                if (tab === 'backup') BackupRestoreModule.renderStatus();
                if (tab === 'account') this.syncAccountInfo();
                if (tab === 'supabase') this.syncConnectionInfo();
            },

            loadCompanyProfile() {
                let profile = (AppState.settings && AppState.settings.company_profile) || null;
                if (!profile) {
                    try {
                        const saved = localStorage.getItem('alamira_company_profile');
                        if (saved) profile = JSON.parse(saved);
                    } catch (e) {}
                }
                profile = profile || {};

                const nameEl = document.getElementById('setting-company-name');
                const actEl = document.getElementById('setting-company-activity');
                const phoneEl = document.getElementById('setting-company-phone');
                const addrEl = document.getElementById('setting-company-address');
                const regEl = document.getElementById('setting-company-reg');
                const taxEl = document.getElementById('setting-company-tax');
                const notesEl = document.getElementById('setting-company-notes');

                if (nameEl) nameEl.value = profile.name || 'الأميرة للتوريدات العامة والتجارة';
                if (actEl) actEl.value = profile.activity || 'توريدات عامة وتجارة';
                if (phoneEl) phoneEl.value = profile.phone || '';
                if (addrEl) addrEl.value = profile.address || '';
                if (regEl) regEl.value = profile.commercial_reg || '';
                if (taxEl) taxEl.value = profile.tax_id || '';
                if (notesEl) notesEl.value = profile.notes || '';
            },

            async saveCompanyProfile(e) {
                if (e && e.preventDefault) e.preventDefault();

                const profile = {
                    name: (document.getElementById('setting-company-name').value || '').trim() || 'الأميرة للتوريدات العامة والتجارة',
                    activity: (document.getElementById('setting-company-activity').value || '').trim() || 'توريدات عامة وتجارة',
                    phone: (document.getElementById('setting-company-phone').value || '').trim(),
                    address: (document.getElementById('setting-company-address').value || '').trim(),
                    commercial_reg: (document.getElementById('setting-company-reg').value || '').trim(),
                    tax_id: (document.getElementById('setting-company-tax').value || '').trim(),
                    notes: (document.getElementById('setting-company-notes').value || '').trim()
                };

                if (!AppState.settings) AppState.settings = {};
                AppState.settings.company_profile = profile;
                localStorage.setItem('alamira_company_profile', JSON.stringify(profile));

                // Persist to Supabase app_settings table if possible
                if (AppState.supabaseClient && AppState.isCloud) {
                    try {
                        await AppState.supabaseClient.from('app_settings').upsert({
                            key: 'company_profile',
                            value: profile,
                            updated_at: new Date().toISOString()
                        });
                    } catch (err) {
                        console.warn('Could not persist company profile to cloud table, preserved locally:', err);
                    }
                }

                if (typeof PrintModule !== 'undefined' && PrintModule.updatePrintHeader) {
                    PrintModule.updatePrintHeader();
                }

                showToast('تم حفظ وتحديث بيانات وهوية المؤسسة بنجاح', 'success');
            },

            syncAccountInfo() {
                const nameEl = document.getElementById('settings-user-name');
                const emailEl = document.getElementById('settings-user-email');
                const avatarEl = document.getElementById('settings-user-avatar');
                if (AppState.currentUser) {
                    const fullName = AppState.currentUser.full_name || AppState.currentUser.user_metadata?.full_name || 'مستخدم النظام';
                    const email = AppState.currentUser.email || 'admin@alamira.com';
                    if (nameEl) nameEl.innerText = fullName;
                    if (emailEl) emailEl.innerText = email;
                    if (avatarEl) avatarEl.innerText = fullName.charAt(0) || 'م';
                } else {
                    if (nameEl) nameEl.innerText = 'مستخدم النظام';
                    if (emailEl) emailEl.innerText = 'admin@alamira.com';
                    if (avatarEl) avatarEl.innerText = 'م';
                }
            },

            syncConnectionInfo() {
                const pill = document.getElementById('connection-pill-settings');
                const urlDisplay = document.getElementById('settings-supabase-url-display');
                const savedUrl = localStorage.getItem('alamira_supabase_url') || DEFAULT_SUPABASE_URL;

                if (urlDisplay) {
                    urlDisplay.innerText = savedUrl;
                }

                if (pill) {
                    if (AppState.isCloud) {
                        pill.className = 'status-pill online';
                        pill.innerHTML = '<i class="fa-solid fa-cloud"></i> متصل بسحابة Supabase';
                    } else {
                        pill.className = 'status-pill local';
                        pill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> غير متصل بالسحابة';
                    }
                }
            }
        };\n\n        /**\n         * --------------------------------------------------------------------------\n         * MODULE 4: CUSTOMERS (دليل إدارة العملاء المستقل)\n         * --------------------------------------------------------------------------\n         */\n        `;

html = html.substring(0, ssOldStart) + newSettingsAndBackupModules + html.substring(ssOldEnd);
console.log('Replaced SettingsSection & injected BackupRestoreModule in JS');

// 7. Update renderAll to call SettingsSection.loadCompanyProfile()
html = html.replace(
    'SettingsSection.syncAccountInfo();\n                SettingsSection.syncConnectionInfo();',
    `SettingsSection.syncAccountInfo();\n                SettingsSection.syncConnectionInfo();\n                SettingsSection.loadCompanyProfile();`
);

// 8. Add App.formatErrorMessage helper for unified Arabic error messages
if (!html.includes('formatErrorMessage(err')) {
    const errorHelperStr = `
            formatErrorMessage(err, fallback = 'حدث خطأ غير متوقع أثناء معالجة العملية') {
                if (!err) return fallback;
                const msg = (typeof err === 'string' ? err : (err.message || err.details || err.hint || JSON.stringify(err))) || '';
                if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('net::ERR_')) {
                    return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.';
                }
                if (msg.includes('JWT') || msg.includes('token') || msg.includes('Invalid login credentials') || msg.includes('session')) {
                    return 'بيانات تسجيل الدخول غير صحيحة أو انتهت جلسة العمل، يرجى تسجيل الدخول مجدداً.';
                }
                if (msg.includes('permission denied') || msg.includes('row-level security') || msg.includes('RLS')) {
                    return 'تم رفض العملية: ليس لديك صلاحية كافية لتنفيذ هذا الإجراء (قواعد الأمان RLS).';
                }
                if (msg.includes('function') && (msg.includes('does not exist') || msg.includes('not found'))) {
                    return 'الدالة المطلوبة غير متوفرة بعد على الخادم السحابي (بانتظار تنفيذ Migration بقاعدة البيانات).';
                }
                if (msg.includes('stock') || msg.includes('insufficient') || msg.includes('رصيد')) {
                    return 'الرصيد المتاح من الصنف غير كافٍ لإتمام العملية.';
                }
                return msg || fallback;
            },
    `;
    html = html.replace('init() {', errorHelperStr + '\n            init() {');
    console.log('Added App.formatErrorMessage helper');
}

// Write modified HTML
fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html successfully updated! Length:', html.length);
