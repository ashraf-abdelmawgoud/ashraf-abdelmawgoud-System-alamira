import { formatNumber } from '@/lib/formatters'

/**
 * Authoritative list of predefined Arabic measurement units for Al-Amira General Supplies & Trading.
 */
export const PREDEFINED_UNITS: readonly string[] = [
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
  'عود',
  'كيلو',
] as const

const STORAGE_KEY = 'alamira_custom_measurement_units'

/**
 * Retrieves custom measurement units saved in persistent local storage.
 */
export function getCustomUnits(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u) => u.length > 0)
    }
    return []
  } catch (err) {
    console.warn('[UnitsService] Failed to parse custom units from localStorage:', err)
    return []
  }
}

/**
 * Returns all available units (predefined + custom), deduplicated and trimmed.
 */
export function getAllUnits(): string[] {
  const custom = getCustomUnits()
  const combined = [...PREDEFINED_UNITS, ...custom]

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const result: string[] = []

  for (const unit of combined) {
    const trimmed = unit.trim()
    const normalized = trimmed.toLowerCase()
    if (trimmed && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(trimmed)
    }
  }

  return result
}

export interface AddCustomUnitResult {
  success: boolean
  error?: string
  units: string[]
  unit?: string
}

/**
 * Validates, saves, and persists a new custom measurement unit.
 * Accessible to ADMIN users.
 */
export function addCustomUnit(rawUnit: string): AddCustomUnitResult {
  const trimmed = (rawUnit || '').trim()

  if (!trimmed) {
    return {
      success: false,
      error: 'يرجى كتابة اسم وحدة القياس',
      units: getAllUnits(),
    }
  }

  if (trimmed.length > 30) {
    return {
      success: false,
      error: 'اسم وحدة القياس لا يجب أن يتجاوز 30 حرفاً',
      units: getAllUnits(),
    }
  }

  const currentAll = getAllUnits()
  const normalizedTarget = trimmed.toLowerCase()

  const isDuplicate = currentAll.some((u) => u.toLowerCase() === normalizedTarget)
  if (isDuplicate) {
    return {
      success: false,
      error: 'وحدة القياس موجودة بالفعل في القائمة',
      units: currentAll,
    }
  }

  const currentCustom = getCustomUnits()
  const updatedCustom = [...currentCustom, trimmed]

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom))
      // Dispatch event to inform other listening views
      window.dispatchEvent(new CustomEvent('alamira-units-updated', { detail: { newUnit: trimmed } }))
    } catch (err) {
      console.error('[UnitsService] Failed to save custom unit to localStorage:', err)
      return {
        success: false,
        error: 'تعذر حفظ وحدة القياس في التخزين المحلي',
        units: currentAll,
      }
    }
  }

  return {
    success: true,
    units: getAllUnits(),
    unit: trimmed,
  }
}

/**
 * Removes a custom unit from persistent storage (admin utility).
 */
export function removeCustomUnit(unitToRemove: string): string[] {
  const trimmed = unitToRemove.trim().toLowerCase()
  const current = getCustomUnits()
  const updated = current.filter((u) => u.toLowerCase() !== trimmed)

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('alamira-units-updated'))
    } catch (err) {
      console.warn('[UnitsService] Failed to remove custom unit:', err)
    }
  }

  return getAllUnits()
}

/**
 * Formats a quantity with its measurement unit (e.g. "5 متر" or "12 قطعة").
 */
export function formatQuantityWithUnit(
  quantity: number | string | null | undefined,
  unit?: string | null
): string {
  const num = typeof quantity === 'number' ? quantity : parseFloat(String(quantity || 0)) || 0
  const unitLabel = (unit || 'وحدة').trim()
  return `${formatNumber(num)} ${unitLabel}`
}
