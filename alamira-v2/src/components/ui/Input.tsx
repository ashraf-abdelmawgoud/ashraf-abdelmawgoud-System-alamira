import React, { useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      startIcon,
      endIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId

    return (
      <div className="w-full space-y-1 text-right">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#11243A]"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-xs">
          {startIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {startIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'block w-full rounded-md border border-[#CBD5E1] bg-white py-1.5 px-3 text-xs sm:text-sm text-[#11243A] placeholder:text-slate-400',
              'focus:border-[#0F766E] focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]/20 transition-all',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              startIcon && 'pr-9',
              endIcon && 'pl-9',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {endIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        {!error && helperText && (
          <p className="text-[11px] text-[#64766f]">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
