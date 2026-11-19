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
import { useAuth } from '@/auth'

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
  const { canCancelInvoice } = useAuth()
  const isAllowedToCancel = canCancelInvoice(invoice)
  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* 1. View action always available - Neutral Navy */}
      <button
        type="button"
        onClick={() => onView(invoice)}
        className="action-btn-pill"
        title="معاينة تفاصيل الفاتورة"
        aria-label="معاينة"
      >
        <Eye className="w-3.5 h-3.5 text-[#11243A]" />
      </button>

      {/* 2. Print / PNG Export action always available - Neutral Slate */}
      {onPrint && (
        <button
          type="button"
          onClick={() => onPrint(invoice)}
          className="action-btn-pill action-btn-pill-muted"
          title="طباعة الفاتورة ومعاينة A4 / تصدير PNG"
          aria-label="طباعة وتصدير"
        >
          <Printer className="w-3.5 h-3.5 text-[#64748B]" />
        </button>
      )}

      {/* 3. Draft specific actions */}
      {invoice.status === 'draft' && (
        <>
          <button
            type="button"
            onClick={() => onEdit(invoice)}
            className="action-btn-pill action-btn-pill-muted"
            title="تعديل المسودة"
            aria-label="تعديل"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
          </button>
          <button
            type="button"
            disabled={isApproving}
            onClick={() => onApprove(invoice)}
            className="action-btn-pill action-btn-pill-positive disabled:opacity-50"
            title="اعتماد الفاتورة وخصم المخزون"
            aria-label="اعتماد"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(invoice)}
            className="action-btn-pill action-btn-pill-danger"
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
            className="action-btn-pill action-btn-pill-warning"
            title="تسجيل مرتجع مبيعات"
            aria-label="مرتجع"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#D97706]" />
          </button>
          {isAllowedToCancel ? (
            <button
              type="button"
              onClick={() => onCancel(invoice)}
              className="action-btn-pill action-btn-pill-danger"
              title="إلغاء الفاتورة واسترجاع المخزون"
              aria-label="إلغاء"
            >
              <Ban className="w-3.5 h-3.5 text-[#DC2626]" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="action-btn-pill opacity-40 cursor-not-allowed text-slate-400"
              title="إلغاء الفاتورة متاح لمنشئ الفاتورة فقط أو مدير النظام"
              aria-label="إلغاء غير متاح"
            >
              <Ban className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
