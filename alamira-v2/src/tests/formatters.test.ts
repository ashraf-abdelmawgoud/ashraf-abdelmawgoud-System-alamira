import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getQenaDateString,
  getCairoDateString,
} from '@/lib/formatters'

describe('Formatters Utility', () => {
  describe('formatCurrency', () => {
    it('formats a regular amount with EGP currency suffix', () => {
      const result = formatCurrency(1500)
      expect(result).toContain('ج.م')
    })

    it('handles zero correctly with currency suffix', () => {
      const result = formatCurrency(0)
      expect(result).toContain('ج.م')
    })

    it('handles NaN or invalid inputs safely without throwing', () => {
      expect(formatCurrency(NaN)).toBe('0 ج.م')
      // @ts-expect-error testing invalid input
      expect(formatCurrency(null)).toBe('0 ج.م')
      // @ts-expect-error testing invalid input
      expect(formatCurrency(undefined)).toBe('0 ج.م')
    })

    it('respects showCurrency=false option', () => {
      const result = formatCurrency(2500, { showCurrency: false })
      expect(result).not.toContain('ج.م')
    })
  })

  describe('formatNumber', () => {
    it('formats numbers into Arabic locale representation', () => {
      const result = formatNumber(1000)
      expect(result).toBeTruthy()
    })

    it('safely handles zero and invalid input', () => {
      const zeroFormatted = formatNumber(0)
      expect(['0', '٠']).toContain(zeroFormatted)
      // @ts-expect-error testing invalid input
      expect(formatNumber(null)).toBe('0')
    })
  })

  describe('formatDate', () => {
    it('formats valid date strings without crashing', () => {
      const result = formatDate('2026-11-17T12:00:00Z')
      expect(result).not.toBe('-')
    })

    it('returns dash for invalid or empty dates', () => {
      expect(formatDate('')).toBe('-')
      expect(formatDate('invalid-date')).toBe('-')
    })
  })

  describe('getQenaDateString and getCairoDateString', () => {
    it('returns YYYY-MM-DD formatted date in Egypt timezone', () => {
      const fixedDate = new Date('2026-11-20T23:30:00Z')
      const result = getQenaDateString(fixedDate)
      // 23:30 UTC is next day 01:30 in Egypt (UTC+2)
      expect(result).toBe('2026-11-21')
      expect(getCairoDateString(fixedDate)).toBe('2026-11-21')
    })
  })
})
