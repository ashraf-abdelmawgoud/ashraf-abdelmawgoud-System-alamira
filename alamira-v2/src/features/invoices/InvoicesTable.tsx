import React from 'react'
import { Table } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { SalesInvoice } from '@/types'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { InvoiceActions } from './InvoiceActions'
import { FileSpreadsheet, Calendar, Phone } from 'lucide-react'

interface InvoicesTableProps {
  invoices: SalesInvoice[]
  onView: (inv: SalesInvoice) => void
  onEdit: (inv: SalesInvoice) => void
  onApprove: (inv: SalesInvoice) => void
  onCancel: (inv: SalesInvoice) => void
  onDelete: (inv: SalesInvoice) => void
  onReturnClick: () => void
  onPrint?: (inv: SalesInvoice) => void
  approvingId?: string | null
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  onView,
  onEdit,
  onApprove,
  onCancel,
  onDelete,
  onReturnClick,
  onPrint,
  approvingId,
}) => {
  return (
    <div className="hidden md:block">
      <Table>
        <thead className="bg-[#F8FAFC] text-[#064E3B] text-[13px] font-bold border-b border-[#E2E8F0]">
          <tr>
            <th className="py-2.5 px-3.5 text-right font-bold text-[#064E3B]">رقم الفاتورة</th>
            <th className="py-2.5 px-3.5 text-right font-bold text-[#064E3B]">التاريخ</th>
            <th className="py-2.5 px-3.5 text-right font-bold text-[#064E3B]">العميل</th>
            <th className="py-2.5 px-3.5 text-right font-bold text-[#064E3B]">الإجمالي</th>
            <th className="py-2.5 px-3.5 text-right font-bold text-[#064E3B]">الخصم</th>
            <th className="py-2.5 px-3.5 text-right font-bold text-[#064E3B]">الصافي النهائي</th>
            <th className="py-2.5 px-3.5 text-center font-bold text-[#064E3B]">الحالة</th>
            <th className="py-2.5 px-3.5 text-center font-bold text-[#064E3B]">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] bg-white text-[13px]">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-12 text-[#64748B]">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                لا توجد فواتير مبيعات مطابقة لمعايير البحث
              </td>
            </tr>
          ) : (
            invoices.map((inv) => {
              const discountsTotal =
                (Number(inv.item_discounts_amount) || 0) + (Number(inv.invoice_discount_amount) || 0)
              return (
                <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2.5 px-3.5 font-bold">
                    <span className="inv-number-badge">
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-[#64748B] text-xs whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(inv.invoice_date)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-[#11243A]">
                    <div>
                      <span className="text-[13.5px]">{inv.customer_name_snapshot || 'عميل نقدي'}</span>
                      {inv.customer_phone_snapshot && (
                        <span className="block text-xs text-[#64748B] flex items-center gap-1 mt-0.5" dir="ltr">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{inv.customer_phone_snapshot}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-[#11243A] font-semibold text-[13px] whitespace-nowrap tabular-nums">
                    {formatCurrency(inv.gross_amount)}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs whitespace-nowrap tabular-nums">
                    {discountsTotal > 0 ? (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        -{formatCurrency(discountsTotal)}
                      </span>
                    ) : (
                      <span className="text-slate-400">0.00</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-[#0F766E] whitespace-nowrap text-[14.5px] tabular-nums">
                    {formatCurrency(inv.final_total)}
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <InvoiceActions
                      invoice={inv}
                      onView={onView}
                      onEdit={onEdit}
                      onApprove={onApprove}
                      onCancel={onCancel}
                      onDelete={onDelete}
                      onReturnClick={onReturnClick}
                      onPrint={onPrint}
                      isApproving={approvingId === inv.id}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </Table>
    </div>
  )
}
