import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileDrawer } from './MobileDrawer'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth'
import { LoginModal } from '@/features/auth/LoginModal'

const PAGE_TITLES: Record<string, string> = {
  '/': 'لوحة التحكم والمؤشرات',
  '/products': 'إدارة المنتجات والمخزون',
  '/customers': 'دليل العملاء',
  '/suppliers': 'دليل الموردين',
  '/invoices': 'إدارة فواتير المبيعات',
  '/inventory': 'حركات أذون المخزن',
  '/reports': 'التقارير العامة والمؤشرات',
  '/settings': 'إعدادات النظام والنسخ الاحتياطي',
  '/audit-log': 'سجل النشاط والرقابة',
}

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { currentUser, isMock, isAuthenticated, isLoadingAuth } = useAuth()

  const currentTitle = PAGE_TITLES[location.pathname] || 'لوحة التحكم'

  // If in real Supabase mode and loading session:
  if (!isMock && isLoadingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F7FA] font-cairo" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-slate-700">
          <Loader2 className="w-8 h-8 text-[#11243A] animate-spin" />
          <p className="text-sm font-bold">جارٍ التحقق من جلسة المستخدم وقاعدة البيانات...</p>
        </div>
      </div>
    )
  }

  // If in real Supabase mode and unauthenticated:
  if (!isMock && !isAuthenticated) {
    return <LoginModal />
  }

  return (
    <div className="flex h-screen w-full bg-[#F5F7FA] overflow-hidden text-[#11243A] font-cairo" dir="rtl">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto min-w-0 bg-[#F5F7FA]">
        <Header
          currentTitle={currentTitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Inactive Account Alert Banner */}
        {currentUser.is_active === false && (
          <div className="bg-rose-50 border-b border-rose-200 px-3 sm:px-6 py-2 text-xs text-rose-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold text-rose-900">حساب المستخدم الحالي معطل:</span>
              <span className="truncate">جميع العمليات مقيدة ولا يمكن حفظ أو تعديل أو اعتماد أي بيانات.</span>
            </div>
            <span className="text-[10px] font-bold bg-rose-200/70 text-rose-800 px-2 py-0.5 rounded-full shrink-0">
              حساب معطل
            </span>
          </div>
        )}

        {/* Scrollable Viewport */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 xl:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
