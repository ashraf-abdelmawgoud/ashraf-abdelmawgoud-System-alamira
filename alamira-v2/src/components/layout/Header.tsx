import React, { useState } from 'react'
import { Menu, Calendar, User, ArrowLeftRight, LogOut, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/formatters'
import { useAuth } from '@/auth'
import { AppLogo } from '@/components/ui'

export interface HeaderProps {
  onOpenMobileMenu: () => void
  currentTitle?: string
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  currentTitle = 'لوحة التحكم',
}) => {
  const todayFormatted = formatDate(new Date(), false)
  const { currentUser, toggleRole, isMock, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-[#D9E2EC] bg-white px-2.5 sm:px-6 shrink-0 shadow-xs flex-nowrap">
      {/* Right side: Mobile Menu Button, Brand Identity & Page Title */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-nowrap flex-1 sm:flex-initial">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex lg:hidden items-center justify-center rounded-lg p-2 sm:p-1.5 text-[#11243A] hover:text-[#11243A] hover:bg-slate-100 transition-colors shrink-0 cursor-pointer min-h-[36px] min-w-[36px]"
          aria-label="فتح القائمة الرئيسية"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo with Clean Separator */}
        <div className="flex lg:hidden items-center pl-1.5 sm:pl-3 border-l border-slate-200 shrink-0">
          <AppLogo
            size="xs"
            className="h-4.5 sm:h-5 w-auto max-w-[56px] sm:max-w-[85px] object-contain"
          />
        </div>

        {/* Page Title aligned on same horizontal row */}
        <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-[#11243A] truncate leading-tight">
          {currentTitle}
        </h1>
      </div>

      {/* Left side: Date & User Profile */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0 flex-nowrap">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-2.5 py-1 font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
          <span>{todayFormatted}</span>
        </div>

        {/* Interactive User Profile & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 rounded-md bg-[#F8FAFC] border border-[#D9E2EC] px-1 sm:px-2 py-0.5 sm:py-1">
          <div
            className="flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#11243A] text-white font-bold text-xs border border-slate-300 shrink-0"
            title={`${currentUser.name} (${currentUser.role === 'ADMIN' ? 'مدير النظام' : 'مسؤول مبيعات'})`}
          >
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-[#11243A] leading-tight truncate max-w-[120px]">
              {currentUser.name}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-medium">
                {currentUser.role === 'ADMIN' ? 'مدير النظام' : 'مسؤول مبيعات'}
              </span>
              {currentUser.is_active === false && (
                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1 leading-none">
                  معطل
                </span>
              )}
            </div>
          </div>

          {/* If Mock Mode: Show Role Switcher */}
          {isMock ? (
            <button
              type="button"
              onClick={toggleRole}
              title={
                currentUser.role === 'ADMIN'
                  ? 'تبديل الدور (محاكاة تطوير) إلى: مسؤول المبيعات'
                  : 'تبديل الدور (محاكاة تطوير) إلى: مدير النظام'
              }
              className="flex items-center gap-1 text-[11px] px-1.5 sm:px-2 py-1 rounded bg-slate-100 hover:bg-[#11243A] hover:text-white text-slate-700 border border-slate-200 transition-colors cursor-pointer font-medium min-h-[30px]"
            >
              <ArrowLeftRight className="w-3 h-3 text-[#11243A] hover:text-white" />
              <span className="hidden md:inline">
                {currentUser.role === 'ADMIN' ? 'تبديل لمسؤول مبيعات' : 'تبديل لمدير'}
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1 hidden lg:inline font-semibold">
                محاكاة
              </span>
            </button>
          ) : (
            /* If Real Mode: Show Secure Logout Button */
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="تسجيل الخروج وإنهاء الجلسة"
              className="flex items-center justify-center gap-1 text-[11px] p-1.5 sm:px-2 sm:py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer font-medium disabled:opacity-50 min-h-[30px] min-w-[30px]"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
