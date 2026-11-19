import React from 'react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  subtitle?: string
  trend?: {
    value: string
    isPositive?: boolean
    label?: string
  }
  variant?: 'emerald' | 'navy' | 'blue' | 'amber' | 'neutral'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  variant = 'emerald',
  className,
}) => {
  const borderIndicatorColors = {
    emerald: 'bg-[#0F766E]',
    navy: 'bg-[#11243A]',
    blue: 'bg-[#11243A]', // Standardized to brand navy palette
    amber: 'bg-[#D97706]',
    neutral: 'bg-[#64748B]',
  }

  const iconVariantStyles = {
    emerald: 'bg-emerald-50 text-[#0F766E] border border-emerald-200',
    navy: 'bg-slate-100 text-[#11243A] border border-slate-200',
    blue: 'bg-slate-100 text-[#11243A] border border-slate-200', // Standardized to brand navy palette
    amber: 'bg-amber-50 text-[#D97706] border border-amber-200',
    neutral: 'bg-slate-100 text-[#64748B] border border-slate-200',
  }

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between h-full rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all duration-200 select-none overflow-hidden',
        className
      )}
    >
      {/* Signature Right Accent Bar */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full',
          borderIndicatorColors[variant]
        )}
      />

      <div className="flex items-start justify-between gap-3 pr-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#64748B] leading-snug line-clamp-2 min-h-[36px] sm:min-h-[38px] mb-1">
            {title}
          </p>
          <h4 className="text-xl sm:text-[22px] font-extrabold text-[#11243A] tracking-tight break-words tabular-nums">
            {value}
          </h4>
        </div>

        <div
          className={cn(
            'flex h-9.5 w-9.5 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg',
            iconVariantStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-1 text-xs pr-1.5">
          {subtitle && (
            <span className="text-[11px] sm:text-xs text-[#64748B] truncate font-medium">
              {subtitle}
            </span>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-[11px] font-semibold shrink-0">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5',
                  trend.isPositive
                    ? 'text-[#0F766E] bg-emerald-50 border border-emerald-200'
                    : 'text-[#DC2626] bg-red-50 border border-red-200'
                )}
              >
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-slate-400 font-normal">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
