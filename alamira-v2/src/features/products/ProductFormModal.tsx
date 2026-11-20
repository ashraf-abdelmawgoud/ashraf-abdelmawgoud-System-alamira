import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Modal, Button, Input, Select } from '@/components/ui'
import { Product, ProductFormData } from '@/types'
import { useAuth } from '@/auth'
import {
  PREDEFINED_UNITS,
  CUSTOM_UNIT_ACTION_VALUE,
  CUSTOM_UNIT_ACTION_LABEL,
  getCustomUnits,
  addCustomUnit,
} from '@/services/measurementUnitsService'

export interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
  product?: Product | null
  categories: string[]
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
}) => {
  const { canViewCostPrice } = useAuth()
  const canViewCost = canViewCostPrice
  const isEditing = Boolean(product)

  const [customUnits, setCustomUnits] = useState<string[]>(() => getCustomUnits())
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customUnitInput, setCustomUnitInput] = useState('')
  const [customUnitError, setCustomUnitError] = useState('')

  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    category: categories[0] || 'عام',
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
        category: product.category || categories[0] || 'عام',
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
        category: categories[0] || 'عام',
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
    setCustomUnits(getCustomUnits())
    setIsCustomMode(false)
    setCustomUnitInput('')
    setCustomUnitError('')
    setErrors({})
  }, [product, categories, isOpen])

  const handleSaveCustomUnit = () => {
    const trimmed = customUnitInput.trim()
    if (!trimmed) {
      setCustomUnitError('يرجى كتابة اسم وحدة القياس')
      return
    }
    const res = addCustomUnit(trimmed)
    if (!res.success) {
      setCustomUnitError(res.error || 'تعذر إضافة وحدة القياس')
      return
    }
    const updated = getCustomUnits()
    setCustomUnits(updated)
    setFormData((prev) => ({ ...prev, unit: res.unit || trimmed }))
    setIsCustomMode(false)
    setCustomUnitInput('')
    setCustomUnitError('')
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'يرجى إدخال كود الصنف (SKU)'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم الصنف أو المنتج'
    }
    if (canViewCost && formData.purchase_price < 0) {
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
      const sanitizedData: ProductFormData = {
        ...formData,
        purchase_price: canViewCost ? formData.purchase_price : 0,
        opening_quantity: !isEditing ? Number(formData.opening_quantity || 0) : formData.opening_quantity,
      }
      await onSave(sanitizedData)
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
            className="text-left tabular-nums font-semibold"
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

          <div className="space-y-1.5 text-right">
            <Select
              label="وحدة القياس *"
              value={isCustomMode ? CUSTOM_UNIT_ACTION_VALUE : formData.unit}
              onChange={(e) => {
                const val = e.target.value
                if (val === CUSTOM_UNIT_ACTION_VALUE) {
                  setIsCustomMode(true)
                  setCustomUnitInput('')
                  setCustomUnitError('')
                } else {
                  setIsCustomMode(false)
                  setCustomUnitError('')
                  setFormData({ ...formData, unit: val })
                }
              }}
              disabled={isSubmitting}
            >
              <optgroup label="الوحدات المعتمدة الافتراضية">
                {PREDEFINED_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </optgroup>

              {customUnits.length > 0 && (
                <optgroup label="وحدات مخصصة مسجلة">
                  {customUnits.map((u) => (
                    <option key={u} value={u}>
                      {u} (مخصصة)
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Preserve existing/unknown product unit if not in predefined or custom */}
              {formData.unit &&
                !(PREDEFINED_UNITS as readonly string[]).includes(formData.unit) &&
                !customUnits.includes(formData.unit) && (
                  <optgroup label="الوحدة الحالية للصنف">
                    <option value={formData.unit}>
                      {formData.unit}
                    </option>
                  </optgroup>
                )}

              <optgroup label="خيارات إضافية">
                <option value={CUSTOM_UNIT_ACTION_VALUE}>
                  {CUSTOM_UNIT_ACTION_LABEL}
                </option>
              </optgroup>
            </Select>

            {isCustomMode && (
              <div className="p-3 bg-teal-50/90 border border-teal-300 rounded-xl space-y-2 mt-2 shadow-xs transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-teal-700" />
                    <span>إدخال اسم وحدة القياس المخصصة</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false)
                      setCustomUnitInput('')
                      setCustomUnitError('')
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-700 underline"
                  >
                    إلغاء والعودة
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUnitInput}
                    onChange={(e) => {
                      setCustomUnitInput(e.target.value)
                      setCustomUnitError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveCustomUnit()
                      }
                    }}
                    placeholder="مثال: شيكارة، درزن، جالون، Box..."
                    className="flex-1 p-2 text-xs border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-neutral-900 font-semibold"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={handleSaveCustomUnit}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs px-3 py-1.5 shrink-0"
                  >
                    تأكيد وإضافة
                  </Button>
                </div>
                {customUnitError && (
                  <p className="text-[11px] text-rose-600 font-bold">{customUnitError}</p>
                )}
                <p className="text-[10.5pt] sm:text-[11px] text-teal-900/80 leading-relaxed">
                  سيتم حفظ هذه الوحدة وربطها بالصنف الحالي وإتاحتها للاستخدام في كافة أقسام النظام.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Fields */}
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
          <h4 className="text-xs font-bold text-neutral-800">بيانات الأسعار</h4>
          <div className={`grid grid-cols-1 ${canViewCost ? 'sm:grid-cols-2' : ''} gap-4`}>
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

            {canViewCost && (
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
            )}
          </div>
        </div>

        {/* Stock Thresholds */}
        <div className={`grid grid-cols-1 ${!isEditing ? 'sm:grid-cols-2' : ''} gap-4`}>
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
            helperText="الحد الأدنى الذي يظهر عنده تحذير الرصيد المنخفض"
          />

          {!isEditing && (
            <Input
              type="number"
              step={formData.allows_decimal_quantity ? '0.001' : '1'}
              min="0"
              label="الرصيد الافتتاحي بالمخزن"
              placeholder="0"
              value={formData.opening_quantity}
              onChange={(e) =>
                setFormData({ ...formData, opening_quantity: parseFloat(e.target.value) || 0 })
              }
              error={errors.opening_quantity}
              disabled={isSubmitting}
              helperText="الكمية المتوفرة بالمخزن حالياً عند تسجيل الصنف"
            />
          )}
        </div>

        {/* Decimal Quantity Flag */}
        <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
          <input
            type="checkbox"
            id="allows_decimal"
            checked={formData.allows_decimal_quantity}
            onChange={(e) => setFormData({ ...formData, allows_decimal_quantity: e.target.checked })}
            className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
            disabled={isSubmitting}
          />
          <label htmlFor="allows_decimal" className="text-xs font-semibold text-neutral-800 cursor-pointer">
            يسمح بكسور الكميات (أمتار، أوزان، إلخ)
          </label>
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            وصف الصنف والمواصفات الفنية
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="مواصفات الصنف، بلد المنشأ، أو أي ملاحظات فنية تهم البيع والشراء..."
            className="w-full p-2.5 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  )
}
