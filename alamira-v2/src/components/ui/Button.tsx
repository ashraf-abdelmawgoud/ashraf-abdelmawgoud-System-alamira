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
      'inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#11243A] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-[#11243A] text-white hover:bg-[#1E3A5F] active:bg-[#0A1624] shadow-xs',
      secondary:
        'bg-[#F8FAFC] text-[#11243A] hover:bg-slate-100 active:bg-slate-200 border border-[#CBD5E1]',
      outline:
        'border border-[#CBD5E1] bg-white text-[#11243A] hover:bg-[#F8FAFC] hover:border-[#94A3B8] hover:text-[#11243A] active:bg-slate-100',
      ghost:
        'text-slate-600 hover:text-[#11243A] hover:bg-slate-100 active:bg-slate-200',
      danger:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-xs',
    }

    const sizeStyles = {
      sm: 'text-xs h-8 px-3 gap-1.5',
      md: 'text-[13px] h-9 px-4 gap-2',
      lg: 'text-sm sm:text-[15px] h-10 px-5 gap-2.5',
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
