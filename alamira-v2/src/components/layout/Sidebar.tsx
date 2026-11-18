import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AL_AMIRA_COMPANY } from '@/domain/company'
import { navigationItems } from './navigation'

export interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ className, onNavigate }) => {
  return (
    <aside
      className={cn(
        'flex flex-col h-full w-60 text-white select-none shrink-0 transition-all duration-200 border-l border-slate-800 shadow-sm',
        'bg-[#11243A]',
        className
      )}
    >
      {/* Brand Header with Official V1 Logo */}
      <div className="p-3.5 border-b border-slate-800 bg-[#0A1624] shrink-0">
        <div className="w-full bg-white px-2.5 py-1.5 rounded-md shadow-xs border border-slate-200 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="شعار شركة الأميرة للتوريدات العامة والتجارة"
            className="max-h-9 w-auto object-contain"
          />
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        <div className="px-3 pb-1 text-[10.5px] font-semibold text-slate-400 tracking-wider uppercase">
          القائمة الرئيسية
        </div>
        {navigationItems.map((item) => {
          const Icon = item.icon

          if (item.disabled) {
            return (
              <div
                key={item.name}
                title={item.disabledReason}
                className="flex items-center justify-between h-9 px-3 rounded-md text-[13px] font-medium text-slate-500 cursor-not-allowed bg-slate-900/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[10px] py-0.5 px-2 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                  قريباً
                </span>
              </div>
            )
          }

          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between h-9 px-3 rounded-md text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#0F766E] text-white font-semibold border-r-[3.5px] border-[#D7A44A] shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                )
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10.5px] py-0.5 px-2 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#0A1624] text-xs shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F766E] text-white font-bold text-xs border border-[#D7A44A] shrink-0">
            أ
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {AL_AMIRA_COMPANY.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              منظومة إدارة المخزون والمبيعات V2
            </p>
          </div>
        </div>
        <p className="text-[9.5px] text-slate-400 truncate mt-1" title={AL_AMIRA_COMPANY.address}>
          {AL_AMIRA_COMPANY.address}
        </p>
      </div>
    </aside>
  )
}
