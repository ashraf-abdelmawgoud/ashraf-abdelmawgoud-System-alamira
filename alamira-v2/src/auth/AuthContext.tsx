/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { User, Role } from '@/types'
import {
  MOCK_USERS,
  Permission,
  hasPermission as checkPermission,
  canCancelInvoice as checkCanCancelInvoice,
  canCreateCustomer as checkCanCreateCustomer,
  canEditCustomer as checkCanEditCustomer,
  canDeleteCustomer as checkCanDeleteCustomer,
  canManageSuppliers as checkCanManageSuppliers,
  canViewCostPrice as checkCanViewCostPrice,
  canViewExactStock as checkCanViewExactStock,
  canAccessRoute as checkCanAccessRoute,
} from './rbac'
import { mockDataService, INITIAL_MOCK_USERS } from '@/services/mockDataService'
import { isMockMode, getSupabaseClient, isSupabaseConfigured } from '@/services/supabaseClient'
import { cacheService } from '@/services/cacheService'

export interface AuthContextValue {
  currentUser: User
  users: User[]
  isAuthenticated: boolean
  isLoadingAuth: boolean
  authError: string | null
  isMock: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  clearAuthError: () => void
  setCurrentUser: (user: User) => void
  switchRole: (role: Role) => void
  switchUser: (user: User) => void
  toggleRole: () => void
  refreshUsers: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
  canCancelInvoice: (invoice: { status: string; created_by?: string | null }) => boolean
  canCreateCustomer: boolean
  canEditCustomer: (customer: { created_by?: string | null }) => boolean
  canDeleteCustomer: boolean
  canManageSuppliers: boolean
  canViewCostPrice: boolean
  canViewExactStock: boolean
  canAccessRoute: (path: string) => boolean
}

// Default value (Admin with full permissions) for seamless standalone test execution
export const defaultAuthContextValue: AuthContextValue = {
  currentUser: MOCK_USERS.ADMIN,
  users: INITIAL_MOCK_USERS,
  isAuthenticated: true,
  isLoadingAuth: false,
  authError: null,
  isMock: true,
  login: async () => ({ success: true }),
  logout: async () => {},
  clearAuthError: () => {},
  setCurrentUser: () => {},
  switchRole: () => {},
  switchUser: () => {},
  toggleRole: () => {},
  refreshUsers: async () => {},
  hasPermission: (permission) => checkPermission(MOCK_USERS.ADMIN, permission),
  canCancelInvoice: (inv) => checkCanCancelInvoice(MOCK_USERS.ADMIN, inv),
  canCreateCustomer: true,
  canEditCustomer: () => true,
  canDeleteCustomer: true,
  canManageSuppliers: true,
  canViewCostPrice: true,
  canViewExactStock: true,
  canAccessRoute: () => true,
}

export const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue)

export interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User
  forceMockMode?: boolean
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialUser = MOCK_USERS.ADMIN,
  forceMockMode,
}) => {
  const isMock = forceMockMode !== undefined ? forceMockMode : isMockMode()
  const [currentUser, setCurrentUser] = useState<User>(initialUser)
  const [users, setUsers] = useState<User[]>(INITIAL_MOCK_USERS)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isMock)
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(!isMock)
  const [authError, setAuthError] = useState<string | null>(null)

  const isBootstrappedRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const currentUserRef = useRef<User>(currentUser)
  currentUserRef.current = currentUser

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  // -------------------------------------------------------------------------
  // REAL SUPABASE AUTHENTICATION INITIALIZATION & SESSION RESTORATION
  // -------------------------------------------------------------------------
  const syncRealSession = useCallback(
    async (options: { isInitialBoot?: boolean } = {}) => {
      const { isInitialBoot = false } = options

      if (isMock || !isSupabaseConfigured()) {
        setIsAuthenticated(true)
        setIsLoadingAuth(false)
        isBootstrappedRef.current = true
        return
      }

      // Avoid simultaneous duplicate session sync calls
      if (isRefreshingRef.current) return
      isRefreshingRef.current = true

      // Show full-screen loader ONLY during initial boot or when no session has been bootstrapped yet
      if (isInitialBoot || !isBootstrappedRef.current) {
        setIsLoadingAuth(true)
      }

      try {
        const supabase = getSupabaseClient()
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session?.user) {
          setIsAuthenticated(false)
          if (isInitialBoot || !isBootstrappedRef.current) {
            setIsLoadingAuth(false)
          }
          isBootstrappedRef.current = true
          return
        }

        // Verify membership in server-controlled authorized_users allowlist
        const { data: authRecord, error: authErr } = await supabase
          .from('authorized_users')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (authErr || !authRecord) {
          await supabase.auth.signOut()
          setAuthError('تم التحقق من بيانات الدخول، ولكن هذا الحساب غير مصرح له بالدخول للمنظومة.')
          setIsAuthenticated(false)
          setCurrentUser(MOCK_USERS.ADMIN)
          return
        }

        if (authRecord.is_active === false) {
          await supabase.auth.signOut()
          setAuthError('عفواً، تم تعطيل هذا الحساب. يرجى التواصل مع إدارة النظام.')
          setIsAuthenticated(false)
          setCurrentUser(MOCK_USERS.ADMIN)
          return
        }

        // Valid session & authorized user
        const mappedUser: User = {
          id: authRecord.user_id,
          name: authRecord.full_name || session.user.email?.split('@')[0] || 'مستخدم',
          username: authRecord.username || authRecord.email?.split('@')[0] || 'user',
          email: authRecord.email || session.user.email || '',
          role: (authRecord.role as Role) || 'ADMIN',
          title: authRecord.role === 'SALES_OPERATOR' ? 'مسؤول مبيعات' : 'مدير النظام',
          is_active: authRecord.is_active !== false,
        }

        // Only update state if identity or role has actually changed to prevent cascading re-renders
        const prev = currentUserRef.current
        if (
          prev.id !== mappedUser.id ||
          prev.role !== mappedUser.role ||
          prev.name !== mappedUser.name ||
          prev.is_active !== mappedUser.is_active
        ) {
          setCurrentUser(mappedUser)
        }
        setIsAuthenticated(true)
        setAuthError(null)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء استعادة جلسة المستخدم'
        // If we have not bootstrapped yet, report error and mark unauthenticated
        if (!isBootstrappedRef.current) {
          setAuthError(msg)
          setIsAuthenticated(false)
        } else {
          // In an active session, log warning for transient network failures without unmounting app
          console.warn('Silent token/session refresh failed:', msg)
        }
      } finally {
        isRefreshingRef.current = false
        isBootstrappedRef.current = true
        setIsLoadingAuth(false)
      }
    },
    [isMock]
  )

  useEffect(() => {
    // 1. Initial boot: checks session with full-screen loader
    syncRealSession({ isInitialBoot: true })

    if (!isMock && isSupabaseConfigured()) {
      const supabase = getSupabaseClient()
      const authResponse = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          cacheService.clear()
          setIsAuthenticated(false)
          setCurrentUser(MOCK_USERS.ADMIN)
          setIsLoadingAuth(false)
        } else if (event === 'SIGNED_IN') {
          // If a genuine sign-in event occurred, bootstrap if needed or sync profile in background
          syncRealSession({ isInitialBoot: !isBootstrappedRef.current })
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed: ALWAYS in background without unmounting the application!
          syncRealSession({ isInitialBoot: false })
        }
      })

      return () => {
        authResponse?.data?.subscription?.unsubscribe?.()
      }
    }
  }, [syncRealSession, isMock])

  // -------------------------------------------------------------------------
  // REAL SUPABASE LOGIN
  // -------------------------------------------------------------------------
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setAuthError(null)

      if (isMock) {
        // In mock mode, find matching mock user or log in as Admin
        const matched = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase().trim())
        if (matched) {
          if (matched.is_active === false) {
            const msg = 'عفواً، تم تعطيل هذا الحساب.'
            setAuthError(msg)
            return { success: false, error: msg }
          }
          setCurrentUser(matched)
          setIsAuthenticated(true)
          return { success: true }
        }
        setIsAuthenticated(true)
        return { success: true }
      }

      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          let userMsg = error.message
          if (error.message.includes('Invalid login credentials')) {
            userMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
          }
          setAuthError(userMsg)
          return { success: false, error: userMsg }
        }

        if (!data.user) {
          const msg = 'فشل التحقق من بيانات المستخدم.'
          setAuthError(msg)
          return { success: false, error: msg }
        }

        // Verify allowlist membership and role
        const { data: authRecord, error: authErr } = await supabase
          .from('authorized_users')
          .select('*')
          .eq('user_id', data.user.id)
          .single()

        if (authErr || !authRecord) {
          await supabase.auth.signOut()
          const msg = 'تم التحقق من بيانات الدخول، ولكن هذا الحساب غير مصرح له بالدخول لمنظومة شركة الأميرة.'
          setAuthError(msg)
          return { success: false, error: msg }
        }

        if (authRecord.is_active === false) {
          await supabase.auth.signOut()
          const msg = 'عفواً، تم تعطيل هذا الحساب من قبل الإدارة.'
          setAuthError(msg)
          return { success: false, error: msg }
        }

        const loggedUser: User = {
          id: authRecord.user_id,
          name: authRecord.full_name,
          username: authRecord.username || authRecord.email?.split('@')[0] || 'user',
          email: authRecord.email,
          role: (authRecord.role as Role) || 'ADMIN',
          title: authRecord.role === 'SALES_OPERATOR' ? 'مسؤول مبيعات' : 'مدير النظام',
          is_active: authRecord.is_active !== false,
        }

        setCurrentUser(loggedUser)
        setIsAuthenticated(true)
        setAuthError(null)
        return { success: true }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء تسجيل الدخول'
        setAuthError(msg)
        return { success: false, error: msg }
      }
    },
    [isMock, users]
  )

  // -------------------------------------------------------------------------
  // REAL SUPABASE LOGOUT
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    cacheService.clear()
    if (!isMock && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
      } catch {
        // Ignore signout errors
      }
    }
    setIsAuthenticated(false)
    setCurrentUser(MOCK_USERS.ADMIN)
    setAuthError(null)
  }, [isMock])

  // -------------------------------------------------------------------------
  // MOCK USER SWITCHING & TESTING HELPERS
  // -------------------------------------------------------------------------
  const refreshUsers = useCallback(async () => {
    if (!isMock) return
    try {
      const list = await mockDataService.getUsers()
      setUsers(list)
      const updatedCurrent = list.find((u) => u.id === currentUser.id)
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent)
      }
    } catch {
      // Fallback in case of mock service error
    }
  }, [currentUser.id, isMock])

  const switchUser = useCallback(
    (user: User) => {
      if (!isMock) return
      cacheService.clear()
      mockDataService.logAuthSwitchUser(user, currentUser)
      setCurrentUser(user)
    },
    [currentUser, isMock]
  )

  const switchRole = useCallback(
    (role: Role) => {
      if (!isMock) return
      cacheService.clear()
      mockDataService.logAuthSwitchRole(role, currentUser)
      const candidate = users.find((u) => u.role === role && u.is_active) || MOCK_USERS[role]
      setCurrentUser(candidate)
    },
    [users, currentUser, isMock]
  )

  const toggleRole = useCallback(() => {
    if (!isMock) return
    cacheService.clear()
    const nextRole: Role = currentUser.role === 'ADMIN' ? 'SALES_OPERATOR' : 'ADMIN'
    const candidate = users.find((u) => u.role === nextRole && u.is_active) || MOCK_USERS[nextRole]
    setCurrentUser(candidate)
  }, [currentUser.role, users, isMock])

  const value = useMemo<AuthContextValue>(() => {
    return {
      currentUser,
      users,
      isAuthenticated,
      isLoadingAuth,
      authError,
      isMock,
      login,
      logout,
      clearAuthError,
      setCurrentUser,
      switchRole,
      switchUser,
      toggleRole,
      refreshUsers,
      hasPermission: (permission) => checkPermission(currentUser, permission),
      canCancelInvoice: (inv) => checkCanCancelInvoice(currentUser, inv),
      canCreateCustomer: checkCanCreateCustomer(currentUser),
      canEditCustomer: (cust) => checkCanEditCustomer(currentUser, cust),
      canDeleteCustomer: checkCanDeleteCustomer(currentUser),
      canManageSuppliers: checkCanManageSuppliers(currentUser),
      canViewCostPrice: checkCanViewCostPrice(currentUser),
      canViewExactStock: checkCanViewExactStock(currentUser),
      canAccessRoute: (path) => checkCanAccessRoute(currentUser, path),
    }
  }, [
    currentUser,
    users,
    isAuthenticated,
    isLoadingAuth,
    authError,
    isMock,
    login,
    logout,
    clearAuthError,
    switchRole,
    switchUser,
    toggleRole,
    refreshUsers,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  return ctx || defaultAuthContextValue
}
