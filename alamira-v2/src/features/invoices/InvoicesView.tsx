import React, { useState } from 'react'
import {
  RotateCcw,
} from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import {
  Customer,
  Product,
  SalesInvoice,
  SalesInvoiceFormData,
  InvoiceStatus,
} from '@/types'
import { InvoiceFilters } from './InvoiceFilters'
import { InvoicesTable } from './InvoicesTable'
import { InvoiceMobileCard } from './InvoiceMobileCard'
import { InvoiceDetails } from './InvoiceDetails'
import { InvoiceBuilder } from './InvoiceBuilder'
import { InvoicePrintPreview } from './print'

interface InvoicesViewProps {
  invoices: SalesInvoice[]
  customers: Customer[]
  products: Product[]
  onCreateInvoice: (data: SalesInvoiceFormData) => Promise<SalesInvoice>
  onUpdateInvoice: (id: string, data: SalesInvoiceFormData) => Promise<SalesInvoice>
  onApproveInvoice: (id: string) => Promise<void>
  onCancelInvoice: (id: string, reason: string) => Promise<void>
  onDeleteDraftInvoice: (id: string) => Promise<void>
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  customers,
  products,
  onCreateInvoice,
  onUpdateInvoice,
  onApproveInvoice,
  onCancelInvoice,
  onDeleteDraftInvoice,
  onNotification,
}) => {
  // Mode: list view vs builder mode
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  // Modals State
  const [viewedInvoice, setViewedInvoice] = useState<SalesInvoice | null>(null)
  const [printInvoiceTarget, setPrintInvoiceTarget] = useState<SalesInvoice | null>(null)
  const [cancelTargetInvoice, setCancelTargetInvoice] = useState<SalesInvoice | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Toast / info modal for sales returns
  const [showSalesReturnNotice, setShowSalesReturnNotice] = useState(false)

  // Filter calculations
  const counts = {
    all: invoices.length,
    approved: invoices.filter((i) => i.status === 'approved').length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    cancelled: invoices.filter((i) => i.status === 'cancelled').length,
  }

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.customer_name_snapshot && inv.customer_name_snapshot.toLowerCase().includes(q)) ||
      (inv.customer_phone_snapshot && inv.customer_phone_snapshot.includes(q)) ||
      (inv.notes && inv.notes.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Handlers
  const handleOpenNewBuilder = () => {
    setEditingInvoice(null)
    setIsBuilderOpen(true)
  }

  const handleEditDraft = (inv: SalesInvoice) => {
    setEditingInvoice(inv)
    setIsBuilderOpen(true)
  }

  const handleSaveInvoice = async (formData: SalesInvoiceFormData): Promise<SalesInvoice> => {
    if (editingInvoice && editingInvoice.id) {
      return onUpdateInvoice(editingInvoice.id, formData)
    }
    return onCreateInvoice(formData)
  }

  const handleApprove = async (inv: SalesInvoice) => {
    setApprovingId(inv.id)
    try {
      await onApproveInvoice(inv.id)
    } finally {
      setApprovingId(null)
    }
  }

  const handleExecuteCancel = async () => {
    if (!cancelTargetInvoice) return
    setCancelError(null)

    if (!cancelReason.trim()) {
      setCancelError('يجب كتابة سبب الإلغاء لتوثيق الحركة الرقابية في سجل الحركات')
      return
    }

    try {
      await onCancelInvoice(cancelTargetInvoice.id, cancelReason.trim())
      setCancelTargetInvoice(null)
      setCancelReason('')
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'فشل إلغاء الفاتورة')
    }
  }

  const handleDeleteDraft = async (inv: SalesInvoice) => {
    if (
      window.confirm(
        `هل أنت متأكد من رغبتك في حذف مسودة الفاتورة (${inv.invoice_number}) نهائياً؟\n\nهذا الإجراء سيحذف المسودة وبنودها بالكامل.`
      )
    ) {
      await onDeleteDraftInvoice(inv.id)
    }
  }

  // If builder mode is active, render the full-screen focused InvoiceBuilder
  if (isBuilderOpen) {
    return (
      <InvoiceBuilder
        initialInvoice={editingInvoice}
        customers={customers}
        products={products}
        onSave={handleSaveInvoice}
        onClose={() => setIsBuilderOpen(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* View Header with Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900">
            فواتير المبيعات (Sales Invoices)
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            إصدار فواتير المبيعات، إدارة المسودات، واعتماد خصم المخزون والرقابة المالية
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sales Returns Informational Placeholder Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSalesReturnNotice(true)}
            className="text-amber-800 border-amber-300 hover:bg-amber-50 text-xs"
          >
            مرتجعات المبيعات
          </Button>

          {/* New Invoice Button */}
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenNewBuilder}
            className="text-xs shadow-xs flex-1 sm:flex-none justify-center"
          >
            فاتورة مبيعات جديدة
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={counts}
      />

      {/* Desktop Invoices Table */}
      <InvoicesTable
        invoices={filteredInvoices}
        onView={(inv) => setViewedInvoice(inv)}
        onEdit={handleEditDraft}
        onApprove={handleApprove}
        onCancel={(inv) => setCancelTargetInvoice(inv)}
        onDelete={handleDeleteDraft}
        onReturnClick={() => setShowSalesReturnNotice(true)}
        onPrint={(inv) => setPrintInvoiceTarget(inv)}
        approvingId={approvingId}
      />

      {/* Mobile Invoice Cards */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-neutral-200 text-center text-neutral-400 text-sm">
            لا توجد فواتير مطابقة لمعايير البحث
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <InvoiceMobileCard
              key={inv.id}
              invoice={inv}
              onView={(i) => setViewedInvoice(i)}
              onEdit={handleEditDraft}
              onApprove={handleApprove}
              onCancel={(i) => setCancelTargetInvoice(i)}
              onDelete={handleDeleteDraft}
              onReturnClick={() => setShowSalesReturnNotice(true)}
              onPrint={(i) => setPrintInvoiceTarget(i)}
              isApproving={approvingId === inv.id}
            />
          ))
        )}
      </div>

      {/* Invoice Details Modal */}
      <InvoiceDetails
        isOpen={Boolean(viewedInvoice)}
        onClose={() => setViewedInvoice(null)}
        invoice={viewedInvoice}
        onEdit={handleEditDraft}
        onApprove={handleApprove}
        onCancel={(inv) => setCancelTargetInvoice(inv)}
        onDelete={handleDeleteDraft}
        onReturnClick={() => setShowSalesReturnNotice(true)}
        onPrint={(inv) => {
          setViewedInvoice(null)
          setPrintInvoiceTarget(inv)
        }}
      />

      {/* Cancel Invoice Confirmation Modal */}
      {cancelTargetInvoice && (
        <Modal
          isOpen={Boolean(cancelTargetInvoice)}
          onClose={() => setCancelTargetInvoice(null)}
          title={`إلغاء فاتورة مبيعات معتمدة (${cancelTargetInvoice.invoice_number})`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              تنبيه: سيؤدي إلغاء الفاتورة إلى تحويل حالتها إلى <strong className="text-rose-700">ملغاة</strong> واسترجاع
              كافة الأصناف المباعة إلى رصيد المخزن وتسجيل حركة استرجاع (Reversal) في سجل الحركات المعصوم.
            </p>

            {cancelError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                سبب الإلغاء والتوثيق الرقابي <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="مثال: إلغاء بطلب من العميل، تعديل في بنود المشروع..."
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelTargetInvoice(null)}
              >
                تراجع
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExecuteCancel}
              >
                تأكيد الإلغاء واسترجاع المخزون
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sales Returns Informational Notice Modal */}
      {showSalesReturnNotice && (
        <Modal
          isOpen={showSalesReturnNotice}
          onClose={() => setShowSalesReturnNotice(false)}
          title="مرتجعات المبيعات"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl">
              <RotateCcw className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-900">
              ميزة مرتجعات المبيعات قيد التطوير، وستتوفر قريبًا.
            </p>
            <p className="text-xs text-neutral-500">
              بناءً على بروتوكول التشغيل المعتمد، تبقى عمليات مرتجعات المبيعات غير نشطة حتى الترخيص المالي المستقل.
            </p>
            <div className="pt-2 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSalesReturnNotice(false)}
                className="bg-neutral-800 hover:bg-neutral-900 text-xs"
              >
                حسناً، فهمت ذلك
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice Print & PNG Export Preview Modal */}
      {printInvoiceTarget && (
        <InvoicePrintPreview
          invoice={printInvoiceTarget}
          customer={customers.find((c) => c.id === printInvoiceTarget.customer_id)}
          isOpen={Boolean(printInvoiceTarget)}
          onClose={() => setPrintInvoiceTarget(null)}
          onNotification={onNotification}
        />
      )}
    </div>
  )
}
