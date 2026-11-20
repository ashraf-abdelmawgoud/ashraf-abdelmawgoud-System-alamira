import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { AuditActionCategory, AuditLogFilters as FiltersType } from '@/types'
import { Button } from '@/components/ui/Button'

interface AuditLogFiltersProps {
  filters: FiltersType
  onChange: (updated: FiltersType) => void
  onReset: () => void
  onExportExcel?: () => void
  onExportJson?: () => void
  totalCount: number
  filteredCount: number
  availableUsers?: { id: string; name: string; username: string }[]
  currentUser?: unknown
}

const CATEGORY_OPTIONS: { id: AuditActionCategory; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'sales', label: 'المبيعات' },
  { id: 'customers', label: 'العملاء' },
  { id: 'suppliers', label: 'الموردين' },
  { id: 'inventory', label: 'المخزون' },
  { id: 'products', label: 'الأصناف' },
  { id: 'admin', label: 'الإدارة' },
  { id: 'security', label: 'الأمان' },
]

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onChange,
  onReset,
  totalCount,
  filteredCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value })
  }

  const handleCategoryChange = (cat: AuditActionCategory) => {
    onChange({ ...filters, category: cat })
  }

  const isFiltered = Boolean(
    (filters.search && filters.search.trim()) ||
    (filters.category && filters.category !== 'all')
  )

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-5 space-y-3.5">
      {/* 1. Single Primary Search Input */}
      <div className="relative">
        <label htmlFor="audit-filter-search" className="sr-only">
          البحث في سجل العمليات
        </label>
        <div className="relative">
          <input
            id="audit-filter-search"
            type="text"
            value={filters.search || ''}
            onChange={handleSearchChange}
            placeholder="ابحث برقم المستند، المنفّذ، السبب..."
            className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#11243A]/20 focus:border-[#11243A] transition-all placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 2. Action Category Filter Tabs & Activity Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected =
              (!filters.category && cat.id === 'all') || filters.category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${isSelected
                    ? 'bg-[#11243A] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500 shrink-0">
          <span>
            عرض <strong className="text-slate-800">{filteredCount}</strong> من أصل{' '}
            <strong className="text-slate-800">{totalCount}</strong>
          </span>
          {isFiltered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-[#11243A] hover:text-[#1E3A5F] px-2 py-1 h-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
