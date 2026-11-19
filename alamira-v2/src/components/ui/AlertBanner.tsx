import React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertBannerProps {
  type?: 'success' | 'warning' | 'error' | 'info'
  message: string
  onClose?: () => void
  className?: string
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  message,
  onClose,
  className,
}) => {
  if (!message) return null

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-slate-100 border-slate-200 text-[#11243A]',
  }

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-[#0F766E] shrink-0" />,
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-lg border text-xs sm:text-sm transition-all',
        styles[type],
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icons[type]}
        <p className="font-medium truncate">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 text-current shrink-0"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
