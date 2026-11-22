import type { SalesInvoiceFormData } from '@/types'

// Early client validation only. Database authorization and numeric validation
// must also be enforced by the future atomic write RPC.
export function validateInvoiceWrite(data: SalesInvoiceFormData): void {
  if (!data.customer_id) throw new Error('العميل مطلوب لإصدار الفاتورة')
  if (!data.items?.length) throw new Error('يجب إضافة بند صنف واحد على الأقل')
  const nonNegative = (value: number) => Number.isFinite(value) && value >= 0
  const discountValid = (type: string | undefined, value: number) =>
    ['none', 'fixed', 'percentage'].includes(type ?? 'none') &&
    nonNegative(value) && (type !== 'percentage' || value <= 100)
  if (!nonNegative(data.additional_charges ?? 0) ||
      !discountValid(data.invoice_discount_type, data.invoice_discount_value ?? 0)) {
    throw new Error('قيمة الخصم أو المصروفات الإضافية غير صالحة')
  }
  for (const item of data.items) {
    if (!item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0 ||
        !nonNegative(item.unit_price) ||
        !discountValid(item.discount_type, item.discount_value ?? 0)) {
      throw new Error('بيانات بند الفاتورة غير صالحة: تحقق من الصنف والكمية والسعر والخصم')
    }
  }
}
