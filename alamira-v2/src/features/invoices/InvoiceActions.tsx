import React from 'react'
import {
  Eye,
  Edit3,
  CheckCircle2,
  Ban,
  Trash2,
  RotateCcw,
  Printer,
} from 'lucide-react'
import { SalesInvoice } from '@/types'

interface InvoiceActionsProps {
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

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({
  invoice,
  onView,
  onEdit,
  onApprove,
  onCancel,
  onDelete,
  onReturnClick,
  onPrint,
  isApproving = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-1">
      {/* 1. View action always available */}
      <button
        type="button"
        onClick={() => onView(invoice)}
        className="action-btn-pill"
        title="معاينة تفاصيل الفاتورة"
        aria-label="معاينة"
      >
        <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
      </button>

      {/* 2. Print / PNG Export action always available */}
      {onPrint && (
        <button
          type="button"
          onClick={() => onPrint(invoice)}
          className="action-btn-pill"
          title="طباعة الفاتورة ومعاينة A4 / تصدير PNG"
          aria-label="طباعة وتصدير"
        >
          <Printer className="w-3.5 h-3.5 text-slate-700" />
        </button>
      )}

      {/* 3. Draft specific actions */}
      {invoice.status === 'draft' && (
        <>
          <button
            type="button"
            onClick={() => onEdit(invoice)}
            className="action-btn-pill"
            title="تعديل المسودة"
            aria-label="تعديل"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#0284C7]" />
          </button>
          <button
            type="button"
            disabled={isApproving}
            onClick={() => onApprove(invoice)}
            className="action-btn-pill bg-emerald-50 border-emerald-200 text-[#0F766E] hover:bg-[#0F766E] hover:text-white disabled:opacity-50"
            title="اعتماد الفاتورة وخصم المخزون"
            aria-label="اعتماد"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(invoice)}
            className="action-btn-pill"
            title="حذف المسودة نهائياً"
            aria-label="حذف"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
          </button>
        </>
      )}

      {/* 4. Approved specific actions */}
      {invoice.status === 'approved' && (
        <>
          <button
            type="button"
            onClick={onReturnClick}
            className="action-btn-pill bg-amber-50 border-amber-200 text-[#D97706] hover:bg-[#D97706] hover:text-white"
            title="تسجيل مرتجع مبيعات"
            aria-label="مرتجع"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onCancel(invoice)}
            className="action-btn-pill"
            title="إلغاء الفاتورة واسترجاع المخزون"
            aria-label="إلغاء"
          >
            <Ban className="w-3.5 h-3.5 text-[#DC2626]" />
          </button>
        </>
      )}
    </div>
  )
}
