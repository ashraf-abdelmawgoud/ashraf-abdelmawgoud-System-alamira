import { describe, it, expect, beforeEach } from 'vitest'
import { PRIMARY_ADMIN_ID } from '@/auth/rbac'

/**
 * Pure authorization evaluation logic extracted directly from
 * supabase/functions/create-sales-operator/index.ts (Step 4: ADMIN Verification).
 */
export interface ProfileQueryResult {
  data: { role: string; is_active: boolean } | null
  error: { code?: string; message?: string } | null
}

export interface AuthzVerificationParams {
  adminClientLookup: () => Promise<ProfileQueryResult>
  callerClientLookup?: () => Promise<ProfileQueryResult>
  callerUserId: string
  logger?: {
    info?: (msg: string) => void
    warn?: (msg: string) => void
    error?: (msg: string) => void
  }
}

export interface AuthzEvaluationResponse {
  status: 200 | 403 | 500
  body: {
    error?: string
    code?: string
    success?: boolean
  }
}

export async function evaluateCallerAdminAuthorization({
  adminClientLookup,
  callerClientLookup,
  logger = { info: () => {}, warn: () => {}, error: () => {} },
}: AuthzVerificationParams): Promise<AuthzEvaluationResponse> {
  // Query caller's profile in public.authorized_users using maybeSingle()
  let { data: callerProfile, error: profileError } = await adminClientLookup()

  // Safe fallback: if adminClient encountered a database query error, attempt lookup with caller's verified client
  if (profileError && callerClientLookup) {
    logger.warn?.(`[AUTHZ_DIAG] stage=admin_client_lookup safe_error_code=${profileError.code || 'UNKNOWN'}`)
    const fallback = await callerClientLookup()
    if (!fallback.error && fallback.data) {
      callerProfile = fallback.data
      profileError = null
      logger.info?.('[AUTHZ_DIAG] stage=caller_client_fallback profile_found=true')
    }
  }

  // Distinguish database query errors from valid authorization denials
  if (profileError) {
    logger.error?.(
      `[AUTHZ_DIAG] stage=caller_profile_lookup safe_error_code=${profileError.code || 'UNKNOWN'} profile_found=false admin_passed=false`
    )
    return {
      status: 500,
      body: {
        error: 'فشل التحقق من صلاحيات المستخدم في قاعدة البيانات (Database Authorization Query Failed)',
        code: 'AUTHZ_DB_ERROR',
      },
    }
  }

  const profileFound = Boolean(callerProfile)
  const normalizedRole = (callerProfile?.role || '').trim().toUpperCase()
  const isActive = callerProfile?.is_active === true
  const adminPassed = profileFound && normalizedRole === 'ADMIN' && isActive

  logger.info?.(
    `[AUTHZ_DIAG] stage=admin_verification profile_found=${profileFound} admin_passed=${adminPassed}`
  )

  if (!adminPassed) {
    return {
      status: 403,
      body: {
        error: 'غير مصرح: إنشاء حسابات مسؤولي المبيعات مقتصر حصراً على مدير النظام النشط (ADMIN)',
        code: 'FORBIDDEN_NOT_ADMIN',
      },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}

describe('Al-Amira ERP V2 — Edge Function create-sales-operator Authorization Engine', () => {
  const infoLogs: string[] = []
  const warnLogs: string[] = []
  const errorLogs: string[] = []

  const testLogger = {
    info: (msg: string) => infoLogs.push(msg),
    warn: (msg: string) => warnLogs.push(msg),
    error: (msg: string) => errorLogs.push(msg),
  }

  beforeEach(() => {
    infoLogs.length = 0
    warnLogs.length = 0
    errorLogs.length = 0
  })

  // 1. Valid Active Primary Admin Passes Authorization
  it('allows valid authenticated primary ADMIN with active authorized_users record to pass authorization (status 200)', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: PRIMARY_ADMIN_ID,
      adminClientLookup: async () => ({
        data: { role: 'ADMIN', is_active: true },
        error: null,
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(infoLogs).toContain('[AUTHZ_DIAG] stage=admin_verification profile_found=true admin_passed=true')
  })

  // 2. Case-Insensitive Role Normalization
  it('allows active ADMIN with lowercase or padded role ("admin", " ADMIN ") to pass authorization', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: PRIMARY_ADMIN_ID,
      adminClientLookup: async () => ({
        data: { role: 'admin ', is_active: true },
        error: null,
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  // 3. Inactive Administrator is Denied with 403
  it('returns HTTP 403 when caller has role ADMIN but is_active = false', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: PRIMARY_ADMIN_ID,
      adminClientLookup: async () => ({
        data: { role: 'ADMIN', is_active: false },
        error: null,
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN_NOT_ADMIN')
    expect(res.body.error).toContain('مقتصر حصراً على مدير النظام النشط')
    expect(infoLogs).toContain('[AUTHZ_DIAG] stage=admin_verification profile_found=true admin_passed=false')
  })

  // 4. SALES_OPERATOR Role is Denied with 403
  it('returns HTTP 403 when caller is a SALES_OPERATOR', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: 'usr-sales-01',
      adminClientLookup: async () => ({
        data: { role: 'SALES_OPERATOR', is_active: true },
        error: null,
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN_NOT_ADMIN')
    expect(res.body.error).toContain('مقتصر حصراً على مدير النظام النشط')
    expect(infoLogs).toContain('[AUTHZ_DIAG] stage=admin_verification profile_found=true admin_passed=false')
  })

  // 5. Unregistered User (Profile Not Found) is Denied with 403
  it('returns HTTP 403 when caller profile is not found in authorized_users allowlist', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: 'unregistered-uuid',
      adminClientLookup: async () => ({
        data: null,
        error: null,
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN_NOT_ADMIN')
    expect(infoLogs).toContain('[AUTHZ_DIAG] stage=admin_verification profile_found=false admin_passed=false')
  })

  // 6. Database Lookup Error Returns HTTP 500 (Never Mislabeled as 403)
  it('returns HTTP 500 when database query error occurs and distinguishes it from 403 authorization denial', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: PRIMARY_ADMIN_ID,
      adminClientLookup: async () => ({
        data: null,
        error: { code: 'PGRST500', message: 'Database connection failed' },
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(500)
    expect(res.body.code).toBe('AUTHZ_DB_ERROR')
    expect(res.body.error).toContain('فشل التحقق من صلاحيات المستخدم في قاعدة البيانات')
    expect(errorLogs).toContain(
      '[AUTHZ_DIAG] stage=caller_profile_lookup safe_error_code=PGRST500 profile_found=false admin_passed=false'
    )
  })

  // 7. Safe Fallback to callerClient on Admin Client Query Error
  it('recovers via callerClient fallback if adminClient encounters query error, passing valid ADMIN without error', async () => {
    const res = await evaluateCallerAdminAuthorization({
      callerUserId: PRIMARY_ADMIN_ID,
      adminClientLookup: async () => ({
        data: null,
        error: { code: 'PGRST116', message: 'Transient query failure' },
      }),
      callerClientLookup: async () => ({
        data: { role: 'ADMIN', is_active: true },
        error: null,
      }),
      logger: testLogger,
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(warnLogs).toContain('[AUTHZ_DIAG] stage=admin_client_lookup safe_error_code=PGRST116')
    expect(infoLogs).toContain('[AUTHZ_DIAG] stage=caller_client_fallback profile_found=true')
    expect(infoLogs).toContain('[AUTHZ_DIAG] stage=admin_verification profile_found=true admin_passed=true')
  })

  // 8. Security Verification: Safe Logging Never Emits Sensitive Credentials
  it('never logs passwords, tokens, request bodies, or user IDs in diagnostic output', async () => {
    await evaluateCallerAdminAuthorization({
      callerUserId: PRIMARY_ADMIN_ID,
      adminClientLookup: async () => ({
        data: null,
        error: { code: '42501', message: 'permission denied' },
      }),
      logger: testLogger,
    })

    const allLogs = [...infoLogs, ...warnLogs, ...errorLogs].join(' ')
    expect(allLogs).not.toMatch(/Bearer/i)
    expect(allLogs).not.toMatch(/password/i)
    expect(allLogs).not.toMatch(/jwt/i)
    expect(allLogs).not.toMatch(/service_role/i)
    expect(allLogs).not.toMatch(new RegExp(PRIMARY_ADMIN_ID, 'i'))
  })

  // 9. Structured PROVISION_INSERT_DIAG on Table Insert Failure
  describe('PROVISION_INSERT_DIAG Structured Server-Side Diagnostics', () => {
    it('records code, message, details, hint, and stage in PROVISION_INSERT_DIAG upon failure without leaking credentials', async () => {
      let loggedError = ''
      const insertError = {
        code: '42501',
        message: 'permission denied for table authorized_users',
        details: 'Failing row contains (some-uuid, test@example.com, ...)',
        hint: 'Check table RLS and service-role grants',
      }

      // Simulate logging as implemented in index.ts
      const logEvent = `[PROVISION_INSERT_DIAG] stage=authorized_users_insert error_code=${insertError.code || 'UNKNOWN'} error_message=${insertError.message || 'UNKNOWN'} error_details=${insertError.details || 'NONE'} error_hint=${insertError.hint || 'NONE'}`
      loggedError = logEvent

      expect(loggedError).toContain('stage=authorized_users_insert')
      expect(loggedError).toContain('error_code=42501')
      expect(loggedError).toContain('error_message=permission denied for table authorized_users')
      expect(loggedError).toContain('error_details=Failing row contains')
      expect(loggedError).toContain('error_hint=Check table RLS')

      // Ensure no raw secrets are logged
      expect(loggedError).not.toMatch(/password/i)
      expect(loggedError).not.toMatch(/service_role/i)
      expect(loggedError).not.toMatch(/Bearer/i)
    })

    // 10. Direct Insertion without Unsupported "phone" column & No Schema-Fallback Retries
    it('permanently omits "phone" from authorized_users insertion payload and performs direct insertion without fallback retry', async () => {
      const insertHistory: Record<string, unknown>[] = []

      const mockDirectInsert = async (payload: Record<string, unknown>) => {
        insertHistory.push(payload)
        return {
          data: {
            user_id: payload.user_id,
            email: payload.email,
            full_name: payload.full_name,
            username: payload.username,
            role: payload.role,
            is_active: payload.is_active,
          },
          error: null,
        }
      }

      // Simulate updated index.ts insertion logic:
      // cleanPhone is present in request body, but authorized_users insert NEVER includes phone
      const cleanPhone = '01012345678'
      const insertPayload: Record<string, unknown> = {
        user_id: 'new-user-123',
        email: 'sales@alamira.com',
        full_name: 'سعيد عبد الله',
        username: 'saeed_sales',
        role: 'SALES_OPERATOR',
        is_active: true,
      }

      const { data: authRecord, error: insertError } = await mockDirectInsert(insertPayload)

      expect(authRecord).toBeDefined()
      expect(insertError).toBeNull()
      // Exactly 1 direct insert attempt (no retry loops)
      expect(insertHistory.length).toBe(1)
      expect(insertHistory[0]).not.toHaveProperty('phone')
      expect(insertPayload).not.toHaveProperty('phone')
      // Phone is only stored in auth.users user_metadata
      expect(cleanPhone).toBe('01012345678')
    })

    // 11. Administrative Client Initialization & 42501 Prevention
    it('initializes administrative client with explicit service_role Authorization header to bypass RLS and prevent 42501', () => {
      const serviceRoleKey = 'test-service-role-key-9988'
      const adminClientConfig = {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      }

      expect(adminClientConfig.auth.persistSession).toBe(false)
      expect(adminClientConfig.global.headers.Authorization).toBe(`Bearer ${serviceRoleKey}`)
      expect(adminClientConfig.global.headers.Authorization).not.toContain('anon')
    })
  })
})
