import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      startIcon,
      endIcon,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium sm:font-semibold rounded-md transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-[#0F766E] text-white hover:bg-[#115E59] active:bg-[#134E4A] shadow-xs',
      secondary:
        'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 border border-slate-200',
      outline:
        'border border-[#E2E8F0] bg-white text-slate-700 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] hover:text-[#0F766E] active:bg-slate-100',
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200',
      danger:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-xs',
    }

    const sizeStyles = {
      sm: 'text-xs h-8 px-2.5 gap-1.5',
      md: 'text-xs sm:text-sm h-9 px-3.5 gap-2',
      lg: 'text-sm sm:text-base h-10 px-5 gap-2.5',
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!isLoading && startIcon}
        <span>{children}</span>
        {!isLoading && endIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
