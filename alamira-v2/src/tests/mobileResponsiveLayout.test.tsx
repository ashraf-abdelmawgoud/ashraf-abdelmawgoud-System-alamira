import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { MobileDrawer } from '@/components/layout/MobileDrawer'

// Mock useAuth to provide mock user in mock mode
vi.mock('@/auth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'usr-admin-1',
      name: 'المدير العام',
      username: 'admin',
      role: 'ADMIN',
      title: 'مدير النظام',
      is_active: true,
    },
    isMock: true,
    isAuthenticated: true,
    isLoadingAuth: false,
    logout: vi.fn(),
    toggleRole: vi.fn(),
  }),
}))

describe('Al-Amira ERP V2 — Mobile Responsive Layout & Breakpoints Verification', () => {
  const originalInnerWidth = window.innerWidth

  const setViewportWidth = (width: number) => {
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      })
      window.dispatchEvent(new Event('resize'))
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    setViewportWidth(originalInnerWidth)
  })

  describe('Breakpoint Verifications (360px, 390px, 430px)', () => {
    const mobileWidths = [
      { name: 'Small Android / Galaxy S', width: 360 },
      { name: 'Standard iPhone 13/14 / Pixel', width: 390 },
      { name: 'Large Flagship / iPhone Pro Max', width: 430 },
    ]

    mobileWidths.forEach(({ name, width }) => {
      it(`enforces correct responsive classes and hides desktop sidebar at ${width}px (${name})`, () => {
        setViewportWidth(width)

        const { container } = render(
          <MemoryRouter initialEntries={['/']}>
            <AppLayout />
          </MemoryRouter>
        )

        // 1. Desktop sidebar container must have hidden lg:flex classes
        const desktopSidebarWrapper = container.querySelector('.hidden.lg\\:flex')
        expect(desktopSidebarWrapper).toBeInTheDocument()
        expect(desktopSidebarWrapper).toHaveClass('hidden')
        expect(desktopSidebarWrapper).toHaveClass('lg:flex')

        // 2. Mobile drawer is not rendered when closed
        const closeBtn = screen.queryByRole('button', { name: /إغلاق القائمة/i })
        expect(closeBtn).not.toBeInTheDocument()

        // 3. Mobile menu button is present and accessible
        const hamburgerBtn = screen.getByRole('button', { name: /فتح القائمة الرئيسية/i })
        expect(hamburgerBtn).toBeInTheDocument()
        expect(hamburgerBtn).toHaveClass('lg:hidden')
      })

      it(`opens and closes mobile drawer interactively at ${width}px (${name})`, async () => {
        setViewportWidth(width)

        render(
          <MemoryRouter initialEntries={['/']}>
            <AppLayout />
          </MemoryRouter>
        )

        // Initial: Mobile drawer closed
        expect(screen.queryByRole('button', { name: /إغلاق القائمة/i })).not.toBeInTheDocument()

        // Click hamburger button to open drawer
        const hamburgerBtn = screen.getByRole('button', { name: /فتح القائمة الرئيسية/i })
        fireEvent.click(hamburgerBtn)

        // Drawer is open: close button is visible
        const closeBtn = screen.getByRole('button', { name: /إغلاق القائمة/i })
        expect(closeBtn).toBeInTheDocument()

        // Navigation items are rendered inside drawer
        expect(screen.getAllByText('لوحة التحكم').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('المنتجات والمخزون').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('فواتير المبيعات').length).toBeGreaterThanOrEqual(1)

        // Click close button
        fireEvent.click(closeBtn)

        // Drawer is dismissed
        expect(screen.queryByRole('button', { name: /إغلاق القائمة/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Header Component Mobile Rendering', () => {
    it('renders official brand logo, title, and actions on mobile viewports', () => {
      setViewportWidth(390)

      render(
        <Header
          currentTitle="إدارة فواتير المبيعات"
          onOpenMobileMenu={vi.fn()}
        />
      )

      // Mobile brand logo container must have lg:hidden
      const logoImg = screen.getByAltText(/شعار شركة الأميرة للتوريدات والتجارة العامة/i)
      expect(logoImg).toBeInTheDocument()

      // Page title displayed
      expect(screen.getByText('إدارة فواتير المبيعات')).toBeInTheDocument()

      // Hamburger button present
      expect(screen.getByRole('button', { name: /فتح القائمة الرئيسية/i })).toBeInTheDocument()
    })
  })

  describe('MobileDrawer Keyboard Dismissal', () => {
    it('closes on Escape key press', () => {
      const handleClose = vi.fn()
      render(
        <MemoryRouter>
          <MobileDrawer isOpen={true} onClose={handleClose} />
        </MemoryRouter>
      )

      expect(screen.getByRole('button', { name: /إغلاق القائمة/i })).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })
})
