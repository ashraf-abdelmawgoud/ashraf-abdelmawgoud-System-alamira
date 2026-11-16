const settingsHtml = `
            <section id="view-settings" class="view-section">
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
            </section>
`;

console.log('Settings HTML generated. Length:', settingsHtml.length);
