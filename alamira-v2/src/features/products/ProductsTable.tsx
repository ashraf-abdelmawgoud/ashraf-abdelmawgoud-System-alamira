import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from '@/components/ui'
import { Product } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Eye, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth'

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
  const { canViewCostPrice, canViewExactStock, hasPermission } = useAuth()
  const canManageProducts = hasPermission('products:manage')

  const getStockBadge = (prod: Product) => {
    const stock = prod.current_stock ?? prod.currentStock ?? 0
    const min = prod.min_stock_level ?? prod.minStockLevel ?? 5

    if (stock <= 0) {
      return (
        <Badge variant="danger" size="sm" dot>
          {canViewExactStock ? 'نفد (0)' : 'غير متوفر'}
        </Badge>
      )
    }
    if (stock <= min) {
      return (
        <Badge variant="warning" size="sm" dot>
          {canViewExactStock ? `منخفض (${formatNumber(stock)} ${prod.unit})` : 'رصيد منخفض'}
        </Badge>
      )
    }
    return (
      <Badge variant="emerald" size="sm" dot>
        {canViewExactStock ? `${formatNumber(stock)} ${prod.unit}` : 'متوفر'}
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
            <TableHead className="text-center w-24">الوحدة</TableHead>
            <TableHead>سعر البيع</TableHead>
            {canViewCostPrice && <TableHead>سعر التكلفة</TableHead>}
            <TableHead>رصيد المخزن</TableHead>
            <TableHead className="text-center w-28">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((prod) => (
            <TableRow key={prod.id}>
              <TableCell className="text-xs font-semibold">
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

              <TableCell className="text-center">
                <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold">
                  {prod.unit || 'وحدة'}
                </span>
              </TableCell>

              <TableCell className="font-semibold text-[#11243A] tabular-nums">
                {formatCurrency(prod.selling_price ?? prod.sellingPrice ?? 0)}
              </TableCell>

              {canViewCostPrice && (
                <TableCell className="text-xs text-[#64748B] tabular-nums">
                  {formatCurrency(prod.purchase_price ?? prod.costPrice ?? 0)}
                </TableCell>
              )}

              <TableCell>{getStockBadge(prod)}</TableCell>

              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onView(prod)}
                    className="action-btn-pill"
                    title={`عرض تفاصيل ${prod.name}`}
                    aria-label={`عرض تفاصيل ${prod.name}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#11243A]" />
                  </button>
                  {canManageProducts && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(prod)}
                        className="action-btn-pill action-btn-pill-muted"
                        title={`تعديل ${prod.name}`}
                        aria-label={`تعديل ${prod.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(prod)}
                        className="action-btn-pill action-btn-pill-danger"
                        title={`حذف ${prod.name}`}
                        aria-label={`حذف ${prod.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                      </button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
