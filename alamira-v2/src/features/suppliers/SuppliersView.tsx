import React, { useState, useEffect, useCallback } from 'react'
import { SupplierFilters } from './SupplierFilters'
import { SuppliersTable } from './SuppliersTable'
import { SupplierMobileCard } from './SupplierMobileCard'
import { SupplierFormModal } from './SupplierFormModal'
import { SupplierDetailsModal } from './SupplierDetailsModal'
import { LoadingState, EmptyState, ConfirmDialog, AlertBanner } from '@/components/ui'
import { mockDataService } from '@/services/mockDataService'
import { Supplier, SupplierFormData } from '@/types'
import { Truck, Plus } from 'lucide-react'

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await mockDataService.getSuppliers({
        search: searchQuery,
        status: selectedStatus,
      })
      setSuppliers(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل دليل الموردين'
      showNotification(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenAddModal = () => {
    setEditingSupplier(null)
    setIsFormOpen(true)
  }

  const handleOpenEditModal = (s: Supplier) => {
    setEditingSupplier(s)
    setIsFormOpen(true)
  }

  const handleSaveSupplier = async (formData: SupplierFormData) => {
    if (editingSupplier) {
      await mockDataService.updateSupplier(editingSupplier.id, formData)
      showNotification(`تم تحديث بيانات المورد (${formData.name}) بنجاح`)
    } else {
      await mockDataService.createSupplier(formData)
      showNotification(`تمت إضافة المورد الجديد (${formData.name}) بنجاح`)
    }
    await loadData()
  }

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return
    setIsDeleting(true)
    try {
      await mockDataService.deleteSupplier(deletingSupplier.id)
      showNotification(`تم حذف المورد (${deletingSupplier.name}) بنجاح`, 'info')
      setDeletingSupplier(null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حذف المورد'
      showNotification(msg, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-neutral-200/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            دليل الموردين والمصانع
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            سجل مصانع وشركات التوريدات العامة ومتابعة المستحقات وأذون التوريد
          </p>
        </div>
      </div>

      {notification && (
        <AlertBanner
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Filters */}
      <SupplierFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onAddNew={handleOpenAddModal}
        totalCount={suppliers.length}
      />

      {/* Table / Cards */}
      {loading ? (
        <LoadingState message="جاري استرجاع دليل الموردين..." />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8 text-neutral-400" />}
          title="لا يوجد موردون مطابقون"
          description={
            searchQuery || selectedStatus !== 'all'
              ? 'لم يتم العثور على أية نتائج تطابق معايير البحث والفلترة المحددة.'
              : 'لم يتم تسجيل أي موردين في النظام حتى الآن.'
          }
          action={
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مورد جديد</span>
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <SuppliersTable
              suppliers={suppliers}
              onView={(s) => setViewingSupplier(s)}
              onEdit={handleOpenEditModal}
              onDelete={(s) => setDeletingSupplier(s)}
            />
          </div>

          <div className="md:hidden space-y-3">
            {suppliers.map((s) => (
              <SupplierMobileCard
                key={s.id}
                supplier={s}
                onView={(sup) => setViewingSupplier(sup)}
                onEdit={handleOpenEditModal}
                onDelete={(sup) => setDeletingSupplier(sup)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveSupplier}
        supplier={editingSupplier}
      />

      <SupplierDetailsModal
        isOpen={Boolean(viewingSupplier)}
        onClose={() => setViewingSupplier(null)}
        supplier={viewingSupplier}
        onEdit={handleOpenEditModal}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDeleteSupplier}
        title="تأكيد حذف المورد"
        message={`هل أنت متأكد من رغبتك في حذف المورد (${deletingSupplier?.name}) من الذاكرة المحلية؟`}
        confirmText="حذف المورد"
        isLoading={isDeleting}
      />
    </div>
  )
}
