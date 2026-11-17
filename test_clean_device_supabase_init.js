/**
 * test_clean_device_supabase_init.js
 * 
 * Comprehensive pre-deployment test suite for Al-Amira SaaS Dashboard.
 * Validates:
 * 1. config.js, api/config.js, vercel.json, and index.html configuration integrity.
 * 2. Production deployment configuration precedence over stale or legacy localStorage values.
 * 3. Vercel environment variable names, serverless routing, and fallback mechanism.
 * 4. Zero leakage of secret keys (service_role, database passwords, private JWTs).
 * 5. Strict enforcement of Supabase Auth and RLS (no local auth bypass).
 * 6. SDK initialization, login error handling, and authorized login verification.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('🧪 TEST SUITE: VERCEL PRE-DEPLOYMENT & SUPABASE CONFIGURATION AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log('  ✅ ' + message);
        passCount++;
    } else {
        console.error('  ❌ فشل: ' + message);
        failCount++;
    }
}

// -------------------------------------------------------------------------
// 1. Inspect config.js
// -------------------------------------------------------------------------
console.log('--- 1. فحص ملف التكوين العام للعميل (config.js) ---');
const configPath = path.join(__dirname, 'config.js');
assert(fs.existsSync(configPath), 'وجود ملف config.js في المجلد الجذري للمشروع');

const configContent = fs.readFileSync(configPath, 'utf8');
assert(configContent.includes('window.__ALAMIRA_CONFIG__'), 'تعريف كائن الإعدادات window.__ALAMIRA_CONFIG__');
assert(configContent.includes('https://llmptlkvatndvrmnjiyj.supabase.co'), 'احتواء config.js على رابط المشروع الرسمي الصحيح');
assert(configContent.includes('sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W'), 'احتواء config.js على المفتاح العام Publishable Key');
assert(!configContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xl'), 'خلو config.js تماماً من أي JWT service_role سري');
assert(!/SUPABASE_SERVICE_KEY|SERVICE_ROLE_KEY/i.test(configContent), 'عدم تعيين أي متغيرات لمفاتيح الخدمة السرية');

// -------------------------------------------------------------------------
// 2. Inspect api/config.js (Vercel Serverless Function & Env Variables)
// -------------------------------------------------------------------------
console.log('\n--- 2. فحص الدالة السحابية لمنصة Vercel (api/config.js) وتوافق متغيرات البيئة ---');
const apiConfigPath = path.join(__dirname, 'api', 'config.js');
assert(fs.existsSync(apiConfigPath), 'وجود ملف api/config.js للمنصة السحابية Vercel');

const apiHandler = require('./api/config.js');

// Test 2A: Default fallback
let mockStatus = 0;
let mockJsonData = null;
let mockHeaders = {};

const mockReq = { method: 'GET' };
const mockRes = {
    setHeader(key, val) { mockHeaders[key] = val; },
    status(code) { mockStatus = code; return this; },
    json(data) { mockJsonData = data; return this; },
    end() {}
};

apiHandler(mockReq, mockRes);
assert(mockStatus === 200, 'api/config.js تُرجع كود الحالة 200 بنجاح');
assert(mockHeaders['Access-Control-Allow-Origin'] === '*', 'ضبط ترويسة CORS بشكل سليم');
assert(mockHeaders['Cache-Control'] && mockHeaders['Cache-Control'].includes('s-maxage='), 'ضبط ترويسة Cache-Control لمنع التخزين العالق');
assert(mockJsonData && mockJsonData.supabaseUrl === 'https://llmptlkvatndvrmnjiyj.supabase.co', 'api/config.js توفر supabaseUrl الافتراضي الصحيح');
assert(mockJsonData && mockJsonData.supabaseAnonKey === 'sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W', 'api/config.js توفر supabaseAnonKey الافتراضي الصحيح');
assert(!JSON.stringify(mockJsonData).includes('service_role'), 'api/config.js لا تُسرّب أي مفاتيح سرية مطلقاً');

// Test 2B: Environment variables override in Vercel
const originalEnv = { ...process.env };
process.env.SUPABASE_URL = 'https://custom-env-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'sb_custom_anon_key_test';

let envJsonData = null;
const envMockRes = {
    setHeader() {},
    status() { return this; },
    json(data) { envJsonData = data; return this; },
    end() {}
};
apiHandler(mockReq, envMockRes);
assert(envJsonData && envJsonData.supabaseUrl === 'https://custom-env-project.supabase.co', 'دعم استخراج SUPABASE_URL من متغيرات بيئة Vercel بنجاح');
assert(envJsonData && envJsonData.supabaseAnonKey === 'sb_custom_anon_key_test', 'دعم استخراج SUPABASE_ANON_KEY من متغيرات بيئة Vercel بنجاح');
process.env = originalEnv;

// -------------------------------------------------------------------------
// 3. Inspect vercel.json (Routing, Security Headers & Caching)
// -------------------------------------------------------------------------
console.log('\n--- 3. فحص إعدادات نشر Vercel (vercel.json) والأمان والتوجيه ---');
const vercelPath = path.join(__dirname, 'vercel.json');
assert(fs.existsSync(vercelPath), 'وجود ملف vercel.json لإدارة التوجيه والترويسات الأمنية');
const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
assert(vercelConfig.version === 2, 'إصدار Vercel v2 مدعوم');
assert(vercelConfig.cleanUrls === true, 'تفعيل خاصية cleanUrls لعناوين نظيفة وسريعة');

const headers = vercelConfig.headers || [];
const globalHeaderRule = headers.find(h => h.source === '/(.*)');
assert(globalHeaderRule !== undefined, 'وجود قاعدة ترويسات أمان عامة لكل المسارات');
const globalHeadersMap = {};
(globalHeaderRule?.headers || []).forEach(h => { globalHeadersMap[h.key] = h.value; });
assert(globalHeadersMap['X-Content-Type-Options'] === 'nosniff', 'ترويسة X-Content-Type-Options مضبوطة على nosniff لمنع هجمات MIME sniffing');
assert(globalHeadersMap['X-Frame-Options'] === 'SAMEORIGIN', 'ترويسة X-Frame-Options مضبوطة على SAMEORIGIN لمنع Clickjacking');

const configJsCacheRule = headers.find(h => h.source === '/config.js');
assert(configJsCacheRule !== undefined, 'وجود قاعدة كاش خاصة بـ config.js لمنع الكاش القديم عند التحديث');

// -------------------------------------------------------------------------
// 4. Inspect index.html integration & Script tags
// -------------------------------------------------------------------------
console.log('\n--- 4. فحص تكامل index.html واستدعاء مكتبات الربط السحابي ---');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

assert(html.includes('<script src="config.js"></script>'), 'تضمين <script src="config.js"> في رأس الصفحة قبل التهيئة');
assert(html.includes('src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"'), 'تضمين مكتبة Supabase JS الرسمية');
assert(html.includes('resolveCloudConfig'), 'تنفيذ دالة resolveCloudConfig لحل إعدادات السحابة ديناميكياً');
assert(html.includes('ensureSupabaseSDK'), 'تنفيذ دالة ensureSupabaseSDK لضمان تحميل المكتبة ومعالجة بطء الاتصال');

// -------------------------------------------------------------------------
// 5. Functional Simulation: Clean Device with Empty localStorage
// -------------------------------------------------------------------------
console.log('\n--- 5. محاكاة جهاز جديد وهاتف محمول بنظافة تامة (Empty localStorage Simulation) ---');

const mockStorage = {};
const mockLocalStorage = {
    getItem(key) { return mockStorage[key] || null; },
    setItem(key, val) { mockStorage[key] = String(val); },
    removeItem(key) { delete mockStorage[key]; },
    clear() { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

let createdClientWith = null;
let lastSignInCredentials = null;
let simulatedSignInResult = { data: { user: { id: 'test-user-id', email: 'user@alamira.com' } }, error: null };

const createMockQueryBuilder = (result = []) => {
    const builder = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        eq: () => builder,
        single: async () => ({ data: { user_id: 'test-user-id', is_active: true, full_name: 'مدير النظام' }, error: null }),
        then: (resolve) => resolve({ data: result, error: null })
    };
    return builder;
};

const mockSupabaseSDK = {
    createClient(url, key) {
        createdClientWith = { url, key };
        return {
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                signInWithPassword: async (creds) => {
                    lastSignInCredentials = creds;
                    return simulatedSignInResult;
                },
                signOut: async () => ({ error: null })
            },
            from: (table) => createMockQueryBuilder([])
        };
    }
};

const domElements = {
    'connection-pill': { className: '' },
    'connection-status-text': { innerText: '' },
    'auth-mode-indicator': { innerHTML: '' },
    'offline-warning-banner': { style: { display: '' } },
    'auth-screen': { style: { display: '' } },
    'current-arabic-date': { innerText: '' },
    'config-supabase-url': { value: '' },
    'config-supabase-key': { value: '' },
    'modal-config': { classList: { add() {}, remove() {} } },
    'btn-login-submit': { disabled: false, innerHTML: '' },
    'login-email': { value: 'user@alamira.com' },
    'login-password': { value: 'Secret123!' },
    'sidebar-user-name': { innerText: '' },
    'sidebar-user-role': { innerText: '' },
    'sidebar-user-avatar': { innerText: '' },
    'btn-new-adjustment': { style: { display: '' } },
    'btn-restore-backup': { style: { display: '' } }
};

let lastToastMessage = null;
let lastToastType = null;

const sandbox = {
    console,
    Date,
    setTimeout,
    clearTimeout,
    Promise,
    document: {
        getElementById(id) {
            if (!domElements[id]) domElements[id] = { style: {}, classList: { add() {}, remove() {} } };
            return domElements[id];
        },
        querySelectorAll() { return []; },
        head: { appendChild() {} },
        createElement() { return {}; }
    },
    localStorage: mockLocalStorage,
    window: {
        supabase: mockSupabaseSDK,
        __ALAMIRA_CONFIG__: {
            SUPABASE_URL: 'https://llmptlkvatndvrmnjiyj.supabase.co',
            SUPABASE_ANON_KEY: 'sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W',
            ENVIRONMENT: 'production',
            VERSION: '5.2.0'
        }
    },
    AppState: {
        isCloud: false,
        supabaseClient: null,
        currentUser: null
    },
    showToast(msg, type) {
        lastToastMessage = msg;
        lastToastType = type;
    }
};

const startMarker = 'const DEFAULT_SUPABASE_URL';
const endMarker = 'SECTION CONTROLLER: INVENTORY TABS';
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);
assert(startIdx !== -1 && endIdx !== -1, 'استخراج كائن App والإعدادات الافتراضية بنجاح من index.html');

let appCode = html.substring(startIdx, endIdx);
const lastBraceIdx = appCode.lastIndexOf('};');
appCode = appCode.substring(0, lastBraceIdx + 2);
appCode = appCode.replace('const App =', 'globalThis.App = App =');

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);

// Step A: Ensure localStorage is completely empty (brand new device)
sandbox.localStorage.clear();
assert(sandbox.localStorage.getItem('alamira_supabase_url') === null, 'تفريغ localStorage تماماً لتمثيل هاتف أندرويد أو مستعرض جديد');

// Step B: Run checkSavedCloudConfig on fresh device
const initResult = sandbox.App.checkSavedCloudConfig();
assert(initResult && typeof initResult.then === 'function', 'checkSavedCloudConfig تعمل كدالة غير متزامنة (async)');

initResult.then(async (success) => {
    assert(success === true, 'نجاح الاتصال التلقائي بالسحابة على جهاز جديد بدون وجود أي بيانات مسبقة في localStorage');
    assert(sandbox.AppState.isCloud === true, 'تفعيل حالة السحابة AppState.isCloud = true تلقائياً');
    assert(sandbox.AppState.supabaseClient !== null, 'إنشاء عميل AppState.supabaseClient بنجاح');
    assert(createdClientWith && createdClientWith.url === 'https://llmptlkvatndvrmnjiyj.supabase.co', 'ربط العميل بعنوان Supabase الافتراضي المعتمد');
    assert(createdClientWith && createdClientWith.key === 'sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W', 'ربط العميل بالمفتاح العام Publishable Key');

    // -------------------------------------------------------------------------
    // 6. Production Deployment Configuration Precedence over Stale localStorage
    // -------------------------------------------------------------------------
    console.log('\n--- 6. فحص أولوية إعدادات النشر الرسمية على القيم القديمة العالقة في الذاكرة (Precedence over Stale localStorage) ---');
    
    // Inject stale / obsolete values in localStorage
    sandbox.localStorage.setItem('alamira_supabase_url', 'https://stale-legacy-project.supabase.co');
    sandbox.localStorage.setItem('alamira_supabase_key', 'sb_stale_obsolete_key_xyz');

    const resolved = sandbox.App.resolveCloudConfig();
    assert(resolved.url === 'https://llmptlkvatndvrmnjiyj.supabase.co', 'تفضيل عنوان النشر الرسمي على العنوان القديم العالق في localStorage');
    assert(resolved.key === 'sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W', 'تفضيل مفتاح النشر الرسمي على المفتاح القديم العالق في localStorage');
    assert(sandbox.localStorage.getItem('alamira_supabase_url') === 'https://llmptlkvatndvrmnjiyj.supabase.co', 'المعالجة الذاتية التلقائية وتحديث localStorage بعنوان المشروع الصحيح');

    // -------------------------------------------------------------------------
    // 7. Security: Verify Supabase Auth & RLS Are Not Bypassed
    // -------------------------------------------------------------------------
    console.log('\n--- 7. التحقق الأمني من صرامة المصادقة وعدم تجاوز Supabase Auth أو RLS ---');
    
    // Attempt login without valid credentials
    domElements['login-email'].value = 'wrong@alamira.com';
    domElements['login-password'].value = 'WrongPassword!';
    simulatedSignInResult = { data: { user: null }, error: { message: 'Invalid login credentials' } };

    const mockLoginEvent = { preventDefault() {} };
    await sandbox.App.handleLogin(mockLoginEvent);

    assert(lastToastType === 'error', 'إظهار رسالة خطأ عند إدخال بيانات غير صحيحة');
    assert(lastToastMessage.includes('بيانات تسجيل الدخول غير صحيحة'), 'إظهار رسالة باللغة العربية واضحة تفيد بعدم صحة بيانات الدخول');
    assert(sandbox.AppState.currentUser === null, 'عدم تسجيل الدخول مطلقاً عند فشل التحقق في Supabase Auth (لا يوجد تجاوز محلي)');

    // Attempt login with authorized user credentials
    console.log('\n--- 8. محاكاة تسجيل دخول معتمد بنجاح (Authorized User Workflow) ---');
    domElements['login-email'].value = 'user@alamira.com';
    domElements['login-password'].value = 'Secret123!';
    simulatedSignInResult = { data: { user: { id: 'test-user-id', email: 'user@alamira.com' } }, error: null };

    await sandbox.App.handleLogin(mockLoginEvent);
    assert(sandbox.AppState.currentUser !== null, 'نجاح تسجيل الدخول للمستخدم المصرح له بعد اجتياز Supabase Auth و authorized_users');
    assert(sandbox.AppState.currentUser.email === 'user@alamira.com', 'حفظ بيانات المستخدم المصرح له بشكل صحيح');
    assert(domElements['auth-screen'].style.display === 'none', 'إخفاء شاشة تسجيل الدخول والانتقال للوحة التحكم');

    // Print summary
    console.log('\n=======================================');
    console.log(`Summary: ${passCount} passed, ${failCount} failed.`);
    console.log('=======================================');

    if (failCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}).catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
