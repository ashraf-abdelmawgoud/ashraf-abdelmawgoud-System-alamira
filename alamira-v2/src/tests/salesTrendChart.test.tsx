import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  aggregateDailyTrend,
  aggregateDailyHourlyTrends,
  aggregateWeeklyTrends,
  aggregateMonthlyTrends,
  getEffectiveReferenceDate,
  getCairoDateParts,
  getInvoiceCairoDateKey,
  formatDateKey,
} from '@/domain/salesTrendAggregations'
import { SalesTrendChart } from '@/features/dashboard/SalesTrendChart'
import { SalesInvoice, DailySalesTrend } from '@/types'

const MOCK_TEST_INVOICES: SalesInvoice[] = [
  // 1. Sale at 00:05 Cairo time (Early morning / midnight boundary)
  {
    id: 'inv-midnight-0005',
    invoice_number: 'INV-2026-0001',
    invoice_date: '2026-11-17',
    customer_id: 'cust-1',
    customer_name_snapshot: 'شركة النور',
    gross_amount: 5000,
    item_discounts_amount: 0,
    subtotal: 5000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 5000,
    status: 'approved',
    // 22:05 UTC on Nov 16 = 00:05 on Nov 17 in Cairo (UTC+2)
    created_at: '2026-11-16T22:05:00Z',
  },
  // 2. Sale at 03:00 Cairo time (Outside old working hours)
  {
    id: 'inv-early-0300',
    invoice_number: 'INV-2026-0002',
    invoice_date: '2026-11-17',
    customer_id: 'cust-2',
    customer_name_snapshot: 'المقاولون المتحدون',
    gross_amount: 7000,
    item_discounts_amount: 0,
    subtotal: 7000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 7000,
    status: 'approved',
    // 01:00 UTC = 03:00 Cairo time
    created_at: '2026-11-17T01:00:00Z',
  },
  // 3. Draft invoice at 04:00 (Must be strictly excluded)
  {
    id: 'inv-draft-0400',
    invoice_number: 'INV-2026-0003',
    invoice_date: '2026-11-17',
    customer_id: 'cust-3',
    customer_name_snapshot: 'مسودة فجرية',
    gross_amount: 9000,
    item_discounts_amount: 0,
    subtotal: 9000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 9000,
    status: 'draft',
    created_at: '2026-11-17T02:00:00Z',
  },
  // 4. Sale at 13:00 Cairo time (Midday standard)
  {
    id: 'inv-midday-1300',
    invoice_number: 'INV-2026-0004',
    invoice_date: '2026-11-17',
    customer_id: 'cust-4',
    customer_name_snapshot: 'مؤسسة الأمل',
    gross_amount: 10000,
    item_discounts_amount: 0,
    subtotal: 10000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 10000,
    status: 'approved',
    // 11:00 UTC = 13:00 Cairo time
    created_at: '2026-11-17T11:00:00Z',
  },
  // 5. Sale at 23:55 Cairo time (Late night / midnight boundary)
  {
    id: 'inv-night-2355',
    invoice_number: 'INV-2026-0005',
    invoice_date: '2026-11-17',
    customer_id: 'cust-5',
    customer_name_snapshot: 'تجهيزات ليلية',
    gross_amount: 12000,
    item_discounts_amount: 0,
    subtotal: 12000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 12000,
    status: 'approved',
    // 21:55 UTC = 23:55 Cairo time
    created_at: '2026-11-17T21:55:00Z',
  },
  // 6. Date-only approved invoice without timestamp
  {
    id: 'inv-date-only',
    invoice_number: 'INV-2026-0006',
    invoice_date: '2026-11-17',
    customer_id: 'cust-6',
    customer_name_snapshot: 'فاتورة يدون ختم زمني',
    gross_amount: 3000,
    item_discounts_amount: 0,
    subtotal: 3000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 3000,
    status: 'approved',
    created_at: undefined, // Honest date-only
  },
  // 7. Cancelled invoice at 23:58 (Must be strictly excluded)
  {
    id: 'inv-cancelled-2358',
    invoice_number: 'INV-2026-0007',
    invoice_date: '2026-11-17',
    customer_id: 'cust-7',
    customer_name_snapshot: 'ملغاة ليلية',
    gross_amount: 15000,
    item_discounts_amount: 0,
    subtotal: 15000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 15000,
    status: 'cancelled',
    created_at: '2026-11-17T21:58:00Z',
  },
  // 8. Approved sale on previous day (Nov 16, 16:00 Cairo)
  {
    id: 'inv-prev-day-16',
    invoice_number: 'INV-2026-0008',
    invoice_date: '2026-11-16',
    customer_id: 'cust-8',
    customer_name_snapshot: 'مبيعات الأمس',
    gross_amount: 25000,
    item_discounts_amount: 0,
    subtotal: 25000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 25000,
    status: 'approved',
    created_at: '2026-11-16T14:00:00Z', // 16:00 Cairo
  },
  // 9. Approved sale in previous month (October 2026)
  {
    id: 'inv-prev-month-oct',
    invoice_number: 'INV-2026-0009',
    invoice_date: '2026-10-20',
    customer_id: 'cust-9',
    customer_name_snapshot: 'مبيعات أكتوبر',
    gross_amount: 40000,
    item_discounts_amount: 0,
    subtotal: 40000,
    invoice_discount_type: 'none',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 40000,
    status: 'approved',
    created_at: '2026-10-20T08:00:00Z',
  },
]

const MOCK_FALLBACK_TRENDS: DailySalesTrend[] = [
  { day: 'الأربعاء', date: '11-11', totalSales: 18200, invoicesCount: 3 },
  { day: 'الخميس', date: '11-12', totalSales: 24500, invoicesCount: 5 },
  { day: 'الجمعة', date: '11-13', totalSales: 0, invoicesCount: 0 },
  { day: 'السبت', date: '11-14', totalSales: 31000, invoicesCount: 6 },
  { day: 'الأحد', date: '11-15', totalSales: 16800, invoicesCount: 3 },
  { day: 'الإثنين', date: '11-16', totalSales: 28400, invoicesCount: 4 },
  { day: 'اليوم (الثلاثاء)', date: '11-17', totalSales: 21450, invoicesCount: 2 },
]

describe('1. Full-Day & Timezone Sales Trend Domain Aggregations', () => {
  describe('getCairoDateParts and Timezone / DST Handling', () => {
    it('converts UTC timestamps across midnight boundary into correct Egypt calendar day', () => {
      // 2026-11-16 22:05 UTC in Egypt (UTC+2) is 2026-11-17 00:05
      const parts = getCairoDateParts('2026-11-16T22:05:00Z')
      expect(parts.dateKey).toBe('2026-11-17')
      expect(parts.hour).toBe(0)
      expect(parts.minute).toBe(5)
    })

    it('converts late night timestamps into 23:55 in Egypt local time', () => {
      // 2026-11-17 21:55 UTC in Egypt (UTC+2) is 2026-11-17 23:55
      const parts = getCairoDateParts('2026-11-17T21:55:00Z')
      expect(parts.dateKey).toBe('2026-11-17')
      expect(parts.hour).toBe(23)
      expect(parts.minute).toBe(55)
    })

    it('handles Egypt Daylight Saving Time (DST, UTC+3) in summer correctly', () => {
      // In summer (June), Egypt is UTC+3. 21:05 UTC on June 14 = 00:05 on June 15 in Cairo
      const parts = getCairoDateParts('2026-06-14T21:05:00Z')
      expect(parts.dateKey).toBe('2026-06-15')
      expect(parts.hour).toBe(0)
      expect(parts.minute).toBe(5)
    })
  })

  describe('getInvoiceCairoDateKey', () => {
    it('identifies exact Cairo date and hour for timestamped invoices', () => {
      const inv = MOCK_TEST_INVOICES[0] // inv-midnight-0005
      const key = getInvoiceCairoDateKey(inv)
      expect(key.dateKey).toBe('2026-11-17')
      expect(key.hour).toBe(0)
      expect(key.isDateOnly).toBe(false)
    })

    it('preserves calendar date and returns null hour for date-only invoices without inventing timestamps', () => {
      const inv = MOCK_TEST_INVOICES[5] // inv-date-only
      const key = getInvoiceCairoDateKey(inv)
      expect(key.dateKey).toBe('2026-11-17')
      expect(key.hour).toBeNull()
      expect(key.isDateOnly).toBe(true)
    })
  })

  describe('aggregateDailyTrend (Simplified Single Day View)', () => {
    it('returns exactly one bar labeled "اليوم" capturing all approved invoices regardless of time of day', () => {
      const points = aggregateDailyTrend(MOCK_TEST_INVOICES, '2026-11-17')

      // Exactly ONE point
      expect(points).toHaveLength(1)

      const todayPoint = points[0]
      expect(todayPoint.label).toBe('اليوم')
      expect(todayPoint.subLabel).toBe('11-17')
      expect(todayPoint.dateKey).toBe('2026-11-17')

      // Total daily sum without double-counting:
      // inv-midnight-0005 (5,000) + inv-early-0300 (7,000) + inv-midday-1300 (10,000) + inv-night-2355 (12,000) + inv-date-only (3,000) = 37,000 ج.م
      // Excludes draft (9,000) and cancelled (15,000)
      expect(todayPoint.totalSales).toBe(37000)
      expect(todayPoint.invoicesCount).toBe(5)
    })

    it('backward compatibility alias aggregateDailyHourlyTrends also returns single daily point', () => {
      const points = aggregateDailyHourlyTrends(MOCK_TEST_INVOICES, '2026-11-17')
      expect(points).toHaveLength(1)
      expect(points[0].label).toBe('اليوم')
      expect(points[0].totalSales).toBe(37000)
    })
  })

  describe('Internal Consistency Across Daily, Weekly, and Monthly Aggregations', () => {
    it('produces identical daily total between daily chart and weekly chart for 2026-11-17', () => {
      const dailySlots = aggregateDailyHourlyTrends(MOCK_TEST_INVOICES, '2026-11-17')
      const dailyTotal = dailySlots.reduce((sum, s) => sum + s.totalSales, 0) // 37,000

      const weeklyPoints = aggregateWeeklyTrends(MOCK_TEST_INVOICES, '2026-11-17')
      const todayWeeklyPoint = weeklyPoints.find((p) => p.subLabel === '11-17')

      expect(todayWeeklyPoint).toBeDefined()
      expect(todayWeeklyPoint?.totalSales).toBe(dailyTotal)
      expect(todayWeeklyPoint?.totalSales).toBe(37000)
      expect(todayWeeklyPoint?.invoicesCount).toBe(5) // 5 approved invoices on Nov 17
    })

    it('produces internally consistent monthly total including all approved November sales', () => {
      // November sales: Nov 17 (37,000) + Nov 16 (25,000) = 62,000 ج.م
      const monthlyPoints = aggregateMonthlyTrends(MOCK_TEST_INVOICES, '2026-11-17')
      const novPoint = monthlyPoints.find((p) => p.label === 'نوفمبر')

      expect(novPoint).toBeDefined()
      expect(novPoint?.totalSales).toBe(62000)
      expect(novPoint?.invoicesCount).toBe(6)

      // October sales: 40,000 ج.م
      const octPoint = monthlyPoints.find((p) => p.label === 'أكتوبر')
      expect(octPoint?.totalSales).toBe(40000)
      expect(octPoint?.invoicesCount).toBe(1)
    })
  })
  describe('getEffectiveReferenceDate', () => {
    it('respects explicit reference date string', () => {
      const date = getEffectiveReferenceDate(MOCK_TEST_INVOICES, '2026-11-17')
      expect(formatDateKey(date)).toBe('2026-11-17')
    })

    it('falls back to precomputed fallback trends when invoices is empty', () => {
      const result = aggregateWeeklyTrends([], '2026-11-17', MOCK_FALLBACK_TRENDS)
      expect(result).toHaveLength(7)
      expect(result[0].subLabel).toBe('11-11')
      expect(result[0].totalSales).toBe(18200)
    })
  })
  it('renders default weekly view with consistent totals and segmented control', () => {
    render(
      <SalesTrendChart
        invoices={MOCK_TEST_INVOICES}
        referenceDate="2026-11-17"
        defaultMode="weekly"
      />
    )

    expect(screen.getByText('مؤشر المبيعات الأسبوعي')).toBeInTheDocument()

    // Weekly total: Nov 17 (37,000) + Nov 16 (25,000) = 62,000 ج.م
    expect(screen.getByText(/62,000\s*ج.م/)).toBeInTheDocument()

    const weeklyBtn = screen.getByRole('button', { name: 'أسبوعي' })
    expect(weeklyBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches to single-bar daily view and displays today total clearly without hourly labels', () => {
    render(
      <SalesTrendChart
        invoices={MOCK_TEST_INVOICES}
        referenceDate="2026-11-17"
        defaultMode="weekly"
      />
    )

    const dailyBtn = screen.getByRole('button', { name: 'يومي' })
    fireEvent.click(dailyBtn)

    // Updated title reflecting daily indicator
    expect(screen.getByText('مؤشر المبيعات اليومي')).toBeInTheDocument()
    expect(
      screen.getByText('إجمالي مبيعات اليوم المعتمدة (توقيت مصر) بالجنيه المصري')
    ).toBeInTheDocument()

    // Daily total: 37,000 ج.م displayed above bar and in header period badge
    expect(screen.getAllByText(/37,000\s*ج.م/).length).toBeGreaterThan(0)

    // Exactly one bar labeled "اليوم"
    expect(screen.getByText('اليوم')).toBeInTheDocument()
    expect(screen.getByText('11-17')).toBeInTheDocument()

    // No hourly intervals or labels
    expect(screen.queryByText('00:00')).not.toBeInTheDocument()
    expect(screen.queryByText('03:00')).not.toBeInTheDocument()
    expect(screen.queryByText('12:00')).not.toBeInTheDocument()
    expect(screen.queryByText('21:00')).not.toBeInTheDocument()
    expect(screen.queryByText('غير محدد')).not.toBeInTheDocument()
  })

  it('switches to monthly view and displays 6 months accurately', () => {
    render(
      <SalesTrendChart
        invoices={MOCK_TEST_INVOICES}
        referenceDate="2026-11-17"
        defaultMode="weekly"
      />
    )

    const monthlyBtn = screen.getByRole('button', { name: 'شهري' })
    fireEvent.click(monthlyBtn)

    expect(screen.getByText('مؤشر المبيعات الشهري')).toBeInTheDocument()

    // Total for 6 months: Nov (62,000) + Oct (40,000) = 102,000 ج.م
    expect(screen.getByText(/102,000\s*ج.م/)).toBeInTheDocument()
  })

  it('handles empty data gracefully with 0 totals without crashing', () => {
    render(<SalesTrendChart invoices={[]} defaultMode="weekly" />)
    expect(screen.getByText('مؤشر المبيعات الأسبوعي')).toBeInTheDocument()
    expect(screen.getAllByText(/0\s*ج.م/).length).toBeGreaterThan(0)
  })
})
