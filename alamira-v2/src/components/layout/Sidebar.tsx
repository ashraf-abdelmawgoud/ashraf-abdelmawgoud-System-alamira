import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getNavigationItemsForUser } from './navigation'
import { useAuth } from '@/auth'
import { AppLogo } from '@/components/ui'

export interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ className, onNavigate }) => {
  const { currentUser } = useAuth()
  const visibleItems = getNavigationItemsForUser(currentUser)
  return (
    <aside
      className={cn(
        'flex flex-col h-full w-60 text-white select-none shrink-0 transition-all duration-200 border-l border-slate-800 shadow-sm',
        'bg-[#11243A]',
        className
      )}
    >
      {/* Brand Header with Official Logo */}
      <div className="p-3.5 border-b border-slate-800 bg-[#0A1624] shrink-0 text-center">
        <div className="w-full bg-white px-3 py-2 rounded-lg shadow-xs border border-slate-200 flex items-center justify-center">
          <AppLogo
            size="md"
            className="h-8 w-auto"
            alt="شعار شركة الأميرة للتوريدات العامة والتجارة — Al-Amira"
          />
        </div>
        <div className="mt-2 text-[11px] font-bold text-slate-300 tracking-wide truncate">
          الأميرة للتوريدات العامة والتجارة
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        <div className="px-3 pb-1 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
          القائمة الرئيسية
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon

          if (item.disabled) {
            return (
              <div
                key={item.name}
                title={item.disabledReason}
                className="flex items-center justify-between h-9 px-3 rounded-md text-[13.5px] font-semibold text-slate-500 cursor-not-allowed bg-slate-900/30"
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
                  'group flex items-center justify-between h-9 px-3 rounded-md text-[13.5px] font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#1E3A5F] text-white font-extrabold border-r-[3.5px] border-[#D7A44A] shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isActive ? 'text-[#D7A44A]' : 'text-slate-400 group-hover:text-white'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[11px] py-0.5 px-2 rounded-full font-extrabold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

