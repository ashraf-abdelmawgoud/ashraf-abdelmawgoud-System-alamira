import React, { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { Supplier, SupplierFormData } from '@/types'

export interface SupplierFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: SupplierFormData) => Promise<void>
  supplier?: Supplier | null
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  supplier,
}) => {
  const isEditing = Boolean(supplier)

  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    phone: '',
    address: '',
    notes: '',
    is_active: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        address: supplier.address || supplier.city || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active !== false,
      })
    } else {
      setFormData({
        name: '',
        phone: '',
        address: '',
        notes: '',
        is_active: true,
      })
    }
    setErrors({})
  }, [supplier, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم المورد أو المصنع'
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
      const msg = err instanceof Error ? err.message : 'فشل حفظ بيانات المورد'
      setErrors((prev) => ({ ...prev, submit: msg }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
      description={
        isEditing
          ? 'تحديث بيانات التواصل ومقر المصنع وشروط التوريد'
          : 'تسجيل مورد جديد في دليل المصانع والتوريدات الواردة'
      }
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'حفظ التعديلات' : 'إضافة المورد'}
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

        <Input
          label="اسم المورد أو المصنع أو الشركة *"
          placeholder="مثال: شركة السويدي إلكتريك"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="رقم الهاتف للتواصل"
            placeholder="مثال: 0227599000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={isSubmitting}
            dir="ltr"
            className="text-right"
          />

          <Input
            label="المقر أو العنوان الرئيسي"
            placeholder="مثال: العاشر من رمضان - المنطقة الصناعية"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="ملاحظات وشروط التوريد والدفع"
          placeholder="أدخل شروط الأجل وفترات السماح ونوعية البضائع..."
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          disabled={isSubmitting}
        />

        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>مورد نشط ومتاح لإصدار أذون الاستلام المخزنية</span>
          </label>
        </div>
      </form>
    </Modal>
  )
}
