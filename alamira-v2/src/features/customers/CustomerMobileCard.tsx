import React from 'react'
import { Badge, Button } from '@/components/ui'
import { Customer } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Trash2, Phone, MapPin } from 'lucide-react'

export interface CustomerMobileCardProps {
  customer: Customer
  onView: (customer: Customer) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export const CustomerMobileCard: React.FC<CustomerMobileCardProps> = ({
  customer,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5 shadow-xs space-y-3 text-right">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-neutral-900 leading-snug truncate">
            {customer.name}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">{customer.address || customer.city || 'قنا'}</span>
          </div>
        </div>
        <Badge variant={customer.is_active ? 'emerald' : 'neutral'} size="sm" dot className="shrink-0">
          {customer.is_active ? 'نشط' : 'معلق'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-neutral-50/70 border border-neutral-100 text-xs">
        <div>
          <span className="text-neutral-500 block text-[11px]">المديونية الحالية</span>
          <span
            className={`font-extrabold text-sm ${
              customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatCurrency(customer.balance)}
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[11px]">الفواتير</span>
          <span className="font-semibold text-neutral-700">
            {formatNumber(customer.invoices_count || 0)} فاتورة
          </span>
        </div>
      </div>

      {/* Phone & Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
        <div>
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              dir="ltr"
            >
              <Phone className="w-3 h-3 text-neutral-400" />
              <span>{customer.phone}</span>
            </a>
          ) : (
            <span className="text-xs text-neutral-400">بدون هاتف</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(customer)}
            className="text-xs h-8 px-2.5"
          >
            تفاصيل
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(customer)}
            className="text-xs h-8 px-2.5"
          >
            تعديل
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(customer)}
            className="text-xs h-8 px-2 text-neutral-400 hover:text-rose-600"
            aria-label="حذف العميل"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
