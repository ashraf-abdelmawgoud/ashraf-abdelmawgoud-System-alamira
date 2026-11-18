import React, { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { Customer, CustomerFormData } from '@/types'

export interface CustomerFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CustomerFormData) => Promise<void>
  customer?: Customer | null
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customer,
}) => {
  const isEditing = Boolean(customer)

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    address: '',
    notes: '',
    is_active: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || customer.city || '',
        notes: customer.notes || '',
        is_active: customer.is_active !== false,
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
  }, [customer, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم العميل أو المؤسسة'
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
      const msg = err instanceof Error ? err.message : 'فشل حفظ بيانات العميل'
      setErrors((prev) => ({ ...prev, submit: msg }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
      description={
        isEditing
          ? 'تحديث بيانات التواصل والمقر والملاحظات'
          : 'تسجيل عميل جديد في دليل الحسابات والمبيعات'
      }
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'حفظ التعديلات' : 'إضافة العميل'}
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
          label="اسم العميل أو الجهة *"
          placeholder="مثال: مؤسسة الأمل للمقاولات"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="رقم الهاتف للتواصل"
            placeholder="مثال: 01012345678"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={isSubmitting}
            dir="ltr"
            className="text-right"
          />

          <Input
            label="العنوان والمقر"
            placeholder="مثال: قنا - الوقف"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="ملاحظات التعامل أو شروط الدفع"
          placeholder="أدخل أية ملاحظات إدارية أو ائتمانية..."
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
            <span>حساب نشط ومتاح لإصدار فواتير المبيعات</span>
          </label>
        </div>
      </form>
    </Modal>
  )
}
