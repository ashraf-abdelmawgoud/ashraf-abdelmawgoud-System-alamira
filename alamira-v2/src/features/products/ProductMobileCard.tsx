import React from 'react'
import { Badge, Button } from '@/components/ui'
import { Product } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Trash2 } from 'lucide-react'
import { useAuth } from '@/auth'

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
  const { canViewCostPrice, canViewExactStock, hasPermission } = useAuth()
  const canManage = hasPermission('products:manage')
  const stock = product.current_stock ?? product.currentStock ?? 0
  const min = product.min_stock_level ?? product.minStockLevel ?? 5
  const sellingPrice = product.selling_price ?? product.sellingPrice ?? 0
  const purchasePrice = product.purchase_price ?? product.costPrice ?? 0

  const getStockBadge = () => {
    if (stock <= 0) {
      return (
        <Badge variant="danger" size="sm" dot>
          {canViewExactStock ? 'نفد من المخزن' : 'غير متوفر'}
        </Badge>
      )
    }
    if (stock <= min) {
      return (
        <Badge variant="warning" size="sm" dot>
          {canViewExactStock
            ? `منخفض (${formatNumber(stock)} ${product.unit})`
            : 'رصيد منخفض'}
        </Badge>
      )
    }
    return (
      <Badge variant="emerald" size="sm" dot>
        {canViewExactStock
          ? `${formatNumber(stock)} ${product.unit}`
          : 'متوفر'}
      </Badge>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5 shadow-xs space-y-3 text-right">
      {/* Header: SKU, Category & Stock Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {product.sku || product.code}
            </span>
            <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
              {product.category}
            </span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {product.unit || 'وحدة'}
            </span>
          </div>
          <h4 className="font-bold text-sm text-neutral-900 mt-1 leading-snug line-clamp-2">
            {product.name}
          </h4>
        </div>
        <div className="shrink-0">{getStockBadge()}</div>
      </div>

      {/* Pricing & Stock Grid */}
      <div className={`grid ${canViewCostPrice ? 'grid-cols-2' : 'grid-cols-1'} gap-2 p-2.5 rounded-lg bg-neutral-50/70 border border-neutral-100 text-xs`}>
        <div>
          <span className="text-neutral-500 block text-[11px]">سعر البيع المعتمد</span>
          <span className="font-extrabold text-sm text-emerald-700">
            {formatCurrency(sellingPrice)}
          </span>
        </div>
        {canViewCostPrice && (
          <div>
            <span className="text-neutral-500 block text-[11px]">التكلفة التقريبية</span>
            <span className="font-semibold text-neutral-700">
              {formatCurrency(purchasePrice)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(product)}
            className="text-xs h-7.5 px-2.5 text-[#11243A] border-[#D9E2EC] hover:bg-slate-50"
          >
            تفاصيل
          </Button>
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(product)}
              className="text-xs h-7.5 px-2.5 text-[#64748B] hover:text-[#11243A]"
            >
              تعديل
            </Button>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => onDelete(product)}
            className="action-btn-pill action-btn-pill-danger"
            aria-label={`حذف ${product.name}`}
            title="حذف الصنف"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
          </button>
        )}
      </div>
    </div>
  )
}
