import { SalesInvoice, DailySalesTrend } from '@/types'

export type TrendPeriodMode = 'daily' | 'weekly' | 'monthly'

export const EGYPT_TIMEZONE = 'Africa/Cairo'

export interface TrendPoint {
  label: string
  subLabel: string
  dateKey: string
  totalSales: number
  invoicesCount: number
  isCurrent?: boolean
  details?: string
  isDateOnly?: boolean
}

export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

export interface HourlyIntervalDef {
  id: string
  startHour: number
  endHour: number
  label: string
  subLabel: string
}

/**
 * Standard 24-hour day intervals (8 three-hour intervals covering 00:00:00 to 23:59:59).
 * Unrestricted: captures transactions at any hour of the day or night.
 */
export const FULL_DAY_HOURLY_INTERVALS: HourlyIntervalDef[] = [
  { id: 'h-00', startHour: 0, endHour: 3, label: '00:00', subLabel: '12 ص' },
  { id: 'h-03', startHour: 3, endHour: 6, label: '03:00', subLabel: '3 ص' },
  { id: 'h-06', startHour: 6, endHour: 9, label: '06:00', subLabel: '6 ص' },
  { id: 'h-09', startHour: 9, endHour: 12, label: '09:00', subLabel: '9 ص' },
  { id: 'h-12', startHour: 12, endHour: 15, label: '12:00', subLabel: '12 ظ' },
  { id: 'h-15', startHour: 15, endHour: 18, label: '15:00', subLabel: '3 م' },
  { id: 'h-18', startHour: 18, endHour: 21, label: '18:00', subLabel: '6 م' },
  { id: 'h-21', startHour: 21, endHour: 24, label: '21:00', subLabel: '9 م' },
]

/**
 * Extracts Egypt local time (Africa/Cairo) date parts and 24-hour integer from an invoice timestamp.
 * Handles DST (Daylight Saving Time) and standard time transitions accurately using Intl.
 */
export function getCairoDateParts(timestamp: string | Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  dateKey: string // YYYY-MM-DD in Egypt time
} {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  if (isNaN(d.getTime())) {
    return {
      year: 1970,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      dateKey: '1970-01-01',
    }
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(d)
  const partMap: Record<string, string> = {}
  for (const p of parts) {
    partMap[p.type] = p.value
  }

  const year = parseInt(partMap.year, 10)
  const month = parseInt(partMap.month, 10)
  const day = parseInt(partMap.day, 10)
  const hour = parseInt(partMap.hour, 10)
  const minute = parseInt(partMap.minute, 10)
  const second = parseInt(partMap.second, 10)
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return { year, month, day, hour, minute, second, dateKey }
}

/**
 * Determines an invoice's calendar date and hour in Egypt local time.
 * - If timestamp is present with time part, converts to Egypt local time (Africa/Cairo).
 * - If date-only, preserves calendar date with hour: null (no fabricated timestamps).
 */
export function getInvoiceCairoDateKey(invoice: SalesInvoice): {
  dateKey: string
  hour: number | null
  isDateOnly: boolean
} {
  const timestamp = invoice.created_at || invoice.approved_at

  // Check if timestamp contains a time component (e.g. T11:00 or space separated time)
  if (timestamp && (timestamp.includes('T') || /\s\d{1,2}:\d{2}/.test(timestamp))) {
    const cairoParts = getCairoDateParts(timestamp)
    if (cairoParts.dateKey !== '1970-01-01') {
      return {
        dateKey: cairoParts.dateKey,
        hour: cairoParts.hour,
        isDateOnly: false,
      }
    }
  }

  // Date-only invoice: use invoice_date or date slice from timestamp
  const dateStr = invoice.invoice_date || (timestamp ? timestamp.slice(0, 10) : '')
  return {
    dateKey: dateStr,
    hour: null,
    isDateOnly: true,
  }
}

/**
 * Formats a Date object to YYYY-MM-DD string in Egypt local time.
 */
export function formatDateKey(date: Date): string {
  return getCairoDateParts(date).dateKey
}

/**
 * Formats a Date object to MM-DD string in Egypt local time.
 */
export function formatMonthDayKey(date: Date): string {
  const parts = getCairoDateParts(date)
  return `${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/**
 * Parses reference date input safely into a Date object.
 */
export function parseRefDate(refDate?: string | Date): Date {
  if (!refDate) return new Date()
  if (refDate instanceof Date) return new Date(refDate.getTime())
  const parts = refDate.split('T')[0].split('-')
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    return new Date(y, m, d, 12, 0, 0)
  }
  const parsed = new Date(refDate)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

/**
 * Resolves the effective reference anchor date:
 * - Uses explicitRefDate if provided.
 * - Otherwise checks if any invoice matches today's actual calendar date in Egypt.
 * - Otherwise defaults to the latest invoice date in the dataset (or today).
 */
export function getEffectiveReferenceDate(
  invoices: SalesInvoice[] = [],
  explicitRefDate?: string | Date
): Date {
  if (explicitRefDate) {
    return parseRefDate(explicitRefDate)
  }
  const todayKey = formatDateKey(new Date())
  const hasToday = invoices.some((inv) => getInvoiceCairoDateKey(inv).dateKey === todayKey)
  if (hasToday) {
    return new Date()
  }
  const dates = invoices
    .map((inv) => getInvoiceCairoDateKey(inv).dateKey)
    .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}/.test(d)))
    .sort()

  if (dates.length > 0) {
    return parseRefDate(dates[dates.length - 1])
  }

  return new Date()
}

export interface DailyAggregationResult {
  slots: TrendPoint[]
  dateOnlySales: number
  dateOnlyCount: number
  totalSales: number
  invoicesCount: number
}

/**
 * Aggregates today's total sales into exactly one point for the current Egypt calendar day (Africa/Cairo).
 * - Simplified daily mode: single bar representing today's total sales.
 * - No hourly grouping or intervals.
 * - Includes all approved invoices regardless of time of day (including date-only invoices).
 * - Excludes non-approved invoices (drafts, cancelled, rejected).
 */
export function aggregateDailyTrend(
  invoices: SalesInvoice[] = [],
  referenceDate?: string | Date
): TrendPoint[] {
  const ref = getEffectiveReferenceDate(invoices, referenceDate)
  const targetDateKey = formatDateKey(ref)
  const monthDayKey = formatMonthDayKey(ref)

  // Filter approved invoices whose Egypt dateKey matches target date
  const dayInvoices = invoices.filter((inv) => {
    if (inv.status !== 'approved') return false
    const { dateKey } = getInvoiceCairoDateKey(inv)
    return dateKey === targetDateKey
  })

  const totalSales = dayInvoices.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0)
  const invoicesCount = dayInvoices.length

  return [
    {
      label: 'اليوم',
      subLabel: monthDayKey,
      dateKey: targetDateKey,
      totalSales,
      invoicesCount,
      isCurrent: true,
      details: `إجمالي مبيعات اليوم (${targetDateKey})`,
    },
  ]
}

/**
 * Backward-compatibility alias for aggregateDailyTrend.
 */
export const aggregateDailyHourlyTrends = aggregateDailyTrend

/**
 * Aggregates sales for the last 7 calendar days in Egypt local time up to the reference date.
 * Strictly filters approved invoices. Includes zero-sales days.
 */
export function aggregateWeeklyTrends(
  invoices: SalesInvoice[] = [],
  referenceDate?: string | Date,
  fallbackTrends?: DailySalesTrend[]
): TrendPoint[] {
  // If invoices is empty and fallbackTrends is provided, map fallbackTrends
  if ((!invoices || invoices.length === 0) && fallbackTrends && fallbackTrends.length > 0) {
    return fallbackTrends.map((t, idx) => ({
      label: t.day.includes('اليوم') ? 'اليوم' : t.day.split(' ')[0],
      subLabel: t.date,
      dateKey: `fallback-${t.date}-${idx}`,
      totalSales: Number(t.totalSales || 0),
      invoicesCount: Number(t.invoicesCount || 0),
      isCurrent: idx === fallbackTrends.length - 1,
      details: t.day,
    }))
  }

  const ref = getEffectiveReferenceDate(invoices, referenceDate)
  const approvedInvoices = invoices.filter((i) => i.status === 'approved')

  const points: TrendPoint[] = []

  // Last 7 calendar days (6 days prior + today)
  for (let offset = 6; offset >= 0; offset--) {
    const dayDate = new Date(ref)
    dayDate.setDate(ref.getDate() - offset)

    const dateKey = formatDateKey(dayDate)
    const monthDayKey = formatMonthDayKey(dayDate)
    const dayOfWeek = dayDate.getDay()
    const arabicDayName = ARABIC_DAYS[dayOfWeek]
    const isToday = offset === 0

    const matching = approvedInvoices.filter((inv) => {
      const invDate = getInvoiceCairoDateKey(inv).dateKey
      return invDate === dateKey
    })

    const totalSales = matching.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0)
    const invoicesCount = matching.length

    points.push({
      label: isToday ? 'اليوم' : arabicDayName,
      subLabel: monthDayKey,
      dateKey,
      totalSales,
      invoicesCount,
      isCurrent: isToday,
      details: isToday ? `اليوم (${arabicDayName})` : arabicDayName,
    })
  }

  return points
}

/**
 * Aggregates sales for the last 6 calendar months in Egypt local time ending with reference month.
 * Strictly filters approved invoices. Includes zero-sales months.
 */
export function aggregateMonthlyTrends(
  invoices: SalesInvoice[] = [],
  referenceDate?: string | Date
): TrendPoint[] {
  const ref = getEffectiveReferenceDate(invoices, referenceDate)
  const approvedInvoices = invoices.filter((i) => i.status === 'approved')

  const points: TrendPoint[] = []

  // Last 6 calendar months (5 months prior + current month)
  for (let offset = 5; offset >= 0; offset--) {
    const monthDate = new Date(ref.getFullYear(), ref.getMonth() - offset, 1, 12, 0, 0)
    const year = monthDate.getFullYear()
    const monthIndex = monthDate.getMonth()
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    const arabicMonthName = ARABIC_MONTHS[monthIndex]
    const isCurrentMonth = offset === 0

    const matching = approvedInvoices.filter((inv) => {
      const invDate = getInvoiceCairoDateKey(inv).dateKey
      return invDate.startsWith(monthKey)
    })

    const totalSales = matching.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0)
    const invoicesCount = matching.length

    points.push({
      label: arabicMonthName,
      subLabel: String(year),
      dateKey: monthKey,
      totalSales,
      invoicesCount,
      isCurrent: isCurrentMonth,
      details: `${arabicMonthName} ${year}`,
    })
  }

  return points
}
