import { describe, it, expect } from 'vitest'
import { navigationItems } from '@/components/layout/navigation'

describe('Navigation Structure & Safety Constraints', () => {
  it('includes all primary core ERP modules', () => {
    const itemNames = navigationItems.map((item) => item.name)
    expect(itemNames).toContain('لوحة التحكم')
    expect(itemNames).toContain('المنتجات والمخزون')
    expect(itemNames).toContain('العملاء')
    expect(itemNames).toContain('الموردين')
    expect(itemNames).toContain('فواتير المبيعات')
    expect(itemNames).toContain('مردودات المبيعات')
    expect(itemNames).toContain('حركات المخزن')
    expect(itemNames).toContain('التقارير والمؤشرات')
    expect(itemNames).toContain('الإعدادات')
  })

  it('guarantees Sales Returns is strictly disabled as an informational placeholder', () => {
    const salesReturnsItem = navigationItems.find((item) => item.name === 'مردودات المبيعات')
    expect(salesReturnsItem).toBeDefined()
    expect(salesReturnsItem?.disabled).toBe(true)
    expect(salesReturnsItem?.disabledReason).toBeTruthy()
  })
})
