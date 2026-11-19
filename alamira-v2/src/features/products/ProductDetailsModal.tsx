import React from 'react'
import { Modal, Button, Badge } from '@/components/ui'
import { Product } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { DollarSign, Boxes, FileText } from 'lucide-react'
import { useAuth } from '@/auth'

export interface ProductDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onEdit: (product: Product) => void
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
}) => {
  const { canViewCostPrice, canViewExactStock, hasPermission } = useAuth()
  const canManage = hasPermission('products:manage')

  if (!product) return null

  const sellingPrice = product.selling_price ?? product.sellingPrice ?? 0
  const purchasePrice = product.purchase_price ?? product.costPrice ?? 0
  const currentStock = product.current_stock ?? product.currentStock ?? 0
  const minStock = product.min_stock_level ?? product.minStockLevel ?? 5
  const profitMargin = sellingPrice - purchasePrice
  const profitPercent = purchasePrice > 0 ? Math.round((profitMargin / purchasePrice) * 100) : 0

  const getStockBadge = () => {
    if (currentStock <= 0) {
      return (
        <Badge variant="danger" dot>
          {canViewExactStock ? 'نفد من المخزن (0)' : 'غير متوفر'}
        </Badge>
      )
    }
    if (currentStock <= minStock) {
      return (
        <Badge variant="warning" dot>
          {canViewExactStock
            ? `رصيد منخفض (${formatNumber(currentStock)} ${product.unit})`
            : 'رصيد منخفض'}
        </Badge>
      )
    }
    return (
      <Badge variant="emerald" dot>
        {canViewExactStock
          ? `متوفر (${formatNumber(currentStock)} ${product.unit})`
          : 'متوفر'}
      </Badge>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="بطاقة بيانات الصنف"
      description={`كود الصنف: ${product.sku || product.code}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onEdit(product)
              }}
            >
              تعديل الصنف
            </Button>
          ) : (
            <div />
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 text-right">
        {/* Main Title & Status */}
        <div className="flex items-start justify-between gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
          <div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {product.sku || product.code}
            </span>
            <h3 className="font-extrabold text-base text-neutral-900 mt-1.5">{product.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">التصنيف: {product.category}</p>
          </div>
          <div className="shrink-0">{getStockBadge()}</div>
        </div>

        {/* Pricing Breakdown */}
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3">
          <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>بيانات التسعير{canViewCostPrice ? ' والربحية' : ''}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-2.5 bg-neutral-50 rounded-lg">
              <span className="text-[11px] text-neutral-500 block">سعر البيع المعتمد</span>
              <span className="font-extrabold text-base text-emerald-700">
                {formatCurrency(sellingPrice)}
              </span>
            </div>

            {canViewCostPrice && (
              <>
                <div className="p-2.5 bg-neutral-50 rounded-lg">
                  <span className="text-[11px] text-neutral-500 block">سعر الشراء / التكلفة</span>
                  <span className="font-bold text-base text-neutral-700">
                    {formatCurrency(purchasePrice)}
                  </span>
                </div>

                <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 block">هامش الربح التقديري</span>
                  <span className="font-bold text-sm text-emerald-900">
                    {formatCurrency(profitMargin)} ({profitPercent > 0 ? `+${profitPercent}%` : '0%'})
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stock & Unit Specs */}
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3">
          <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-[#0F766E]" />
            <span>حالة المخزون والمواصفات</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-neutral-500">وحدة التعامل:</span>
              <span className="font-semibold text-neutral-800 mr-1.5">{product.unit}</span>
            </div>
            <div>
              <span className="text-neutral-500">كسور الكميات:</span>
              <span className="font-semibold text-neutral-800 mr-1.5">
                {product.allows_decimal_quantity ? 'نعم (كميات كسرية)' : 'لا (أعداد صحيحة فقط)'}
              </span>
            </div>
            {canViewExactStock ? (
              <>
                <div>
                  <span className="text-neutral-500">الرصيد الفعلي الحالي:</span>
                  <span className="font-bold text-neutral-900 mr-1.5">
                    {formatNumber(currentStock)} {product.unit}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">حد الطلب الأدنى للتنبيه:</span>
                  <span className="font-bold text-amber-700 mr-1.5">
                    {formatNumber(minStock)} {product.unit}
                  </span>
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <span className="text-neutral-500">حالة التوفر بالمخزن:</span>
                <span className="font-bold text-emerald-700 mr-1.5">
                  {currentStock <= 0 ? 'غير متوفر حالياً' : currentStock <= minStock ? 'رصيد منخفض' : 'متوفر للطلب والبيع'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description / Notes */}
        {(product.description || product.notes) && (
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>ملاحظات ومواصفات الصنف</span>
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {product.description || product.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
