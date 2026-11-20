import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RootErrorBoundary } from '@/components/ui/RootErrorBoundary'
import { AuthProvider } from '@/auth/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

// Helper component that throws on demand
const ProblematicChild: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Simulated runtime render crash')
  }
  return <div data-testid="safe-content">المحتوى السليم يعمل بشكل طبيعي</div>
}

// Mock Supabase Client for startup testing
const mockGetSession = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue({ error: null })
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
})
const mockFrom = vi.fn()

vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  }),
  isSupabaseConfigured: () => true,
  isMockMode: () => false,
  getSupabaseUrl: () => 'https://mock.supabase.co',
  getSupabaseAnonKey: () => 'mock-anon-key',
}))

describe('Al-Amira ERP V2 — Startup Reliability & White Screen Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    // Suppress console.error in tests for expected thrown errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('RootErrorBoundary Protection', () => {
    it('renders normal children when no error occurs', () => {
      render(
        <RootErrorBoundary>
          <ProblematicChild shouldThrow={false} />
        </RootErrorBoundary>
      )

      expect(screen.getByTestId('safe-content')).toBeInTheDocument()
      expect(screen.getByText('المحتوى السليم يعمل بشكل طبيعي')).toBeInTheDocument()
    })

    it('catches render-time exception and prevents white screen by rendering branded Arabic recovery UI', () => {
      render(
        <RootErrorBoundary>
          <ProblematicChild shouldThrow={true} />
        </RootErrorBoundary>
      )

      // Content should not be visible
      expect(screen.queryByTestId('safe-content')).not.toBeInTheDocument()

      // Branded recovery card must be visible with Arabic labels
      expect(screen.getByText('الأميرة للتوريدات والتجارة العامة')).toBeInTheDocument()
      expect(screen.getByText('حدث خطأ أثناء تشغيل الواجهة')).toBeInTheDocument()
      expect(screen.getByText(/Simulated runtime render crash/i)).toBeInTheDocument()

      // Primary recovery actions must be present
      expect(screen.getByRole('button', { name: /إعادة تحميل المنظومة/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /تسجيل خروج وإعادة الدخول/i })).toBeInTheDocument()
    })

    it('handles safe sign-out and storage purge upon clicking reset action without erasing business data', () => {
      localStorage.setItem('sb-test-auth-token', 'dummy-token')
      localStorage.setItem('alamira_company_profile', JSON.stringify({ name: 'شركة الأميرة' }))
      localStorage.setItem('alamira_custom_measurement_units', JSON.stringify(['وحدة خاصة']))
      sessionStorage.setItem('alamira_stale_asset_reload', '1')

      render(
        <RootErrorBoundary>
          <ProblematicChild shouldThrow={true} />
        </RootErrorBoundary>
      )

      const signOutBtn = screen.getByRole('button', { name: /تسجيل خروج وإعادة الدخول/i })
      fireEvent.click(signOutBtn)

      // Stale auth token purged
      expect(localStorage.getItem('sb-test-auth-token')).toBeNull()
      // Reload guard reset
      expect(sessionStorage.getItem('alamira_stale_asset_reload')).toBeNull()
      // Unrelated business data preserved intact
      expect(localStorage.getItem('alamira_company_profile')).toBeTruthy()
      expect(localStorage.getItem('alamira_custom_measurement_units')).toBeTruthy()
    })
  })

  describe('Clean-Session vs Persisted-Session Startup (Incognito Parity)', () => {
    it('clean session (Incognito simulation) initializes cleanly into LoginModal without errors', async () => {
      // In Incognito: no session
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      render(
        <MemoryRouter>
          <AuthProvider forceMockMode={false}>
            <AppLayout />
          </AuthProvider>
        </MemoryRouter>
      )

      // Should display LoginModal with company logo and form
      const emailInput = await screen.findByPlaceholderText('name@company.com')
      expect(emailInput).toBeInTheDocument()
      expect(screen.getByText('تسجيل الدخول الموحد — منظومة إدارة المبيعات والمخازن V2')).toBeInTheDocument()
    })

    it('corrupted or invalid session in localStorage is cleanly handled and purged without crashing app', async () => {
      // In Regular session with expired/corrupted refresh token:
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Invalid Refresh Token: Refresh Token Not Found'),
      })

      render(
        <MemoryRouter>
          <AuthProvider forceMockMode={false}>
            <AppLayout />
          </AuthProvider>
        </MemoryRouter>
      )

      // Should safely purge invalid session and render LoginModal rather than throwing or blanking
      const emailInput = await screen.findByPlaceholderText('name@company.com')
      expect(emailInput).toBeInTheDocument()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('transient network error during session restore preserves local session and DOES NOT call signOut', async () => {
      // Temporary network failure on mobile cellular:
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Failed to fetch: network connection closed'),
      })

      render(
        <MemoryRouter>
          <AuthProvider forceMockMode={false}>
            <AppLayout />
          </AuthProvider>
        </MemoryRouter>
      )

      // Should display LoginModal or status without destructively deleting user's session tokens
      const emailInput = await screen.findByPlaceholderText('name@company.com')
      expect(emailInput).toBeInTheDocument()
      expect(mockSignOut).not.toHaveBeenCalled()
    })

    it('authenticated session restores user smoothly and renders main dashboard layout', async () => {
      // Valid session
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'usr-admin-prod', email: 'owner@alamira.com' },
            access_token: 'valid-jwt',
          },
        },
        error: null,
      })

      // Valid authorized user record
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: 'usr-admin-prod',
            full_name: 'أشرف مروان',
            username: 'ashraf',
            email: 'owner@alamira.com',
            role: 'ADMIN',
            is_active: true,
          },
          error: null,
        }),
      })

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider forceMockMode={false}>
            <AppLayout />
          </AuthProvider>
        </MemoryRouter>
      )

      // Header & Sidebar should render with restored user name
      const userNames = await screen.findAllByText('أشرف مروان')
      expect(userNames.length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('مدير النظام').length).toBeGreaterThanOrEqual(1)
    })
  })
})
