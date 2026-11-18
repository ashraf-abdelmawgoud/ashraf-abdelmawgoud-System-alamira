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
import { Supplier } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Eye, Edit3, Trash2, Phone } from 'lucide-react'

export interface SuppliersTableProps {
  suppliers: Supplier[]
  onView: (supplier: Supplier) => void
  onEdit: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({
  suppliers,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المورد / المصنع</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>المقر الرئيسي</TableHead>
            <TableHead>أذون التوريد</TableHead>
            <TableHead>المستحقات الحالية</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="text-center w-28">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-semibold text-[#11243A]">
                {s.name}
              </TableCell>

              <TableCell className="text-xs">
                {s.phone ? (
                  <a
                    href={`tel:${s.phone}`}
                    className="text-[#0F766E] hover:underline flex items-center gap-1 font-mono"
                    dir="ltr"
                  >
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{s.phone}</span>
                  </a>
                ) : (
                  <span className="text-slate-400">--</span>
                )}
              </TableCell>

              <TableCell className="text-xs text-[#64748B] max-w-xs truncate">
                {s.address || s.city || 'القاهرة'}
              </TableCell>

              <TableCell className="text-xs font-medium text-[#11243A] tabular-nums">
                {formatNumber(s.receipts_count || 0)} إذن
              </TableCell>

              <TableCell className="font-semibold text-amber-700 tabular-nums">
                {formatCurrency(s.balance)}
              </TableCell>

              <TableCell>
                <Badge variant={s.is_active ? 'emerald' : 'neutral'} size="sm" dot>
                  {s.is_active ? 'نشط' : 'معلق'}
                </Badge>
              </TableCell>

              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(s)}
                    className="action-btn-pill"
                    aria-label={`عرض تفاصيل ${s.name}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(s)}
                    className="action-btn-pill"
                    aria-label={`تعديل ${s.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#0284C7]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(s)}
                    className="action-btn-pill"
                    aria-label={`حذف ${s.name}`}
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
