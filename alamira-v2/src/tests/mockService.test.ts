import { describe, it, expect, beforeEach } from 'vitest'
import { mockDataService } from '@/services/mockDataService'

describe('Mock Data Architecture & Production Isolation', () => {
  beforeEach(() => {
    mockDataService.resetToDefaults()
  })

  it('rejects duplicate product SKU', async () => {
    await expect(
      mockDataService.createProduct({
        sku: 'ELC-1001', // Already exists in initial products
        name: 'منتج مكرر الكود',
        category: 'كهرباء',
        unit: 'قطعة',
        allows_decimal_quantity: false,
        purchase_price: 100,
        selling_price: 150,
        min_stock_level: 5,
        opening_quantity: 10,
      })
    ).rejects.toThrow(/مسجل مسبقاً/i)
  })

  it('rejects negative selling price or purchase price', async () => {
    await expect(
      mockDataService.createProduct({
        sku: 'NEW-101',
        name: 'منتج بسعر سالب',
        category: 'عام',
        unit: 'قطعة',
        allows_decimal_quantity: false,
        purchase_price: -50,
        selling_price: 100,
        min_stock_level: 5,
      })
    ).rejects.toThrow(/لا يمكن أن يكون سالباً/i)
  })

  it('supports simulated failure state for error handling testing', async () => {
    mockDataService.setSimulateFailure(true)
    await expect(mockDataService.getProducts()).rejects.toThrow(/فشل محاكاة/i)
    mockDataService.setSimulateFailure(false)
    const prods = await mockDataService.getProducts()
    expect(prods.length).toBeGreaterThan(0)
  })

  it('deletes product from in-memory store', async () => {
    const before = await mockDataService.getProducts()
    const target = before[0]
    const deleted = await mockDataService.deleteProduct(target.id)
    expect(deleted).toBe(true)

    const after = await mockDataService.getProducts()
    expect(after.find((p) => p.id === target.id)).toBeUndefined()
  })

  it('guarantees V2 has NO active Supabase production URL or key configured in process.env', () => {
    // Verifying zero leak of production credentials into V2
    expect(import.meta.env.VITE_SUPABASE_URL).toBeUndefined()
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeUndefined()
  })
})
