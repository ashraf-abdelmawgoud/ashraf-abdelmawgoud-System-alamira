/**
 * api/config.js - Vercel Serverless Function to serve public runtime configuration.
 * 
 * Allows Vercel environment variables (e.g. SUPABASE_URL, SUPABASE_ANON_KEY,
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) to be surfaced dynamically
 * to client browsers, with automatic fallbacks to production project defaults.
 * 
 * Only exposes client-safe public keys. NEVER exposes SERVICE_ROLE keys.
 */
module.exports = (req, res) => {
    // Set permissive CORS for same-origin and safe standard headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    const defaultUrl = 'https://llmptlkvatndvrmnjiyj.supabase.co';
    const defaultAnonKey = 'sb_publishable_7Bq-KxJj0xbpelQRabGsdg_q0EACC8W';

    const supabaseUrl = process.env.SUPABASE_URL ||
                        process.env.NEXT_PUBLIC_SUPABASE_URL ||
                        process.env.VITE_SUPABASE_URL ||
                        defaultUrl;

    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ||
                           process.env.SUPABASE_PUBLISHABLE_KEY ||
                           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                           process.env.VITE_SUPABASE_ANON_KEY ||
                           defaultAnonKey;

    res.status(200).json({
        supabaseUrl,
        supabaseAnonKey,
        systemName: 'شركة الأميرة للتوريدات العامة والتجارة',
        version: '5.2.0',
        environment: process.env.NODE_ENV || 'production'
    });
};
