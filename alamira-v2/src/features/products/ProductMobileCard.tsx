import React from 'react'
import { Badge, Button } from '@/components/ui'
import { Product } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Eye, Edit3, Trash2 } from 'lucide-react'

export interface ProductMobileCardProps {
  product: Product
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export const ProductMobileCard: React.FC<ProductMobileCardProps> = ({
  product,
  onView,
  onEdit,
  onDelete,
}) => {
  const stock = product.current_stock ?? product.currentStock ?? 0
  const min = product.min_stock_level ?? product.minStockLevel ?? 5
  const sellingPrice = product.selling_price ?? product.sellingPrice ?? 0
  const purchasePrice = product.purchase_price ?? product.costPrice ?? 0

  const getStockBadge = () => {
    if (stock <= 0) {
      return (
        <Badge variant="danger" size="sm" dot>
          نفد من المخزن
        </Badge>
      )
    }
    if (stock <= min) {
      return (
        <Badge variant="warning" size="sm" dot>
          منخفض ({formatNumber(stock)} {product.unit})
        </Badge>
      )
    }
    return (
      <Badge variant="emerald" size="sm" dot>
        {formatNumber(stock)} {product.unit}
      </Badge>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5 shadow-xs space-y-3 text-right">
      {/* Header: SKU, Category & Stock Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {product.sku || product.code}
            </span>
            <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
              {product.category}
            </span>
          </div>
          <h4 className="font-bold text-sm text-neutral-900 mt-1 leading-snug line-clamp-2">
            {product.name}
          </h4>
        </div>
        <div className="shrink-0">{getStockBadge()}</div>
      </div>

      {/* Pricing & Stock Grid */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-neutral-50/70 border border-neutral-100 text-xs">
        <div>
          <span className="text-neutral-500 block text-[11px]">سعر البيع</span>
          <span className="font-extrabold text-sm text-emerald-700">
            {formatCurrency(sellingPrice)}
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[11px]">التكلفة التقريبية</span>
          <span className="font-semibold text-neutral-700">
            {formatCurrency(purchasePrice)}
          </span>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(product)}
            startIcon={<Eye className="w-3.5 h-3.5" />}
            className="text-xs h-8 px-2.5"
          >
            تفاصيل
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(product)}
            startIcon={<Edit3 className="w-3.5 h-3.5" />}
            className="text-xs h-8 px-2.5"
          >
            تعديل
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(product)}
          className="text-xs h-8 px-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
          aria-label="حذف الصنف"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
