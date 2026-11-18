import React from 'react'
import { Search } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { formatNumber } from '@/lib/formatters'
import { InvoiceStatus } from '@/types'

interface InvoiceFiltersProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  statusFilter: InvoiceStatus | 'all'
  onStatusFilterChange: (status: InvoiceStatus | 'all') => void
  counts: {
    all: number
    approved: number
    draft: number
    cancelled: number
  }
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
}) => {
  const filterPills: { id: InvoiceStatus | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'كافة الفواتير', count: counts.all },
    { id: 'approved', label: 'المعتمدة', count: counts.approved },
    { id: 'draft', label: 'المسودات', count: counts.draft },
    { id: 'cancelled', label: 'الملغاة', count: counts.cancelled },
  ]

  return (
    <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Input
            placeholder="بحث برقم الفاتورة، اسم العميل، الهاتف..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {filterPills.map((pill) => {
            const isActive = statusFilter === pill.id
            return (
              <Button
                key={pill.id}
                type="button"
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onStatusFilterChange(pill.id)}
                className={`text-xs px-3 py-1.5 h-auto rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50 border-neutral-300'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold mr-1 ${
                    isActive
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {formatNumber(pill.count)}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
