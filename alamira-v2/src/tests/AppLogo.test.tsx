import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppLogo } from '@/components/ui'

describe('AppLogo Component & Brand Asset Verification', () => {
  it('1. Renders default logo with official image source and accessibility alt text', () => {
    render(<AppLogo />)
    const img = screen.getByRole('img', { name: /شركة الأميرة للتوريدات العامة والتجارة/i })

    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/logo.png')
    expect(img).toHaveClass('object-contain')
    // Check layout shift prevention dimensions
    expect(img).toHaveAttribute('width', '152')
    expect(img).toHaveAttribute('height', '36')
  })

  it('2. Correctly applies size variants (xs, sm, md, lg, xl)', () => {
    const { rerender } = render(<AppLogo size="xs" />)
    let img = screen.getByRole('img')
    expect(img).toHaveAttribute('width', '85')
    expect(img).toHaveAttribute('height', '20')

    rerender(<AppLogo size="lg" />)
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('width', '202')
    expect(img).toHaveAttribute('height', '48')

    rerender(<AppLogo size="xl" />)
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('width', '270')
    expect(img).toHaveAttribute('height', '64')
  })

  it('3. Supports transparent and full image variants', () => {
    const { rerender } = render(<AppLogo variant="transparent" />)
    let img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/logo-transparent.png')

    rerender(<AppLogo variant="full" />)
    img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/logo-full.png')
  })

  it('4. Renders within a protective badge container when withBadge is true', () => {
    const { container } = render(<AppLogo withBadge badgeClassName="custom-badge-class" />)
    const badge = container.querySelector('.custom-badge-class')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-white')
    expect(badge).toContainElement(screen.getByRole('img'))
  })
})
