/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { ProductsView } from '@/features/products/ProductsView'
import { dataService } from '@/services/dataService'
import { supabaseDataService } from '@/services/supabaseDataService'
import { getSupabaseClient } from '@/services/supabaseClient'
import { MOCK_USERS } from '@/auth/rbac'

// Mock Supabase Client for Auth and Data tests
vi.mock('@/services/supabaseClient', () => {
  const mockSubscription = { unsubscribe: vi.fn() }
  const mockClient = {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: mockSubscription } }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  }
  return {
    getSupabaseClient: vi.fn(() => mockClient),
    isSupabaseConfigured: vi.fn(() => true),
    isMockMode: vi.fn(() => false),
  }
})

describe('Al-Amira ERP V2 — Phase 1 Production Stability & Quality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    const mockClient = getSupabaseClient() as any
    mockClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    mockClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Authentication Remount & Token Refresh Behavior', () => {
    it('does not trigger full-screen loading state on TOKEN_REFRESHED', async () => {
      let authCallback: ((event: string, session: any) => Promise<void>) | null = null
      const mockClient = getSupabaseClient() as any

      mockClient.auth.onAuthStateChange.mockImplementation((cb: any) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      mockClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'usr-admin-01', email: 'admin@alamira.com' },
          },
        },
        error: null,
      })

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'authorized_users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                user_id: 'usr-admin-01',
                full_name: 'المدير العام',
                email: 'admin@alamira.com',
                role: 'ADMIN',
                is_active: true,
              },
              error: null,
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const AuthConsumer: React.FC = () => {
        const { currentUser, isLoadingAuth, isAuthenticated } = useAuth()
        return (
          <div>
            <div data-testid="loading-state">{isLoadingAuth ? 'LOADING' : 'READY'}</div>
            <div data-testid="auth-state">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
            <div data-testid="user-name">{currentUser.name}</div>
          </div>
        )
      }

      render(
        <AuthProvider forceMockMode={false}>
          <AuthConsumer />
        </AuthProvider>
      )

      // Initial boot settles to READY and AUTHENTICATED
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('READY')
        expect(screen.getByTestId('auth-state')).toHaveTextContent('AUTHENTICATED')
        expect(screen.getByTestId('user-name')).toHaveTextContent('المدير العام')
      })

      // Simulate Supabase periodic TOKEN_REFRESHED event
      await act(async () => {
        if (authCallback) {
          await authCallback('TOKEN_REFRESHED', {
            user: { id: 'usr-admin-01', email: 'admin@alamira.com' },
          })
        }
      })

      // Verify that full-screen loader was NOT activated during token refresh
      expect(screen.getByTestId('loading-state')).toHaveTextContent('READY')
      expect(screen.getByTestId('auth-state')).toHaveTextContent('AUTHENTICATED')
    })

    it('sets isAuthenticated to false and resets user on SIGNED_OUT', async () => {
      let authCallback: ((event: string, session: any) => Promise<void>) | null = null
      const mockClient = getSupabaseClient() as any

      mockClient.auth.onAuthStateChange.mockImplementation((cb: any) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      mockClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'usr-admin-01', email: 'admin@alamira.com' },
          },
        },
        error: null,
      })

      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: 'usr-admin-01',
            full_name: 'المدير العام',
            email: 'admin@alamira.com',
            role: 'ADMIN',
            is_active: true,
          },
          error: null,
        }),
      }))

      const AuthConsumer: React.FC = () => {
        const { isAuthenticated } = useAuth()
        return <div data-testid="auth-state">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      }

      render(
        <AuthProvider forceMockMode={false}>
          <AuthConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('AUTHENTICATED')
      })

      // Trigger SIGNED_OUT
      await act(async () => {
        if (authCallback) {
          await authCallback('SIGNED_OUT', null)
        }
      })

      expect(screen.getByTestId('auth-state')).toHaveTextContent('ANONYMOUS')
    })
  })

  describe('2. Dashboard Error Handling & Retry Mechanism', () => {
    it('displays clear error message and functional retry button when data request fails', async () => {
      // Mock dataService.getInvoices to fail initially
      vi.spyOn(dataService, 'getInvoices').mockRejectedValueOnce(
        new Error('HTTP 403: صلاحية الوصول إلى بيانات الفواتير مقيدة')
      )

      render(
        <MemoryRouter>
          <AuthProvider initialUser={MOCK_USERS.ADMIN}>
            <DashboardView />
          </AuthProvider>
        </MemoryRouter>
      )

      // Verify that infinite loading spinner disappears and error UI is displayed
      await waitFor(() => {
        expect(screen.getByText('تعذر تحميل لوحة التحكم')).toBeInTheDocument()
        expect(
          screen.getByText(/صلاحية الوصول إلى بيانات الفواتير مقيدة/i)
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /إعادة المحاولة/i })).toBeInTheDocument()
      })

      // Now restore getInvoices to succeed on retry
      vi.spyOn(dataService, 'getInvoices').mockResolvedValueOnce([])
      vi.spyOn(dataService, 'getProducts').mockResolvedValueOnce([])
      vi.spyOn(dataService, 'getDashboardSummary').mockResolvedValueOnce({
        todaySales: 0,
        todayInvoicesCount: 0,
        totalSales: 0,
        totalProductsCount: 0,
        lowStockProductsCount: 0,
        activeCustomersCount: 0,
        salesTrends: [],
        recentInvoices: [],
        recentMovements: [],
      })

      // Click retry
      const retryButton = screen.getByRole('button', { name: /إعادة المحاولة/i })
      await userEvent.click(retryButton)

      // Dashboard recovers and shows main content
      await waitFor(() => {
        expect(screen.getByText('نظرة عامة على النشاط التجاري')).toBeInTheDocument()
      })
    })
  })

  describe('3. Supabase Request Optimization & Category State Handling', () => {
    it('throws explicit error when categories query fails instead of returning fake data', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'permission denied for table categories' },
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      await expect(supabaseDataService.getCategories()).rejects.toThrow(
        /فشل جلب قائمة الأقسام والتصنيفات/i
      )
    })

    it('returns empty list when categories table is empty and no product categories exist', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const categories = await supabaseDataService.getCategories()
      expect(categories).toEqual([])
      expect(categories).not.toContain('حلويات شرقية')
      expect(categories).not.toContain('حلويات غربية')
    })

    it('reuses pre-fetched invoices and products in getDashboardSummary without re-querying', async () => {
      const getInvoicesSpy = vi.spyOn(supabaseDataService, 'getInvoices')
      const getProductsSpy = vi.spyOn(supabaseDataService, 'getProducts')

      const mockInvoices: any[] = [
        {
          id: 'inv-1',
          invoice_number: 'INV-001',
          status: 'approved',
          invoice_date: '2026-11-20',
          final_total: 500,
          subtotal: 500,
          invoice_discount_amount: 0,
          item_discounts_amount: 0,
          items: [],
        },
      ]
      const mockProducts: any[] = [
        {
          id: 'p-1',
          name: 'كابل نحاس',
          is_active: true,
          isLowStock: false,
        },
      ]

      const mockClient = getSupabaseClient() as any
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 12, error: null }),
          }
        }
        if (table === 'inventory_movements') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const summary = await supabaseDataService.getDashboardSummary({
        invoices: mockInvoices,
        products: mockProducts,
        currentUserRole: 'ADMIN',
      })

      // Verify that getInvoices and getProducts were NOT called again
      expect(getInvoicesSpy).not.toHaveBeenCalled()
      expect(getProductsSpy).not.toHaveBeenCalled()
      expect(summary.totalSales).toBe(500)
      expect(summary.totalProductsCount).toBe(1)
      expect(summary.activeCustomersCount).toBe(12)
    })
  })

  describe('4. Search Debounce Frequency & Race Condition Guard', () => {
    it('debounces search requests and avoids firing per-keystroke API calls', async () => {
      const getProductsSpy = vi.spyOn(dataService, 'getProducts').mockResolvedValue([])
      vi.spyOn(dataService, 'getCategories').mockResolvedValue(['توريدات كهربائية'])

      render(
        <AuthProvider initialUser={MOCK_USERS.ADMIN}>
          <ProductsView />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(getProductsSpy).toHaveBeenCalledTimes(1)
      })

      const searchInput = screen.getByPlaceholderText(/بحث بالاسم، كود الصنف/i)

      // Fast typing: 4 keystrokes in succession
      await userEvent.type(searchInput, 'كابل')

      // Immediately after typing, the debounced query has not fired yet
      expect(getProductsSpy).toHaveBeenCalledTimes(1)

      // Advance after 300ms debounce
      await waitFor(
        () => {
          expect(getProductsSpy).toHaveBeenCalledTimes(2)
          expect(getProductsSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: 'كابل' }),
            'ADMIN'
          )
        },
        { timeout: 1000 }
      )
    })
  })
})
