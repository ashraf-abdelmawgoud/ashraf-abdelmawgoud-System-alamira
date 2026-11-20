import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SupplierFilters } from './SupplierFilters'
import { SuppliersTable } from './SuppliersTable'
import { SupplierMobileCard } from './SupplierMobileCard'
import { SupplierFormModal } from './SupplierFormModal'
import { SupplierDetailsModal } from './SupplierDetailsModal'
import { LoadingState, EmptyState, ConfirmDialog, AlertBanner } from '@/components/ui'
import { dataService } from '@/services/dataService'
import { Supplier, SupplierFormData } from '@/types'
import { Truck, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/auth'

export const SuppliersView: React.FC = () => {
  const { currentUser, canManageSuppliers } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const activeRequestIdRef = useRef<number>(0)

  // 300ms debounce for remote search queries with pending timer cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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
    const requestId = ++activeRequestIdRef.current
    setLoading(true)
    try {
      const data = await dataService.getSuppliers({
        search: debouncedSearchQuery,
        status: selectedStatus,
      })

      // Prevent race conditions: drop stale responses
      if (requestId !== activeRequestIdRef.current) return

      setSuppliers(data)
    } catch (err: unknown) {
      if (requestId !== activeRequestIdRef.current) return
      const msg = err instanceof Error ? err.message : 'فشل تحميل دليل الموردين'
      showNotification(msg, 'error')
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false)
      }
    }
  }, [debouncedSearchQuery, selectedStatus])

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
    try {
      if (editingSupplier) {
        await dataService.updateSupplier(editingSupplier.id, formData, currentUser)
        showNotification(`تم تحديث بيانات المورد (${formData.name}) بنجاح`)
      } else {
        await dataService.createSupplier(formData, currentUser)
        showNotification(`تمت إضافة المورد الجديد (${formData.name}) بنجاح`)
      }
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ بيانات المورد'
      showNotification(msg, 'error')
      throw err
    }
  }

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return
    setIsDeleting(true)
    try {
      await dataService.deleteSupplier(deletingSupplier.id, currentUser)
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

  if (!canManageSuppliers) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">غير مصرح بالوصول إلى دليل الموردين</h3>
          <p className="text-xs text-neutral-500">
            وفقاً لسياسة الصلاحيات المعتمدة، فإن إدارة الموردين مقصورة على مدير النظام فقط.
          </p>
        </div>
      </div>
    )
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
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-[#11243A] rounded-lg hover:bg-[#1E3A5F] transition-colors cursor-pointer"
            >
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
