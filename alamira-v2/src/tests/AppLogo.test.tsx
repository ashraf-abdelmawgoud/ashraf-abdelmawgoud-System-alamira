import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppLogo } from '@/components/ui'

describe('AppLogo Component & Brand Asset Verification', () => {
  it('1. Renders default logo with official image source and accessibility alt text', () => {
    render(<AppLogo />)
    const img = screen.getByRole('img', { name: /شركة الأميرة للتوريدات والتجارة العامة/i })

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

  it('5. Verifies official company assets and PWA icons exist in public directory', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const publicDir = path.resolve(__dirname, '../../public')

    const requiredAssets = [
      'logo.png',
      'logo-full.png',
      'logo-transparent.png',
      'favicon.ico',
      'favicon-32x32.png',
      'favicon-16x16.png',
      'apple-touch-icon.png',
      'pwa-192x192.png',
      'pwa-512x512.png',
      'manifest.webmanifest',
      'manifest.json',
      'favicon.svg',
    ]

    for (const asset of requiredAssets) {
      expect(fs.existsSync(path.join(publicDir, asset)), `Missing asset: ${asset}`).toBe(true)
    }

    // Verify manifest contents
    const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf-8'))
    expect(manifest.name).toBe('الأميرة للتوريدات والتجارة العامة')
    expect(manifest.short_name).toBe('الأميرة')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4)
  })
})
