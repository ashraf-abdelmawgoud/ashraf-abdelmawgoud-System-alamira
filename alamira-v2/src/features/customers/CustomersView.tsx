import React, { useState, useEffect, useCallback } from 'react'
import { CustomerFilters } from './CustomerFilters'
import { CustomersTable } from './CustomersTable'
import { CustomerMobileCard } from './CustomerMobileCard'
import { CustomerFormModal } from './CustomerFormModal'
import { CustomerDetailsModal } from './CustomerDetailsModal'
import { LoadingState, EmptyState, ConfirmDialog, AlertBanner } from '@/components/ui'
import { mockDataService } from '@/services/mockDataService'
import { Customer, CustomerFormData } from '@/types'
import { Users, Plus } from 'lucide-react'

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
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
      const data = await mockDataService.getCustomers({
        search: searchQuery,
        status: selectedStatus,
      })
      setCustomers(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل دليل العملاء'
      showNotification(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenAddModal = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c)
    setIsFormOpen(true)
  }

  const handleSaveCustomer = async (formData: CustomerFormData) => {
    if (editingCustomer) {
      await mockDataService.updateCustomer(editingCustomer.id, formData)
      showNotification(`تم تحديث بيانات العميل (${formData.name}) بنجاح`)
    } else {
      await mockDataService.createCustomer(formData)
      showNotification(`تمت إضافة العميل الجديد (${formData.name}) بنجاح`)
    }
    await loadData()
  }

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return
    setIsDeleting(true)
    try {
      await mockDataService.deleteCustomer(deletingCustomer.id)
      showNotification(`تم حذف العميل (${deletingCustomer.name}) بنجاح`, 'info')
      setDeletingCustomer(null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حذف العميل'
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
            دليل العملاء
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            سجل بيانات العملاء والشركات ومتابعة المديونيات وكشوف الحسابات
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
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onAddNew={handleOpenAddModal}
        totalCount={customers.length}
      />

      {/* Table / Cards */}
      {loading ? (
        <LoadingState message="جاري استرجاع دليل العملاء..." />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-neutral-400" />}
          title="لا يوجد عملاء مطابقين"
          description={
            searchQuery || selectedStatus !== 'all'
              ? 'لم يتم العثور على أية نتائج تطابق معايير البحث والفلترة المحددة.'
              : 'لم يتم تسجيل أي عملاء في النظام حتى الآن.'
          }
          action={
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <CustomersTable
              customers={customers}
              onView={(c) => setViewingCustomer(c)}
              onEdit={handleOpenEditModal}
              onDelete={(c) => setDeletingCustomer(c)}
            />
          </div>

          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <CustomerMobileCard
                key={c.id}
                customer={c}
                onView={(cust) => setViewingCustomer(cust)}
                onEdit={handleOpenEditModal}
                onDelete={(cust) => setDeletingCustomer(cust)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
      />

      <CustomerDetailsModal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        customer={viewingCustomer}
        onEdit={handleOpenEditModal}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteCustomer}
        title="تأكيد حذف العميل"
        message={`هل أنت متأكد من رغبتك في حذف العميل (${deletingCustomer?.name}) من الذاكرة المحلية؟`}
        confirmText="حذف العميل"
        isLoading={isDeleting}
      />
    </div>
  )
}
