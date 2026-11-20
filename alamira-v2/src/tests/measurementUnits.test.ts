import { describe, it, expect, beforeEach } from 'vitest'
import {
  PREDEFINED_UNITS,
  getAllUnits,
  getCustomUnits,
  addCustomUnit,
  removeCustomUnit,
  formatQuantityWithUnit,
} from '@/services/measurementUnitsService'

describe('Measurement Units & Custom Units Service (Task 3)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('includes all authoritative predefined Arabic measurement units', () => {
    const requiredUnits = [
      'قطعة',
      'متر',
      'متر مربع',
      'متر مكعب',
      'سنتيمتر',
      'كيلو جرام',
      'جرام',
      'طن',
      'لتر',
      'ملليلتر',
      'عبوة',
      'علبة',
      'كرتونة',
      'صندوق',
      'باكت',
      'رول',
      'لفة',
      'كيس',
      'زجاجة',
      'دستة',
      'طقم',
      'زوج',
      'وحدة',
    ]

    for (const unit of requiredUnits) {
      expect(PREDEFINED_UNITS).toContain(unit)
    }
  })

  it('returns all predefined units when no custom units are stored', () => {
    const units = getAllUnits()
    expect(units.length).toBeGreaterThanOrEqual(23)
    expect(units).toContain('قطعة')
    expect(units).toContain('متر')
    expect(units).toContain('كرتونة')
  })

  it('adds a valid custom unit and persists it to localStorage', () => {
    const res = addCustomUnit('شيكارة')
    expect(res.success).toBe(true)
    expect(res.unit).toBe('شيكارة')
    expect(res.units).toContain('شيكارة')

    // Verify localStorage persistence
    const custom = getCustomUnits()
    expect(custom).toContain('شيكارة')

    const all = getAllUnits()
    expect(all).toContain('شيكارة')
  })

  it('prevents adding empty or whitespace-only custom units', () => {
    const resEmpty = addCustomUnit('')
    expect(resEmpty.success).toBe(false)
    expect(resEmpty.error).toBe('يرجى كتابة اسم وحدة القياس')

    const resSpaces = addCustomUnit('   ')
    expect(resSpaces.success).toBe(false)
    expect(resSpaces.error).toBe('يرجى كتابة اسم وحدة القياس')
  })

  it('prevents duplicate measurement units (predefined and custom)', () => {
    // Attempt duplicate of predefined unit
    const dupPredefined = addCustomUnit('متر')
    expect(dupPredefined.success).toBe(false)
    expect(dupPredefined.error).toContain('موجودة بالفعل')

    // Add new custom unit
    const res1 = addCustomUnit('درزن')
    expect(res1.success).toBe(true)

    // Attempt duplicate of custom unit
    const dupCustom = addCustomUnit('درزن')
    expect(dupCustom.success).toBe(false)
    expect(dupCustom.error).toContain('موجودة بالفعل')

    // Attempt duplicate with leading/trailing spaces
    const dupSpaced = addCustomUnit('  درزن  ')
    expect(dupSpaced.success).toBe(false)
    expect(dupSpaced.error).toContain('موجودة بالفعل')
  })

  it('safely removes custom units and updates storage', () => {
    addCustomUnit('برميل')
    expect(getAllUnits()).toContain('برميل')

    const updated = removeCustomUnit('برميل')
    expect(updated).not.toContain('برميل')
    expect(getCustomUnits()).not.toContain('برميل')
  })

  it('formats quantity with measurement unit accurately', () => {
    expect(formatQuantityWithUnit(5, 'متر')).toBe('5 متر')
    expect(formatQuantityWithUnit(12, 'قطعة')).toBe('12 قطعة')
    expect(formatQuantityWithUnit(2.5, 'كيلو جرام')).toBe('2.5 كيلو جرام')
    expect(formatQuantityWithUnit(0, 'كرتونة')).toBe('0 كرتونة')
    expect(formatQuantityWithUnit(10, null)).toBe('10 وحدة')
  })
})
