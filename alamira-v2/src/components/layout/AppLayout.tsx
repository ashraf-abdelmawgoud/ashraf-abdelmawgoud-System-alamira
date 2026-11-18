import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileDrawer } from './MobileDrawer'
import { Info } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'لوحة التحكم والمؤشرات',
  '/products': 'إدارة المنتجات والمخزون',
  '/customers': 'دليل العملاء',
  '/suppliers': 'دليل الموردين',
  '/invoices': 'فواتير المبيعات',
  '/inventory': 'حركات أذون المخزن',
  '/reports': 'التقارير المالية والتشغيلية',
  '/settings': 'إعدادات النظام والنسخ الاحتياطي',
}

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const currentTitle = PAGE_TITLES[location.pathname] || 'لوحة التحكم'

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

        {/* Compact, Clean Mock Mode Notice */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-6 py-1 text-xs text-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Info className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <p className="text-[11px] sm:text-xs font-medium truncate">
              نسخة تجريبية — البيانات محلية وغير محفوظة بعد تحديث الصفحة
            </p>
          </div>
          <span className="hidden sm:inline-block text-[10px] text-slate-600 font-semibold bg-white border border-slate-300 px-2 py-0.5 rounded-full shrink-0">
            Mock Mode
          </span>
        </div>

        {/* Scrollable Viewport */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 xl:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
