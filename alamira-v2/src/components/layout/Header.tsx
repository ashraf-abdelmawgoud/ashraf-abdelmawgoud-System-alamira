import React from 'react'
import { Menu, Calendar, User, Database } from 'lucide-react'
import { formatDate } from '@/lib/formatters'

export interface HeaderProps {
  onOpenMobileMenu: () => void
  currentTitle?: string
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  currentTitle = 'لوحة التحكم',
}) => {
  const todayFormatted = formatDate(new Date(), false)

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-3 sm:px-6 shrink-0 shadow-xs">
      {/* Right side: Mobile Menu Button & Clean Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="inline-flex lg:hidden items-center justify-center rounded-md p-1.5 text-[#0F766E] hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          aria-label="فتح القائمة الرئيسية"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-sm sm:text-base font-bold text-[#11243A] truncate flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0F766E] inline-block shrink-0" />
          <span>{currentTitle}</span>
        </h2>
      </div>

      {/* Left side: Date, Small Demo Pill & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Compact Demo Indicator */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
          <Database className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>بيانات تجريبية</span>
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#64748B] bg-slate-50 border border-[#E2E8F0] rounded-md px-2.5 py-1 font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>{todayFormatted}</span>
        </div>

        {/* Minimal User Profile Avatar */}
        <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-[#E2E8F0] px-2 py-1">
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#11243A] text-white font-bold text-xs border border-slate-300 shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-[#11243A]">
            مدير النظام
          </span>
        </div>
      </div>
    </header>
  )
}
