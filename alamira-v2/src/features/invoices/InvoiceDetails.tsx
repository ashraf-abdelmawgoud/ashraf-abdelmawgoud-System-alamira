import React from 'react'
import { Modal, Button } from '@/components/ui'
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters'
import { SalesInvoice } from '@/types'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { User, Phone, FileText, Printer } from 'lucide-react'

interface InvoiceDetailsProps {
  isOpen: boolean
  onClose: () => void
  invoice: SalesInvoice | null
  onEdit?: (inv: SalesInvoice) => void
  onApprove?: (inv: SalesInvoice) => void
  onCancel?: (inv: SalesInvoice) => void
  onDelete?: (inv: SalesInvoice) => void
  onReturnClick?: () => void
  onPrint?: (inv: SalesInvoice) => void
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  isOpen,
  onClose,
  invoice,
  onEdit,
  onApprove,
  onCancel,
  onDelete,
  onReturnClick,
  onPrint,
}) => {
  if (!invoice) return null

  const items = invoice.items || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`فاتورة مبيعات (${invoice.invoice_number})`}
      description={`تاريخ الإصدار: ${formatDate(invoice.invoice_date)}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Header Snapshot Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80 text-xs">
          <div>
            <span className="text-neutral-400 block mb-0.5">العميل:</span>
            <span className="font-bold text-neutral-900 flex items-center gap-1 text-sm">
              <User className="w-4 h-4 text-emerald-700 shrink-0" />
              {invoice.customer_name_snapshot || 'عميل نقدي'}
            </span>
          </div>

          <div>
            <span className="text-neutral-400 block mb-0.5">الهاتف:</span>
            <span className="font-semibold text-neutral-700 flex items-center gap-1 font-mono">
              <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              {invoice.customer_phone_snapshot || '--'}
            </span>
          </div>

          <div>
            <span className="text-neutral-400 block mb-0.5">حالة الفاتورة:</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
              <tr>
                <th className="p-2.5 w-8 text-center">#</th>
                <th className="p-2.5">الصنف</th>
                <th className="p-2.5 text-center">الوحدة</th>
                <th className="p-2.5 text-center">الكمية</th>
                <th className="p-2.5 text-center">سعر الوحدة</th>
                <th className="p-2.5 text-center">الخصم</th>
                <th className="p-2.5 text-center">الصافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-neutral-400">
                    لا توجد بنود مسجلة في الفاتورة
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/70">
                    <td className="p-2.5 text-center text-neutral-400">{idx + 1}</td>
                    <td className="p-2.5 font-semibold text-neutral-900">
                      <div>
                        <span>{it.product_name_snapshot}</span>
                        {it.product_sku_snapshot && (
                          <span className="block text-[10px] text-neutral-400 font-mono">
                            {it.product_sku_snapshot}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 text-center text-neutral-500">
                      {it.unit_snapshot || 'وحدة'}
                    </td>
                    <td className="p-2.5 text-center font-bold text-neutral-900">
                      {formatNumber(it.quantity)}
                    </td>
                    <td className="p-2.5 text-center">{formatCurrency(it.unit_price)}</td>
                    <td className="p-2.5 text-center">
                      {Number(it.discount_amount) > 0 ? (
                        <span className="text-rose-600 font-bold">
                          -{formatCurrency(it.discount_amount)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">0.00</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-800">
                      {formatCurrency(it.net_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2 text-xs">
          <div className="flex justify-between text-neutral-600">
            <span>إجمالي البنود قبل الخصم:</span>
            <span className="font-semibold">{formatCurrency(invoice.gross_amount)}</span>
          </div>

          {Number(invoice.item_discounts_amount) > 0 && (
            <div className="flex justify-between text-rose-700">
              <span>خصومات البنود:</span>
              <span className="font-bold">-{formatCurrency(invoice.item_discounts_amount)}</span>
            </div>
          )}

          <div className="flex justify-between text-neutral-700 font-semibold pt-1 border-t border-neutral-200">
            <span>المجموع الفرعي (Subtotal):</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>

          {Number(invoice.invoice_discount_amount) > 0 && (
            <div className="flex justify-between text-rose-700">
              <span>خصم الفاتورة الإجمالي:</span>
              <span className="font-bold">-{formatCurrency(invoice.invoice_discount_amount)}</span>
            </div>
          )}

          {Number(invoice.additional_charges) > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>مصاريف نقل وتوصيل إضافية:</span>
              <span className="font-semibold">+{formatCurrency(invoice.additional_charges)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-600 font-black text-sm text-emerald-950">
            <span>الصافي النهائي المطلوب:</span>
            <span className="text-lg text-emerald-800">{formatCurrency(invoice.final_total)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">ملاحظات الفاتورة:</strong>
              <span>{invoice.notes}</span>
            </div>
          </div>
        )}

        {/* Lifecycle Actions */}
        <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              إغلاق
            </Button>
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrint(invoice)}
                className="gap-1.5 text-[#0a192f] border-slate-300 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-[#c59b27]" />
                <span>طباعة / تصدير</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <>
                {onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onDelete(invoice)
                    }}
                  >
                    حذف المسودة
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onEdit(invoice)
                    }}
                  >
                    تعديل المسودة
                  </Button>
                )}
                {onApprove && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800"
                    onClick={() => {
                      onClose()
                      onApprove(invoice)
                    }}
                  >
                    اعتماد الفاتورة
                  </Button>
                )}
              </>
            )}

            {invoice.status === 'approved' && (
              <>
                {onReturnClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReturnClick}
                    className="text-amber-800 border-amber-300 hover:bg-amber-50"
                  >
                    مرتجع مبيعات
                  </Button>
                )}
                {onCancel && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onCancel(invoice)
                    }}
                  >
                    إلغاء الفاتورة
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
