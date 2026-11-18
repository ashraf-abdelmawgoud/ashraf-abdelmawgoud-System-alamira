import React, { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from '@/components/ui'
import { Product, ProductFormData } from '@/types'

export interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
  product?: Product | null
  categories: string[]
}

const DEFAULT_UNITS = ['قطعة', 'لفة', 'متر', 'كرتونة', 'طقم', 'عود', 'كيس', 'كيلو']

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
}) => {
  const isEditing = Boolean(product)

  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    category: categories[0] || 'توريدات كهربائية',
    unit: 'قطعة',
    allows_decimal_quantity: false,
    purchase_price: 0,
    selling_price: 0,
    min_stock_level: 5,
    opening_quantity: 0,
    description: '',
    is_active: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || product.code || '',
        name: product.name || '',
        category: product.category || categories[0] || 'توريدات كهربائية',
        unit: product.unit || 'قطعة',
        allows_decimal_quantity: Boolean(product.allows_decimal_quantity),
        purchase_price: product.purchase_price ?? product.costPrice ?? 0,
        selling_price: product.selling_price ?? product.sellingPrice ?? 0,
        min_stock_level: product.min_stock_level ?? product.minStockLevel ?? 5,
        opening_quantity: product.current_stock ?? product.currentStock ?? 0,
        description: product.description || product.notes || '',
        is_active: product.is_active !== false,
      })
    } else {
      setFormData({
        sku: '',
        name: '',
        category: categories[0] || 'توريدات كهربائية',
        unit: 'قطعة',
        allows_decimal_quantity: false,
        purchase_price: 0,
        selling_price: 0,
        min_stock_level: 5,
        opening_quantity: 0,
        description: '',
        is_active: true,
      })
    }
    setErrors({})
  }, [product, categories, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'يرجى إدخال كود الصنف (SKU)'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم الصنف أو المنتج'
    }
    if (formData.purchase_price < 0) {
      newErrors.purchase_price = 'سعر الشراء لا يمكن أن يكون سالباً'
    }
    if (formData.selling_price < 0) {
      newErrors.selling_price = 'سعر البيع لا يمكن أن يكون سالباً'
    }
    if (formData.min_stock_level < 0) {
      newErrors.min_stock_level = 'حد الطلب الأدنى لا يمكن أن يكون سالباً'
    }
    if (!isEditing && (formData.opening_quantity === undefined || formData.opening_quantity < 0)) {
      newErrors.opening_quantity = 'الرصيد الافتتاحي لا يمكن أن يكون سالباً'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الصنف'
      setErrors((prev) => ({ ...prev, submit: msg }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزن'}
      description={
        isEditing
          ? 'تحديث بيانات التسعير والوصف ووحدة القياس للصنف المحدد'
          : 'تسجيل بطاقة صنف جديدة في دليل المخازن والتوريدات'
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'حفظ التعديلات' : 'إضافة الصنف'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        {errors.submit && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="كود الصنف (SKU) *"
            placeholder="مثال: ELC-1010"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
            error={errors.sku}
            disabled={isSubmitting}
            dir="ltr"
            className="text-left font-mono"
          />

          <Input
            label="اسم الصنف / المنتج *"
            placeholder="مثال: كابل سويدي نحاس 4 مم"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="تصنيف الصنف"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            disabled={isSubmitting}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="عام">عام / أخرى</option>
          </Select>

          <Select
            label="وحدة القياس"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            disabled={isSubmitting}
          >
            {DEFAULT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>

        {/* Pricing Fields */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
          <h4 className="text-xs font-bold text-neutral-800">بيانات الأسعار وهوامش الربح</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              step="any"
              min="0"
              label="سعر البيع الافتراضي (ج.م) *"
              placeholder="0.00"
              value={formData.selling_price}
              onChange={(e) =>
                setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })
              }
              error={errors.selling_price}
              disabled={isSubmitting}
              helperText="السعر المعتمد في فواتير المبيعات"
            />

            <Input
              type="number"
              step="any"
              min="0"
              label="سعر الشراء / التكلفة (ج.م)"
              placeholder="0.00"
              value={formData.purchase_price}
              onChange={(e) =>
                setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })
              }
              error={errors.purchase_price}
              disabled={isSubmitting}
              helperText="متوسط تكلفة الشراء من المورد"
            />
          </div>
        </div>

        {/* Stock Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            min="0"
            label="حد الطلب الأدنى للتنبيه"
            value={formData.min_stock_level}
            onChange={(e) =>
              setFormData({ ...formData, min_stock_level: parseInt(e.target.value, 10) || 0 })
            }
            error={errors.min_stock_level}
            disabled={isSubmitting}
            helperText="تنبيه النظام عند هبوط الرصيد لهذا الحد"
          />

          {!isEditing && (
            <Input
              type="number"
              step={formData.allows_decimal_quantity ? 'any' : '1'}
              min="0"
              label="الرصيد الافتتاحي بالمخزن"
              value={formData.opening_quantity}
              onChange={(e) =>
                setFormData({ ...formData, opening_quantity: parseFloat(e.target.value) || 0 })
              }
              error={errors.opening_quantity}
              disabled={isSubmitting}
              helperText="الكمية المتوفرة حالياً عند تأسيس الصنف"
            />
          )}
        </div>

        {/* Description / Notes */}
        <Input
          label="المواصفات الفنية أو الملاحظات"
          placeholder="أدخل أية تفاصيل إضافية عن المنشأ أو الضمان..."
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isSubmitting}
        />

        {/* Options */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={formData.allows_decimal_quantity}
              onChange={(e) =>
                setFormData({ ...formData, allows_decimal_quantity: e.target.checked })
              }
              className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>يقبل كسور عشرية (مثل الأمتار أو الكيلوجرامات)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>صنف نشط ومتاح في الفواتير</span>
          </label>
        </div>
      </form>
    </Modal>
  )
}
