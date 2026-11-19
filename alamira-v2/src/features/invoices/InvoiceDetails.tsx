import React from 'react'
import { Modal, Button } from '@/components/ui'
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters'
import { SalesInvoice } from '@/types'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { User, Phone, FileText, Printer, Edit3, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'
import { useAuth } from '@/auth'

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
  const { canCancelInvoice } = useAuth()
  if (!invoice) return null

  const items = invoice.items || []

  const modalFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          إغلاق
        </Button>
        {onPrint && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrint(invoice)}
            className="text-[#0a192f] border-slate-300 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#11243A]" />
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
                className="inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المسودة</span>
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
                className="inline-flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل المسودة</span>
              </Button>
            )}
            {onApprove && (
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 inline-flex items-center gap-1.5"
                onClick={() => {
                  onClose()
                  onApprove(invoice)
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد الفاتورة</span>
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
                className="text-amber-800 border-amber-300 hover:bg-amber-50 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مرتجع مبيعات</span>
              </Button>
            )}
            {onCancel && canCancelInvoice(invoice) && (
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
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`فاتورة مبيعات (${invoice.invoice_number})`}
      description={`تاريخ الإصدار: ${formatDate(invoice.invoice_date)}`}
      maxWidth="5xl"
      footer={modalFooter}
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Header Snapshot Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[#64748B] block mb-0.5">العميل:</span>
            <span className="font-bold text-[#11243A] flex items-center gap-1.5 text-sm">
              <User className="w-4 h-4 text-[#0F766E] shrink-0" />
              <span>{invoice.customer_name_snapshot || 'عميل نقدي'}</span>
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block mb-0.5">الهاتف:</span>
            <span className="font-semibold text-[#334155] flex items-center gap-1.5 tabular-nums">
              <Phone className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              <span dir="ltr">{invoice.customer_phone_snapshot || '--'}</span>
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block mb-0.5">حالة الفاتورة:</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-[#11243A] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center font-mono">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">الصنف</th>
                  <th className="py-2.5 px-2.5 text-center w-20">الوحدة</th>
                  <th className="py-2.5 px-2.5 text-center w-20">الكمية</th>
                  <th className="py-2.5 px-3 text-center w-28">سعر الوحدة</th>
                  <th className="py-2.5 px-3 text-center w-28">الخصم</th>
                  <th className="py-2.5 px-3 text-center w-32">الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#94A3B8]">
                      لا توجد بنود مسجلة في الفاتورة
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center text-[#64748B] font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-[#11243A]">
                        <div>
                          <span className="font-semibold block leading-snug">{it.product_name_snapshot}</span>
                          {it.product_sku_snapshot && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono text-[#64748B] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                              {it.product_sku_snapshot}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[#64748B] whitespace-nowrap">
                        {it.unit_snapshot || 'وحدة'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-[#11243A] tabular-nums whitespace-nowrap">
                        {formatNumber(it.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#334155] tabular-nums whitespace-nowrap">
                        {formatCurrency(it.unit_price)}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums whitespace-nowrap">
                        {Number(it.discount_amount) > 0 ? (
                          <span className="text-[#DC2626] font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                            -{formatCurrency(it.discount_amount)}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">0.00</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-[#0F766E] tabular-nums whitespace-nowrap">
                        {formatCurrency(it.net_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
          <div className="flex justify-between text-[#64748B]">
            <span>إجمالي البنود قبل الخصم:</span>
            <span className="font-semibold text-[#11243A] tabular-nums">{formatCurrency(invoice.gross_amount)}</span>
          </div>

          {Number(invoice.item_discounts_amount) > 0 && (
            <div className="flex justify-between text-[#DC2626]">
              <span>خصومات البنود:</span>
              <span className="font-bold tabular-nums">-{formatCurrency(invoice.item_discounts_amount)}</span>
            </div>
          )}

          <div className="flex justify-between text-[#334155] font-semibold pt-1 border-t border-[#E2E8F0]">
            <span>المجموع الفرعي (Subtotal):</span>
            <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
          </div>

          {Number(invoice.invoice_discount_amount) > 0 && (
            <div className="flex justify-between text-[#DC2626]">
              <span>خصم الفاتورة الإجمالي:</span>
              <span className="font-bold tabular-nums">-{formatCurrency(invoice.invoice_discount_amount)}</span>
            </div>
          )}

          {Number(invoice.additional_charges) > 0 && (
            <div className="flex justify-between text-[#64748B]">
              <span>مصاريف نقل وتوصيل إضافية:</span>
              <span className="font-semibold text-[#11243A] tabular-nums">+{formatCurrency(invoice.additional_charges)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2.5 border-t-2 border-[#0F766E] font-black text-sm text-[#11243A]">
            <span>الصافي النهائي المطلوب:</span>
            <span className="text-lg text-[#0F766E] font-black tabular-nums">{formatCurrency(invoice.final_total)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5 text-amber-950 font-bold">ملاحظات الفاتورة:</strong>
              <span className="leading-relaxed">{invoice.notes}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
