import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
} from '@/components/ui'
import { Customer } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Eye, Edit3, Trash2, Phone } from 'lucide-react'

export interface CustomersTableProps {
  customers: Customer[]
  onView: (customer: Customer) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export const CustomersTable: React.FC<CustomersTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم العميل / الجهة</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المقر / العنوان</TableHead>
            <TableHead>عدد الفواتير</TableHead>
            <TableHead>المديونية الحالية</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="text-center w-28">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-semibold text-[#11243A]">
                {c.name}
              </TableCell>

              <TableCell className="text-xs">
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="text-[#0F766E] hover:underline flex items-center gap-1 font-mono"
                    dir="ltr"
                  >
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{c.phone}</span>
                  </a>
                ) : (
                  <span className="text-slate-400">--</span>
                )}
              </TableCell>

              <TableCell className="text-xs text-[#64748B] max-w-xs truncate">
                {c.address || c.city || 'قنا'}
              </TableCell>

              <TableCell className="text-xs font-medium text-[#11243A] tabular-nums">
                {formatNumber(c.invoices_count || 0)} فاتورة
              </TableCell>

              <TableCell className="font-semibold tabular-nums">
                <span className={c.balance > 0 ? 'text-[#DC2626]' : 'text-[#0F766E]'}>
                  {formatCurrency(c.balance)}
                </span>
              </TableCell>

              <TableCell>
                <Badge variant={c.is_active ? 'emerald' : 'neutral'} size="sm" dot>
                  {c.is_active ? 'نشط' : 'معلق'}
                </Badge>
              </TableCell>

              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(c)}
                    className="action-btn-pill"
                    aria-label={`عرض تفاصيل ${c.name}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(c)}
                    className="action-btn-pill"
                    aria-label={`تعديل ${c.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#0284C7]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(c)}
                    className="action-btn-pill"
                    aria-label={`حذف ${c.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
