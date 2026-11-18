import React, { useState } from 'react'
import { AlertCircle, Scale } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { formatNumber } from '@/lib/formatters'
import { Product, StockAdjustmentFormData } from '@/types'

interface AdjustmentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: StockAdjustmentFormData) => Promise<void>
  products: Product[]
}

export const AdjustmentFormModal: React.FC<AdjustmentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [adjustmentDate, setAdjustmentDate] = useState(todayStr)
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [actualQuantity, setActualQuantity] = useState<number>(
    products[0] ? products[0].current_stock : 0
  )
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const activeProducts = products.filter((p) => p.is_active)
  const selectedProduct = products.find((p) => p.id === productId)
  const allowsDec = Boolean(selectedProduct?.allows_decimal_quantity)
  const recordedQuantity = selectedProduct ? selectedProduct.current_stock : 0
  const difference = Math.round((Number(actualQuantity || 0) - recordedQuantity) * 1000) / 1000

  const handleProductChange = (newId: string) => {
    setProductId(newId)
    const p = products.find((prod) => prod.id === newId)
    if (p) {
      setActualQuantity(p.current_stock)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!productId) {
      setFormError('يرجى اختيار الصنف المطلوب تسويته')
      return
    }

    const cleanReason = reason.trim()
    if (!cleanReason) {
      setFormError('يرجى تدوين سبب التسوية الجردية وتوثيق المحضر')
      return
    }

    if (isNaN(actualQuantity) || actualQuantity < 0) {
      setFormError('الكمية الفعلية المحصورة بالجرد لا يمكن أن تكون سالبة')
      return
    }

    if (selectedProduct && !selectedProduct.allows_decimal_quantity && actualQuantity % 1 !== 0) {
      setFormError(
        `الصنف "${selectedProduct.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية`
      )
      return
    }

    setLoading(true)
    try {
      await onSave({
        adjustment_date: adjustmentDate,
        product_id: productId,
        actual_quantity: Number(actualQuantity),
        reason: cleanReason,
      })
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'فشل تنفيذ تسوية الجرد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسوية جرد مخزني فعلي (إثبات عجز أو زيادة)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <Scale className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            تُعتمد التسوية الجردية فورياً لإعادة ضبط رصيد المستودع الفعلي، مع تسجيل حركة تسوية في
            سجل الحركات المعصوم لحفظ الأمان المحاسبي والرقابي.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            تاريخ محضر الجرد <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={adjustmentDate}
            onChange={(e) => setAdjustmentDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            الصنف المراد تسويته <span className="text-red-500">*</span>
          </label>
          <select
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            required
          >
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantities Comparison Box */}
        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-center">
          <div>
            <span className="text-[11px] text-gray-500 block mb-1">الرصيد الدفتري الحالي</span>
            <span className="text-base font-bold text-gray-900">
              {formatNumber(recordedQuantity)} {selectedProduct?.unit}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-gray-700 font-bold block mb-1">الرصيد الفعلي بالجرد</span>
            <input
              type="number"
              inputMode="decimal"
              step={allowsDec ? '0.001' : '1'}
              min="0"
              value={actualQuantity}
              onChange={(e) => setActualQuantity(parseFloat(e.target.value))}
              className="w-full p-1.5 border border-indigo-300 bg-white rounded-lg text-sm text-center font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <span className="text-[11px] text-gray-500 block mb-1">الفارق الناتج</span>
            <span
              className={`text-base font-black ${
                difference > 0
                  ? 'text-emerald-700'
                  : difference < 0
                  ? 'text-red-700'
                  : 'text-gray-600'
              }`}
            >
              {difference > 0 ? `+${formatNumber(difference)}` : formatNumber(difference)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            سبب التسوية وتفاصيل المحضر <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: جرد سنوي، هالك تخزين ونقل، تصحيح خطأ إدخال سابق..."
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="bg-indigo-700 hover:bg-indigo-800"
          >
            {loading ? 'جاري الاعتماد...' : 'اعتماد تسوية الرصيد فوراً'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
