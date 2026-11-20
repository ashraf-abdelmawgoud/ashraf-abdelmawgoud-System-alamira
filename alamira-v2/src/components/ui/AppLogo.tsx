import React from 'react'
import { cn } from '@/lib/utils'

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom'
export type LogoVariant = 'default' | 'transparent' | 'full'

export interface AppLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: LogoSize
  variant?: LogoVariant
  withBadge?: boolean
  badgeClassName?: string
}

const sizeClasses: Record<Exclude<LogoSize, 'custom'>, { img: string; width: number; height: number }> = {
  xs: { img: 'h-5 w-auto max-w-[90px]', width: 85, height: 20 },
  sm: { img: 'h-7 w-auto max-w-[125px]', width: 118, height: 28 },
  md: { img: 'h-9 w-auto max-w-[160px]', width: 152, height: 36 },
  lg: { img: 'h-12 w-auto max-w-[210px]', width: 202, height: 48 },
  xl: { img: 'h-16 w-auto max-w-[280px]', width: 270, height: 64 },
}

/**
 * Official AppLogo Component for Al-Amira General Supplies & Trading (شركة الأميرة للتوريدات والتجارة العامة)
 * 
 * Guarantees:
 * - Aspect ratio preservation (no stretch or squashing).
 * - Automatic size variants (xs, sm, md, lg, xl, custom).
 * - Layout shift prevention with explicit aspect and dimension hints.
 * - Meaningful Arabic/English accessibility alt text.
 * - Optional container badge wrapper for dark headers or clean floating presentation.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  variant = 'default',
  withBadge = false,
  badgeClassName,
  className,
  alt = 'شعار شركة الأميرة للتوريدات والتجارة العامة — Al-Amira',
  loading = 'eager',
  decoding = 'async',
  ...props
}) => {
  const src =
    variant === 'full'
      ? '/logo-full.png'
      : variant === 'transparent'
      ? '/logo-transparent.png'
      : '/logo.png'

  const sizeConfig = size !== 'custom' ? sizeClasses[size] : null
  const imgClass = cn(
    'object-contain select-none',
    sizeConfig?.img,
    className
  )

  const imgElement = (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      width={sizeConfig ? sizeConfig.width : undefined}
      height={sizeConfig ? sizeConfig.height : undefined}
      className={imgClass}
      {...props}
    />
  )

  if (withBadge) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs select-none',
          badgeClassName
        )}
      >
        {imgElement}
      </div>
    )
  }

  return imgElement
}
