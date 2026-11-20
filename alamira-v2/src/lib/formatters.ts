/**
 * Formats a monetary number into Arabic currency format (EGP / ج.م).
 * Uses clear Western Arabic numerals (as established in Al-Amira V1) with currency suffix.
 */
export function formatCurrency(amount: number, options?: { showCurrency?: boolean }): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return options?.showCurrency === false ? '0' : '0 ج.م'
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  if (options?.showCurrency === false) {
    return formatted
  }

  return `${formatted} ج.م`
}

/**
 * Formats a number with standard thousand separator commas.
 */
export function formatNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0'
  }
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Official IANA Timezone for Egypt (encompassing Qena, Cairo, and all governorates).
 * Automatically accounts for Egyptian Daylight Saving Time (DST) without hardcoded offsets.
 */
export const QENA_TIMEZONE = 'Africa/Cairo'
export const QENA_TIMEZONE_LABEL = 'بتوقيت قنا – مصر'

/**
 * Formats an ISO date string or Date object specifically into Qena, Egypt time (Africa/Cairo)
 * with readable Arabic text, Western Arabic numerals, and dynamic DST handling.
 */
export function formatQenaDateTime(
  dateInput: string | Date,
  options?: { includeSeconds?: boolean }
): string {
  if (!dateInput) return '-'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    timeZone: QENA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds !== false ? { second: '2-digit' } : {}),
    hour12: true,
  }).format(date)
}

/**
 * Backward-compatible alias for existing Cairo date-time references
 */
export const formatCairoDateTime = formatQenaDateTime

/**
 * Returns YYYY-MM-DD date string in official Egypt local time (Africa/Cairo)
 */
export function getQenaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: QENA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
export const getCairoDateString = getQenaDateString

/**
 * Formats an ISO date string or Date object into human-readable Arabic date
 * adhering to official Qena / Egypt local time.
 */
export function formatDate(dateInput: string | Date, includeTime: boolean = false): string {
  if (!dateInput) return '-'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '-'

  const options: Intl.DateTimeFormatOptions = {
    timeZone: QENA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }

  return new Intl.DateTimeFormat('ar-EG', options).format(date)
}

/**
 * Formats a quantity value, cleanly displaying whole numbers without decimals
 * and up to 3 decimals without trailing zeroes for metric/fractional items.
 */
export function formatQuantity(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0'
  return Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(3)).toString()
}
