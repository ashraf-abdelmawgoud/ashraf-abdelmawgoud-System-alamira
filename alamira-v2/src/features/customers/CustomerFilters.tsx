import React from 'react'
import { Input, Select, Button } from '@/components/ui'
import { Search, Plus, Filter, X } from 'lucide-react'

export interface CustomerFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedStatus: 'all' | 'active' | 'inactive'
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void
  onAddNew: () => void
  totalCount: number
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
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
            placeholder="بحث باسم العميل، الهاتف، العنوان..."
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

        {/* Add New Customer */}
        <Button
          variant="primary"
          onClick={onAddNew}
          startIcon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          إضافة عميل جديد
        </Button>
      </div>

      {/* Filter Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1 border-t border-neutral-100">
        <div className="w-full sm:w-56">
          <Select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as 'all' | 'active' | 'inactive')}
            aria-label="تصفية حسب حالة العميل"
          >
            <option value="all">جميع العملاء</option>
            <option value="active">العملاء النشطون فقط</option>
            <option value="inactive">العملاء المعلقون</option>
          </Select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-neutral-500 w-full sm:w-auto">
          <span>النتائج: <strong className="text-neutral-900">{totalCount}</strong> عميل</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('')
                onStatusChange('all')
              }}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <Filter className="w-3 h-3" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
