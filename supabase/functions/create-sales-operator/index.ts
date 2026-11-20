// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs as a Supabase Edge Function in Deno runtime.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Dynamic CORS configuration restricting requests to authorized origins.
 * Wildcard '*' is strictly avoided to prevent unauthorized cross-origin invocation.
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigins = [
    'https://system-alamira.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
  ]

  const customAllowed = Deno.env.get('ALLOWED_ORIGIN')
  if (customAllowed) {
    allowedOrigins.push(customAllowed)
  }

  const isAllowed =
    allowedOrigins.includes(origin) ||
    /^https:\/\/system-alamira(-[a-z0-9]+)?\.vercel\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

interface CreateSalesOperatorPayload {
  email: string
  password: string
  full_name: string
  username?: string
  phone?: string
}

function validateStrongPassword(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' }
  }
  // Strong password policy: must contain at least one letter and at least one digit or symbol
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(password)
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

  if (!hasLetter || !hasNumberOrSymbol) {
    return { isValid: false, message: 'يجب أن تحتوي كلمة المرور على أحرف وأرقام أو رموز لضمان أمان الحساب' }
  }
  return { isValid: true }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'طريقة الطلب غير مدعومة (Method Not Allowed)' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate Supabase Environment Configuration (without exposing values)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[CONFIG_ERROR] Required Supabase environment variables are missing on the server.')
      return new Response(
        JSON.stringify({ error: 'إعدادات خادم النظام غير مكتملة (Missing Server Configuration)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate Caller Authentication (Bearer JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح: يجب تسجيل الدخول أولاً كمدير للنظام (Missing Bearer Token)' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Strictly verify caller using SUPABASE_ANON_KEY and caller's JWT (NEVER fallback to service-role key)
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser()
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح: جلسة العمل غير صالحة أو منتهية الصلاحية' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verify Caller has active ADMIN role in public.authorized_users
    // Strictly initialize administrative client with SUPABASE_SERVICE_ROLE_KEY
    // Explicitly set service_role Authorization header to guarantee bypass of RLS and avoid 42501 insufficient_privilege
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
      },
    })

    // Query caller's profile in public.authorized_users using maybeSingle() to avoid PGRST116 error when 0 rows match
    let { data: callerProfile, error: profileError } = await adminClient
      .from('authorized_users')
      .select('role, is_active')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    // Safe fallback: if adminClient encountered a database query error, attempt lookup with caller's verified client
    if (profileError) {
      console.warn(
        `[AUTHZ_DIAG] stage=admin_client_lookup safe_error_code=${profileError.code || 'UNKNOWN'}`
      )
      const fallback = await callerClient
        .from('authorized_users')
        .select('role, is_active')
        .eq('user_id', callerUser.id)
        .maybeSingle()

      if (!fallback.error && fallback.data) {
        callerProfile = fallback.data
        profileError = null
        console.info('[AUTHZ_DIAG] stage=caller_client_fallback profile_found=true')
      }
    }

    // Distinguish database query errors from valid authorization denials
    if (profileError) {
      console.error(
        `[AUTHZ_DIAG] stage=caller_profile_lookup safe_error_code=${profileError.code || 'UNKNOWN'} profile_found=false admin_passed=false`
      )
      return new Response(
        JSON.stringify({
          error: 'فشل التحقق من صلاحيات المستخدم في قاعدة البيانات (Database Authorization Query Failed)',
          code: 'AUTHZ_DB_ERROR',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profileFound = Boolean(callerProfile)
    const normalizedRole = (callerProfile?.role || '').trim().toUpperCase()
    const isActive = callerProfile?.is_active === true
    const adminPassed = profileFound && normalizedRole === 'ADMIN' && isActive

    console.info(
      `[AUTHZ_DIAG] stage=admin_verification profile_found=${profileFound} admin_passed=${adminPassed}`
    )

    if (!adminPassed) {
      return new Response(
        JSON.stringify({
          error: 'غير مصرح: إنشاء حسابات مسؤولي المبيعات مقتصر حصراً على مدير النظام النشط (ADMIN)',
          code: 'FORBIDDEN_NOT_ADMIN',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Parse and Validate Input Payload
    let body: CreateSalesOperatorPayload
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'صيغة البيانات المرسلة غير صالحة (Invalid JSON Payload)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanEmail = (body.email || '').trim().toLowerCase()
    const cleanName = (body.full_name || '').trim()
    const cleanPhone = (body.phone || '').trim() || null
    const cleanPassword = (body.password || '').trim()

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال بريد إلكتروني صالح لمسؤول المبيعات' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!cleanName || cleanName.length < 2) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال اسم مسؤول المبيعات بالكامل (حرفان على الأقل)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Enforce Administrator-Supplied Strong Password Policy (Never silently generate passwords)
    if (!cleanPassword) {
      return new Response(
        JSON.stringify({ error: 'كلمة المرور الأولية مطلوبة لإنشاء حساب مسؤول المبيعات' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const passwordValidation = validateStrongPassword(cleanPassword)
    if (!passwordValidation.isValid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.message || 'كلمة المرور غير مطابقة لسياسة الأمان' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Duplicate Checks in authorized_users (Email) & Unique Username Derivation
    const { data: existingUserByEmail } = await adminClient
      .from('authorized_users')
      .select('user_id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingUserByEmail) {
      return new Response(
        JSON.stringify({ error: `البريد الإلكتروني "${cleanEmail}" مسجل بالفعل لمستخدم مصرح له في النظام` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Safely derive a unique internal username without collisions
    let finalUsername = (body.username || '').trim().toLowerCase()
    if (!finalUsername) {
      const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'sales'
      
      const { data: existingUserByBase } = await adminClient
        .from('authorized_users')
        .select('user_id')
        .eq('username', baseUsername)
        .maybeSingle()

      if (existingUserByBase) {
        finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`
      } else {
        finalUsername = baseUsername
      }
    } else {
      const { data: existingUserByUsername } = await adminClient
        .from('authorized_users')
        .select('user_id')
        .eq('username', finalUsername)
        .maybeSingle()

      if (existingUserByUsername) {
        return new Response(
          JSON.stringify({ error: `اسم المستخدم "${finalUsername}" مستخدم بالفعل، يرجى اختيار اسم مستخدم آخر` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 8. Create Auth Identity using Administrator-Supplied Credentials with Administrative Confirmation
    // NOTE: email_confirm is set to true as this is an explicitly authorized administrative provisioning workflow.
    // Passwords are NEVER logged, stored in application tables, or returned in API responses.
    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        username: finalUsername,
        phone: cleanPhone,
        role: 'SALES_OPERATOR',
        must_change_password: true,
      },
    })

    if (createAuthError || !createdAuth?.user) {
      console.error('[PROVISION_AUTH_ERROR] Failed to create user in auth system.')
      const isDuplicate = createAuthError?.message?.toLowerCase().includes('already')
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? 'البريد الإلكتروني مسجل بالفعل في نظام المصادقة (Auth Identity). يرجى استخدام بريد إلكتروني آخر أو مراجعة الحسابات المعلقة.'
            : 'تعذر إنشاء هوية المستخدم في نظام المصادقة. يرجى التحقق من صحة البيانات المدخلة.',
        }),
        { status: isDuplicate ? 409 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = createdAuth.user.id

    // 9. Create Record in public.authorized_users linking to auth.users(id)
    // NOTE: The unsupported "phone" column is permanently omitted from authorized_users insertion.
    // The phone number is preserved in auth.users user_metadata.
    const insertPayload: Record<string, unknown> = {
      user_id: newUserId,
      email: cleanEmail,
      full_name: cleanName,
      username: finalUsername,
      role: 'SALES_OPERATOR',
      is_active: true,
    }

    const { data: authRecord, error: insertError } = await adminClient
      .from('authorized_users')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertError) {
      // Enhanced SERVER-SIDE structured diagnostic logging
      // Captures error_code, error_message, error_details, and error_hint without exposing sensitive data
      console.error(
        `[PROVISION_INSERT_DIAG] stage=authorized_users_insert error_code=${insertError.code || 'UNKNOWN'} error_message=${insertError.message || 'UNKNOWN'} error_details=${insertError.details || 'NONE'} error_hint=${insertError.hint || 'NONE'}`
      )
      console.error('[PROVISION_INSERT_ERROR] Failed to insert into authorized_users table.')

      // Verified rollback cleanup: attempt to delete orphan auth user
      let rollbackCompleted = false
      try {
        const { error: delError } = await adminClient.auth.admin.deleteUser(newUserId)
        if (!delError) {
          rollbackCompleted = true
          console.info(`[ROLLBACK_SUCCESS] Deleted orphan auth user ${newUserId}`)
        } else {
          console.error(`[ROLLBACK_FAILED] Could not delete orphan auth user ${newUserId}:`, delError)
        }
      } catch (cleanupErr) {
        console.error(`[ROLLBACK_EXCEPTION] Exception deleting orphan auth user ${newUserId}:`, cleanupErr)
      }

      return new Response(
        JSON.stringify({
          error: rollbackCompleted
            ? 'فشل تسجيل بيانات المستخدم في جدول الصلاحيات، وتم إلغاء حساب المصادقة بنجاح. يرجى إعادة المحاولة.'
            : 'فشل تسجيل بيانات المستخدم في جدول الصلاحيات، ولم يتم التمكن من حذف حساب المصادقة تلقائياً (حالة معلقة غير محسومة تتطلب فحص الدعم الفني).',
          rollback_status: rollbackCompleted ? 'completed' : 'unresolved_condition',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 10. Return Sanitized Success Response (Without any plaintext credentials)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إنشاء وتفعيل حساب مسؤول المبيعات بنجاح بكلمة المرور المحددة إدارياً',
        user: {
          id: authRecord.user_id,
          email: authRecord.email,
          name: authRecord.full_name,
          username: authRecord.username,
          role: authRecord.role,
          title: 'مسؤول مبيعات',
          is_active: authRecord.is_active,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    console.error('[UNEXPECTED_SERVER_ERROR]', err)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ داخلي غير متوقع أثناء معالجة الطلب. يرجى المحاولة لاحقاً.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
