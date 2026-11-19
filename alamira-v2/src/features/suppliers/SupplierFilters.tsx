import React from 'react'
import { Input, Select, Button } from '@/components/ui'
import { Search, X } from 'lucide-react'

export interface SupplierFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedStatus: 'all' | 'active' | 'inactive'
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void
  onAddNew: () => void
  totalCount: number
}

export const SupplierFilters: React.FC<SupplierFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onAddNew,
  totalCount,
}) => {
  const hasActiveFilters = searchQuery !== '' || selectedStatus !== 'all'

  return (
    <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 min-w-0">
          <Input
            placeholder="بحث باسم المورد، الهاتف، المقر..."
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

        {/* Add New Supplier */}
        <Button
          variant="primary"
          onClick={onAddNew}
          className="shrink-0"
        >
          إضافة مورد جديد
        </Button>
      </div>

      {/* Filter Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1 border-t border-neutral-100">
        <div className="w-full sm:w-56">
          <Select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as 'all' | 'active' | 'inactive')}
            aria-label="تصفية حسب حالة المورد"
          >
            <option value="all">جميع الموردين</option>
            <option value="active">الموردون النشطون فقط</option>
            <option value="inactive">الموردون المعلقون</option>
          </Select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-neutral-500 w-full sm:w-auto">
          <span>النتائج: <strong className="text-neutral-900">{totalCount}</strong> مورد</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('')
                onStatusChange('all')
              }}
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
