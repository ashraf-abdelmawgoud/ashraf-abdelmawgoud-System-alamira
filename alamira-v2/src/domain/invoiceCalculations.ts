/**
 * Domain module for Al-Amira ERP V2 Sales Invoice Calculations.
 *
 * Implements strict calculation parity with V1:
 * - round2: decimal-safe rounding to 2 fractional digits
 * - Line gross: round2(quantity * unit_price)
 * - Line discount: percentage (bounded 0..100) or fixed (bounded 0..line_gross), rounded to 2 decimals
 * - Line net: round2(line_gross - line_discount)
 * - Invoice subtotal: sum of all line_net amounts
 * - Invoice discount: percentage (bounded 0..100) on subtotal, or fixed (bounded 0..subtotal), rounded to 2 decimals
 * - Additional charges: delivery / shipping fees (non-negative)
 * - Final total: round2(subtotal - invoice_discount + additional_charges)
 *
 * NOTE: Tax is 0 in Al-Amira V1 production.
 */

export type DiscountType = 'none' | 'percentage' | 'fixed'

export interface InvoiceLineItemInput {
  productId: string
  quantity: number
  unitPrice: number
  discountType?: DiscountType
  discountValue?: number
}

export interface CalculatedLineItem {
  productId: string
  quantity: number
  unitPrice: number
  discountType: DiscountType
  discountValue: number
  grossAmount: number
  discountAmount: number
  netAmount: number
}

export interface InvoiceCalculationInput {
  items: InvoiceLineItemInput[]
  discountType?: DiscountType
  discountValue?: number
  additionalCharges?: number
}

export interface InvoiceCalculationsResult {
  items: CalculatedLineItem[]
  grossTotal: number
  itemDiscountsTotal: number
  subtotal: number
  invoiceDiscountAmount: number
  additionalCharges: number
  finalTotal: number
}

export interface ValidationIssue {
  field: string
  message: string
}

export interface InvoiceValidationResult {
  isValid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

/**
 * Standard monetary 2-decimal banker-safe rounding used in V1.
 */
export function round2(num: number): number {
  if (isNaN(num)) return 0
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100
}

/**
 * Calculates a single line item matching V1 formula.
 */
export function calculateLineItem(input: InvoiceLineItemInput): CalculatedLineItem {
  const qty = Number(input.quantity) || 0
  const price = Number(input.unitPrice) || 0
  const gross = round2(qty * price)

  const discType = input.discountType || 'none'
  const discVal = Number(input.discountValue) || 0

  let discAmt = 0
  if (discType === 'percentage') {
    const pct = Math.min(Math.max(discVal, 0), 100)
    discAmt = round2((gross * pct) / 100)
  } else if (discType === 'fixed') {
    discAmt = Math.min(Math.max(discVal, 0), gross)
    discAmt = round2(discAmt)
  }

  const net = round2(Math.max(gross - discAmt, 0))

  return {
    productId: input.productId,
    quantity: qty,
    unitPrice: price,
    discountType: discType,
    discountValue: discVal,
    grossAmount: gross,
    discountAmount: discAmt,
    netAmount: net,
  }
}

/**
 * Calculates all invoice totals according to verified V1 financial formulas.
 */
export function calculateInvoiceTotals(input: InvoiceCalculationInput): InvoiceCalculationsResult {
  const items = (input.items || []).map(calculateLineItem)

  let grossTotal = 0
  let itemDiscountsTotal = 0
  let subtotal = 0

  for (const it of items) {
    grossTotal = round2(grossTotal + it.grossAmount)
    itemDiscountsTotal = round2(itemDiscountsTotal + it.discountAmount)
    subtotal = round2(subtotal + it.netAmount)
  }

  const invDiscType = input.discountType || 'none'
  const invDiscVal = Number(input.discountValue) || 0

  let invDiscAmt = 0
  if (invDiscType === 'percentage') {
    const pct = Math.min(Math.max(invDiscVal, 0), 100)
    invDiscAmt = round2((subtotal * pct) / 100)
  } else if (invDiscType === 'fixed') {
    invDiscAmt = Math.min(Math.max(invDiscVal, 0), subtotal)
    invDiscAmt = round2(invDiscAmt)
  }

  const charges = round2(Math.max(Number(input.additionalCharges) || 0, 0))
  const finalTotal = round2(Math.max(subtotal - invDiscAmt + charges, 0))

  return {
    items,
    grossTotal,
    itemDiscountsTotal,
    subtotal,
    invoiceDiscountAmount: invDiscAmt,
    additionalCharges: charges,
    finalTotal,
  }
}
