import React, { useState, useEffect, useCallback } from 'react'
import { InvoicesView } from '@/features/invoices'
import { LoadingState } from '@/components/ui'
import { mockDataService } from '@/services/mockDataService'
import {
  Customer,
  Product,
  SalesInvoice,
  SalesInvoiceFormData,
} from '@/types'

export const InvoicesPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [invList, custList, prodList] = await Promise.all([
        mockDataService.getInvoices(),
        mockDataService.getCustomers(),
        mockDataService.getProducts(),
      ])
      setInvoices(invList)
      setCustomers(custList)
      setProducts(prodList)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل بيانات فواتير المبيعات'
      showNotification(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Handlers
  const handleCreateInvoice = async (formData: SalesInvoiceFormData) => {
    const created = await mockDataService.createInvoice(formData)
    showNotification(
      created.status === 'approved'
        ? `تم اعتماد فاتورة المبيعات ${created.invoice_number} وخصم المخزون بنجاح`
        : `تم حفظ مسودة الفاتورة ${created.invoice_number} بنجاح`
    )
    await loadAllData()
    return created
  }

  const handleUpdateInvoice = async (id: string, formData: SalesInvoiceFormData) => {
    const updated = await mockDataService.updateDraftInvoice(id, formData)
    showNotification(
      updated.status === 'approved'
        ? `تم اعتماد فاتورة المبيعات ${updated.invoice_number} وخصم المخزون بنجاح`
        : `تم تحديث مسودة الفاتورة ${updated.invoice_number} بنجاح`
    )
    await loadAllData()
    return updated
  }

  const handleApproveInvoice = async (id: string) => {
    try {
      const approved = await mockDataService.approveInvoice(id)
      showNotification(
        `تم اعتماد فاتورة المبيعات ${approved.invoice_number} وخصم الأصناف من المخزون بنجاح`
      )
      await loadAllData()
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'فشل اعتماد فاتورة المبيعات',
        'error'
      )
    }
  }

  const handleCancelInvoice = async (id: string, reason: string) => {
    try {
      const cancelled = await mockDataService.cancelApprovedInvoice(id, reason)
      showNotification(
        `تم إلغاء فاتورة المبيعات ${cancelled.invoice_number} واسترجاع الأصناف للمخزون بنجاح`
      )
      await loadAllData()
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'فشل إلغاء فاتورة المبيعات',
        'error'
      )
    }
  }

  const handleDeleteDraftInvoice = async (id: string) => {
    try {
      const success = await mockDataService.deleteDraftInvoice(id)
      if (success) {
        showNotification('تم حذف مسودة الفاتورة نهائياً بنجاح')
        await loadAllData()
      }
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'فشل حذف مسودة الفاتورة',
        'error'
      )
    }
  }

  if (loading && invoices.length === 0) {
    return <LoadingState message="جاري استرجاع سجل فواتير المبيعات..." />
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Invoices View & Builder */}
      <InvoicesView
        invoices={invoices}
        customers={customers}
        products={products}
        onCreateInvoice={handleCreateInvoice}
        onUpdateInvoice={handleUpdateInvoice}
        onApproveInvoice={handleApproveInvoice}
        onCancelInvoice={handleCancelInvoice}
        onDeleteDraftInvoice={handleDeleteDraftInvoice}
        onNotification={showNotification}
      />
    </div>
  )
}
