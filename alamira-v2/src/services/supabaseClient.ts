import { createClient, SupabaseClient } from '@supabase/supabase-js'

declare global {
  interface Window {
    __ALAMIRA_CONFIG__?: {
      SUPABASE_URL?: string
      SUPABASE_ANON_KEY?: string
      SYSTEM_NAME?: string
      ENVIRONMENT?: string
      VERSION?: string
    }
  }
}

/**
 * Resolves the Supabase Project URL from environment variables or runtime config.
 */
export function getSupabaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL.trim()
  }
  if (typeof window !== 'undefined' && window.__ALAMIRA_CONFIG__?.SUPABASE_URL) {
    return window.__ALAMIRA_CONFIG__.SUPABASE_URL.trim()
  }
  return ''
}

/**
 * Resolves the Supabase Public / Anon Key from environment variables or runtime config.
 * Never uses or returns service_role secret keys.
 */
export function getSupabaseAnonKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
  }
  if (typeof window !== 'undefined' && window.__ALAMIRA_CONFIG__?.SUPABASE_ANON_KEY) {
    return window.__ALAMIRA_CONFIG__.SUPABASE_ANON_KEY.trim()
  }
  return ''
}

/**
 * Checks whether valid Supabase connection parameters are present.
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  return Boolean(url && key && url.startsWith('http'))
}

/**
 * Determines whether the application is running in local mock data mode.
 * Default is mock mode unless VITE_ENABLE_MOCK_DATA (or VITE_USE_MOCK) is explicitly set to 'false' AND Supabase is configured.
 */
export function isMockMode(): boolean {
  // Production safety: In production mode, STRICTLY FORBID mock data and demonstration products,
  // even if VITE_ENABLE_MOCK_DATA is explicitly set to 'true'. Real Supabase backend is mandatory in production.
  const isProd = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.PROD)
  if (isProd) {
    return false
  }

  // Preserve mock support ONLY for local development and automated test environments:
  const envFlag =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.VITE_ENABLE_MOCK_DATA ?? import.meta.env?.VITE_USE_MOCK)
      : undefined

  if (envFlag === 'false') {
    return !isSupabaseConfigured()
  }
  if (envFlag === 'true') {
    return true
  }

  // If unset in dev/test, use mock unless Supabase is explicitly configured
  return !isSupabaseConfigured()
}

let supabaseInstance: SupabaseClient | null = null

/**
 * Returns the singleton Supabase client instance.
 * Throws a clear descriptive error if invoked while Supabase is not configured.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  if (!url || !key) {
    throw new Error(
      'تعذر إنشاء اتصال Supabase: لم يتم تهيئة رابط المشروع (VITE_SUPABASE_URL) أو المفتاح العام (VITE_SUPABASE_ANON_KEY)'
    )
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })

  return supabaseInstance
}

/**
 * Explicit helper to reset or reinitialize client (e.g. for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
}
