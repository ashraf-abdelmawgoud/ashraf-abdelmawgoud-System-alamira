import React, { useState, useEffect, useCallback } from 'react'
import { ProductFilters } from './ProductFilters'
import { ProductsTable } from './ProductsTable'
import { ProductMobileCard } from './ProductMobileCard'
import { ProductFormModal } from './ProductFormModal'
import { ProductDetailsModal } from './ProductDetailsModal'
import { LoadingState, EmptyState, ConfirmDialog, AlertBanner } from '@/components/ui'
import { mockDataService } from '@/services/mockDataService'
import { Product, ProductFormData, ProductStatus } from '@/types'
import { Package, Plus } from 'lucide-react'

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus>('all')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Notification feedback
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
      const [prods, cats] = await Promise.all([
        mockDataService.getProducts({
          search: searchQuery,
          category: selectedCategory,
          status: selectedStatus,
        }),
        mockDataService.getCategories(),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل بيانات الأصناف'
      showNotification(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (editingProduct) {
      await mockDataService.updateProduct(editingProduct.id, formData)
      showNotification(`تم تحديث الصنف (${formData.name}) بنجاح في الذاكرة المحلية`)
    } else {
      await mockDataService.createProduct(formData)
      showNotification(`تمت إضافة الصنف الجديد (${formData.name}) بنجاح`)
    }
    await loadData()
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return
    setIsDeleting(true)
    try {
      await mockDataService.deleteProduct(deletingProduct.id)
      showNotification(`تم حذف الصنف (${deletingProduct.name}) بنجاح`, 'info')
      setDeletingProduct(null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حذف الصنف'
      showNotification(msg, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-neutral-200/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            دليل المنتجات والمخزون
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            إدارة بطاقات الأصناف، أسعار البيع، وحدات القياس، وحدود الطلب الأدنى
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <AlertBanner
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Search & Filters */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onAddNew={handleOpenAddModal}
        totalCount={products.length}
      />

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="جاري استرجاع قائمة الأصناف..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-neutral-400" />}
          title="لا توجد أصناف مطابقة"
          description={
            searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'لم يتم العثور على أية أصناف تطابق معايير البحث والفلترة المحددة.'
              : 'لم يتم تسجيل أية أصناف في المخزن حتى الآن.'
          }
          action={
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف الآن</span>
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View (md+) */}
          <div className="hidden md:block">
            <ProductsTable
              products={products}
              onView={(p) => setViewingProduct(p)}
              onEdit={handleOpenEditModal}
              onDelete={(p) => setDeletingProduct(p)}
            />
          </div>

          {/* Mobile Cards View (< md) */}
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <ProductMobileCard
                key={p.id}
                product={p}
                onView={(prod) => setViewingProduct(prod)}
                onEdit={handleOpenEditModal}
                onDelete={(prod) => setDeletingProduct(prod)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={Boolean(viewingProduct)}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
        onEdit={handleOpenEditModal}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        title="تأكيد حذف الصنف"
        message={`هل أنت متأكد من رغبتك في حذف الصنف (${deletingProduct?.name})؟ لن يؤثر هذا الإجراء على قاعدة بيانات الإنتاج.`}
        confirmText="حذف من الذاكرة"
        isLoading={isDeleting}
      />
    </div>
  )
}
