import React from 'react'
import { Input, Select, Button } from '@/components/ui'
import { ProductStatus } from '@/types'
import { Search, X } from 'lucide-react'
import { useAuth } from '@/auth'

export interface ProductFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  categories: string[]
  selectedStatus: ProductStatus
  onStatusChange: (status: ProductStatus) => void
  onAddNew: () => void
  totalCount: number
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  selectedStatus,
  onStatusChange,
  onAddNew,
  totalCount,
}) => {
  const { hasPermission } = useAuth()
  const canCreateProduct = hasPermission('products:create') || hasPermission('products:manage')
  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedStatus !== 'all'

  const handleClearFilters = () => {
    onSearchChange('')
    onCategoryChange('all')
    onStatusChange('all')
  }

  return (
    <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200/80 shadow-xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder="بحث بالاسم، كود الصنف (SKU)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            startIcon={<Search className="w-4 h-4" />}
            endIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="hover:text-neutral-700"
                  aria-label="مسح نص البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Quick Add Button */}
        {canCreateProduct && (
          <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2">
            <Button
              variant="primary"
              onClick={onAddNew}
              className="w-full sm:w-auto"
            >
              إضافة صنف جديد
            </Button>
          </div>
        )}
      </div>

      {/* Filter Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 border-t border-neutral-100">
        <Select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="تصفية حسب التصنيف"
        >
          <option value="all">جميع التصنيفات ({categories.length})</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>

        <Select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as ProductStatus)}
          aria-label="تصفية حسب حالة المخزون"
        >
          <option value="all">جميع الحالات</option>
          <option value="in_stock">متوفر بالمخزن</option>
          <option value="low_stock">نواقص / رصيد منخفض</option>
          <option value="out_of_stock">رصيد نافد (صفر)</option>
        </Select>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-neutral-500 py-1">
          <span>النتائج: <strong className="text-neutral-900">{totalCount}</strong> صنف</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[#0F766E] hover:text-[#115E59] font-bold transition-colors cursor-pointer"
            >
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
