/**
 * config.js - Public Runtime Configuration for Al-Amira SaaS Dashboard
 * 
 * This file is automatically loaded by index.html before app initialization.
 * It ensures that any new device, browser profile, or mobile user gets the correct
 * Supabase Project URL and public publishable key automatically without requiring
 * manual configuration or existing localStorage.
 * 
 * NOTE: Only public, client-safe keys (anon / publishable) are placed here.
 * Never place service_role keys or secrets in client-facing files.
 */
window.__ALAMIRA_CONFIG__ = Object.freeze({
    SUPABASE_URL: 'https://llmptlkvatndvrmnjiyj.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W',
    SYSTEM_NAME: 'شركة الأميرة للتوريدات العامة والتجارة',
    ENVIRONMENT: 'production',
    VERSION: '5.2.0'
});
