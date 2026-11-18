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
 * Formats an ISO date string or Date object into human-readable Arabic date.
 */
export function formatDate(dateInput: string | Date, includeTime: boolean = false): string {
  if (!dateInput) return '-'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '-'

  const options: Intl.DateTimeFormatOptions = {
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
