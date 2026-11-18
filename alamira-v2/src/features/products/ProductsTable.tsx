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
import { Product } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Eye, Edit3, Trash2 } from 'lucide-react'

export interface ProductsTableProps {
  products: Product[]
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onView,
  onEdit,
  onDelete,
}) => {
  const getStockBadge = (prod: Product) => {
    const stock = prod.current_stock ?? prod.currentStock ?? 0
    const min = prod.min_stock_level ?? prod.minStockLevel ?? 5

    if (stock <= 0) {
      return (
        <Badge variant="danger" size="sm" dot>
          نفد (0)
        </Badge>
      )
    }
    if (stock <= min) {
      return (
        <Badge variant="warning" size="sm" dot>
          منخفض ({formatNumber(stock)})
        </Badge>
      )
    }
    return (
      <Badge variant="emerald" size="sm" dot>
        {formatNumber(stock)} {prod.unit}
      </Badge>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>كود الصنف (SKU)</TableHead>
            <TableHead>اسم الصنف</TableHead>
            <TableHead>التصنيف</TableHead>
            <TableHead>سعر البيع</TableHead>
            <TableHead>سعر التكلفة</TableHead>
            <TableHead>رصيد المخزن</TableHead>
            <TableHead className="text-center w-28">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((prod) => (
            <TableRow key={prod.id}>
              <TableCell className="font-mono text-xs font-semibold">
                <span className="inv-number-badge">
                  {prod.sku || prod.code}
                </span>
              </TableCell>

              <TableCell className="font-semibold text-[#11243A] max-w-xs truncate">
                {prod.name}
              </TableCell>

              <TableCell className="text-xs text-[#64748B]">
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  {prod.category}
                </span>
              </TableCell>

              <TableCell className="font-semibold text-[#11243A] tabular-nums">
                {formatCurrency(prod.selling_price ?? prod.sellingPrice ?? 0)}
              </TableCell>

              <TableCell className="text-xs text-[#64748B] tabular-nums">
                {formatCurrency(prod.purchase_price ?? prod.costPrice ?? 0)}
              </TableCell>

              <TableCell>{getStockBadge(prod)}</TableCell>

              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(prod)}
                    className="action-btn-pill"
                    aria-label={`عرض تفاصيل ${prod.name}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(prod)}
                    className="action-btn-pill"
                    aria-label={`تعديل ${prod.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#0284C7]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(prod)}
                    className="action-btn-pill"
                    aria-label={`حذف ${prod.name}`}
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
