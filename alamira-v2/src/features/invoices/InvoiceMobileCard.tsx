import React from 'react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { SalesInvoice } from '@/types'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { InvoiceActions } from './InvoiceActions'
import { Calendar, User, Phone } from 'lucide-react'

interface InvoiceMobileCardProps {
  invoice: SalesInvoice
  onView: (inv: SalesInvoice) => void
  onEdit: (inv: SalesInvoice) => void
  onApprove: (inv: SalesInvoice) => void
  onCancel: (inv: SalesInvoice) => void
  onDelete: (inv: SalesInvoice) => void
  onReturnClick: () => void
  onPrint?: (inv: SalesInvoice) => void
  isApproving?: boolean
}

export const InvoiceMobileCard: React.FC<InvoiceMobileCardProps> = ({
  invoice,
  onView,
  onEdit,
  onApprove,
  onCancel,
  onDelete,
  onReturnClick,
  onPrint,
  isApproving,
}) => {
  const discountsTotal =
    (Number(invoice.item_discounts_amount) || 0) + (Number(invoice.invoice_discount_amount) || 0)

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2.5">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <span className="inv-number-badge">
            {invoice.invoice_number}
          </span>
          <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDate(invoice.invoice_date)}</span>
          </div>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {/* Customer Info */}
      <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[#11243A] font-semibold">
          <User className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>{invoice.customer_name_snapshot || 'عميل نقدي'}</span>
        </div>
        {invoice.customer_phone_snapshot && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-mono pr-5" dir="ltr">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{invoice.customer_phone_snapshot}</span>
          </div>
        )}
      </div>

      {/* Financials */}
      <div className="space-y-1 text-xs pt-1">
        <div className="flex justify-between text-[#64748B]">
          <span>إجمالي الأصناف:</span>
          <span className="font-semibold tabular-nums text-[#11243A]">{formatCurrency(invoice.gross_amount)}</span>
        </div>
        {discountsTotal > 0 && (
          <div className="flex justify-between text-rose-700">
            <span>إجمالي الخصم:</span>
            <span className="font-semibold tabular-nums">-{formatCurrency(discountsTotal)}</span>
          </div>
        )}
        {Number(invoice.additional_charges) > 0 && (
          <div className="flex justify-between text-[#64748B]">
            <span>مصاريف نقل وتوصيل:</span>
            <span className="font-semibold tabular-nums">+{formatCurrency(invoice.additional_charges)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
          <span className="font-semibold text-[#11243A] text-xs">الصافي النهائي:</span>
          <span className="text-base font-bold text-[#0F766E] tabular-nums">
            {formatCurrency(invoice.final_total)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-[#E2E8F0] flex justify-end">
        <InvoiceActions
          invoice={invoice}
          onView={onView}
          onEdit={onEdit}
          onApprove={onApprove}
          onCancel={onCancel}
          onDelete={onDelete}
          onReturnClick={onReturnClick}
          onPrint={onPrint}
          isApproving={isApproving}
        />
      </div>
    </div>
  )
}
