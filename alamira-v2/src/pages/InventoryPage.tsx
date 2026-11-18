import React, { useState, useEffect, useCallback } from 'react'
import {
  InventoryTabsBar,
  InventoryTabType,
  InventoryOverview,
  ReceiptsList,
  ReceiptFormModal,
  IssuesList,
  IssueFormModal,
  AdjustmentsList,
  AdjustmentFormModal,
  MovementHistoryView,
} from '@/features/inventory'
import { LoadingState } from '@/components/ui'
import { mockDataService } from '@/services/mockDataService'
import {
  Product,
  Supplier,
  StockReceipt,
  StockIssue,
  StockAdjustment,
  InventoryMovementLog,
} from '@/types'

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTabType>('overview')
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [receipts, setReceipts] = useState<StockReceipt[]>([])
  const [issues, setIssues] = useState<StockIssue[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [movements, setMovements] = useState<InventoryMovementLog[]>([])

  // Modal triggers from overview
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, sups, recs, iss, adjs, movs] = await Promise.all([
        mockDataService.getProducts(),
        mockDataService.getSuppliers(),
        mockDataService.getReceipts(),
        mockDataService.getIssues(),
        mockDataService.getAdjustments(),
        mockDataService.getMovementLogs(),
      ])

      setProducts(prods)
      setSuppliers(sups)
      setReceipts(recs)
      setIssues(iss)
      setAdjustments(adjs)
      setMovements(movs)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل بيانات المخزون'
      showNotification(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Handlers for Receipts
  const handleApproveReceipt = async (receiptId: string) => {
    try {
      const approved = await mockDataService.approveReceipt(receiptId)
      showNotification(`تم اعتماد إذن الاستلام رقم ${approved.receipt_number} وتحديث رصيد المخزون بنجاح`)
      await loadAllData()
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'فشل اعتماد إذن الاستلام', 'error')
    }
  }

  const handleCreateReceipt = async (formData: Parameters<typeof mockDataService.createReceipt>[0]) => {
    const created = await mockDataService.createReceipt(formData)
    showNotification(
      created.status === 'approved'
        ? `تم اعتماد إذن الاستلام ${created.receipt_number} وإيداع الكميات بالمخزن`
        : `تم حفظ مسودة إذن الاستلام ${created.receipt_number} بنجاح`
    )
    await loadAllData()
    return created
  }

  // Handlers for Issues
  const handleApproveIssue = async (issueId: string) => {
    try {
      const approved = await mockDataService.approveIssue(issueId)
      showNotification(`تم اعتماد إذن الصرف رقم ${approved.issue_number} وخصم الكميات من المخزون بنجاح`)
      await loadAllData()
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'فشل اعتماد إذن الصرف', 'error')
    }
  }

  const handleCreateIssue = async (formData: Parameters<typeof mockDataService.createIssue>[0]) => {
    const created = await mockDataService.createIssue(formData)
    showNotification(
      created.status === 'approved'
        ? `تم اعتماد إذن الصرف ${created.issue_number} وخصم الكميات من المخزون`
        : `تم حفظ مسودة إذن الصرف ${created.issue_number} بنجاح`
    )
    await loadAllData()
    return created
  }

  // Handlers for Adjustments
  const handleCreateAdjustment = async (formData: Parameters<typeof mockDataService.createAdjustment>[0]) => {
    const created = await mockDataService.createAdjustment(formData)
    showNotification(`تم اعتماد تسوية الجرد ${created.adjustment_number} وإعادة ضبط الرصيد الفعلي بنجاح`)
    await loadAllData()
    return created
  }

  if (loading && products.length === 0) {
    return <LoadingState message="جاري تحميل سجلات وأذون المخزون..." />
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <InventoryTabsBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          receipts: receipts.length,
          issues: issues.length,
          adjustments: adjustments.length,
          movements: movements.length,
        }}
      />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <InventoryOverview
          products={products}
          receipts={receipts}
          issues={issues}
          adjustments={adjustments}
          onNavigateTab={setActiveTab}
          onOpenNewReceipt={() => setIsReceiptModalOpen(true)}
          onOpenNewIssue={() => setIsIssueModalOpen(true)}
          onOpenNewAdjustment={() => setIsAdjustmentModalOpen(true)}
        />
      )}

      {activeTab === 'receipts' && (
        <ReceiptsList
          receipts={receipts}
          products={products}
          suppliers={suppliers}
          onApprove={handleApproveReceipt}
          onCreateReceipt={handleCreateReceipt}
        />
      )}

      {activeTab === 'issues' && (
        <IssuesList
          issues={issues}
          products={products}
          onApprove={handleApproveIssue}
          onCreateIssue={handleCreateIssue}
        />
      )}

      {activeTab === 'adjustments' && (
        <AdjustmentsList
          adjustments={adjustments}
          products={products}
          onCreateAdjustment={handleCreateAdjustment}
        />
      )}

      {activeTab === 'movements' && (
        <MovementHistoryView
          movements={movements}
          onRefresh={loadAllData}
          loading={loading}
        />
      )}

      {/* Quick Action Modals */}
      {isReceiptModalOpen && (
        <ReceiptFormModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onSave={async (data) => {
            await handleCreateReceipt(data)
          }}
          products={products}
          suppliers={suppliers}
        />
      )}

      {isIssueModalOpen && (
        <IssueFormModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          onSave={async (data) => {
            await handleCreateIssue(data)
          }}
          products={products}
        />
      )}

      {isAdjustmentModalOpen && (
        <AdjustmentFormModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSave={async (data) => {
            await handleCreateAdjustment(data)
          }}
          products={products}
        />
      )}
    </div>
  )
}
