import React, { useState } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { formatNumber } from '@/lib/formatters'
import { Product, StockIssueFormData } from '@/types'

interface IssueFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: StockIssueFormData) => Promise<void>
  products: Product[]
}

interface FormRow {
  productId: string
  quantity: number
}

export const IssueFormModal: React.FC<IssueFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [issueDate, setIssueDate] = useState(todayStr)
  const [recipientName, setRecipientName] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormRow[]>([{ productId: '', quantity: 1 }])
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const activeProducts = products.filter((p) => p.is_active)

  const handleRowProductChange = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId)
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId: pId,
      quantity: prod && !prod.allows_decimal_quantity ? Math.max(1, Math.round(newItems[index].quantity || 1)) : (newItems[index].quantity || 1),
    }
    setItems(newItems)
  }

  const handleRowQtyChange = (index: number, val: number) => {
    const newItems = [...items]
    newItems[index].quantity = val
    setItems(newItems)
  }

  const addRow = () => {
    setItems([...items, { productId: '', quantity: 1 }])
  }

  const removeRow = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (action: 'draft' | 'approve') => {
    setFormError(null)

    const cleanRecipient = recipientName.trim()
    if (!cleanRecipient) {
      setFormError('يرجى إدخال اسم المستلم / الجهة المستلمة للبضاعة')
      return
    }

    if (items.length === 0) {
      setFormError('يجب إضافة صنف واحد على الأقل في إذن الصرف')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.productId) {
        setFormError(`يرجى اختيار الصنف في البند رقم (${i + 1})`)
        return
      }
      if (isNaN(it.quantity) || it.quantity <= 0) {
        setFormError(`الكمية يجب أن تكون أكبر من الصفر في البند رقم (${i + 1})`)
        return
      }
      const prod = products.find((p) => p.id === it.productId)
      if (prod && !prod.allows_decimal_quantity && it.quantity % 1 !== 0) {
        setFormError(
          `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المدخلة: ${it.quantity})`
        )
        return
      }

      if (action === 'approve' && prod) {
        if (it.quantity > prod.current_stock) {
          setFormError(
            `تعذر الاعتماد: رصيد الصنف "${prod.name}" غير كافٍ للصرف (المتاح: ${prod.current_stock} ${prod.unit}، المطلوب: ${it.quantity} ${prod.unit}). يمكنك حفظ الإذن كمسودة.`
          )
          return
        }
      }
    }

    setLoading(true)
    try {
      await onSave({
        issue_date: issueDate,
        recipient_name: cleanRecipient,
        reason: reason.trim(),
        notes: notes.trim(),
        items: items.map((it) => ({
          product_id: it.productId,
          quantity: Number(it.quantity),
        })),
        action,
      })
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'فشل حفظ إذن الصرف')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء إذن صرف بضاعة من المخزن"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              تاريخ الصرف <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              اسم المستلم / الجهة المستلمة <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="مثال: موقع أبراج النيل / فني التركيبات"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              سبب / بند الصرف
            </label>
            <Input
              placeholder="مثال: تنفيذ أعمال المرحلة الأولى"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-800">الأصناف المطلوب صرفها</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-teal-700 border-teal-300 hover:bg-teal-50"
            >
              <Plus className="w-4 h-4 ml-1" />
              إضافة صنف آخر
            </Button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-6/12">الصنف المنصرف</th>
                  <th className="p-3 w-1/12 text-center">الوحدة</th>
                  <th className="p-3 w-2/12 text-center">الرصيد المتاح</th>
                  <th className="p-3 w-2/12">الكمية المنصرفة</th>
                  <th className="p-3 w-10 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((row, idx) => {
                  const prod = products.find((p) => p.id === row.productId)
                  const curStock = prod ? prod.current_stock : 0
                  const isInsufficient = prod ? row.quantity > curStock : false
                  const allowsDec = Boolean(prod?.allows_decimal_quantity)

                  return (
                    <tr key={idx} className="hover:bg-gray-50/70">
                      <td className="p-2">
                        <select
                          value={row.productId}
                          onChange={(e) => handleRowProductChange(idx, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-teal-500"
                          required
                        >
                          <option value="">-- اختر الصنف من المخزن --</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name} (المتاح: {formatNumber(p.current_stock)} {p.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-semibold">
                          {prod ? prod.unit : '--'}
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            curStock > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {formatNumber(curStock)}
                        </span>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={allowsDec ? '0.001' : '1'}
                          min={allowsDec ? '0.001' : '1'}
                          value={row.quantity}
                          onChange={(e) => handleRowQtyChange(idx, parseFloat(e.target.value))}
                          className={`w-full p-2 border rounded-lg text-sm text-center focus:ring-1 ${
                            isInsufficient
                              ? 'border-red-400 bg-red-50 text-red-800'
                              : 'border-gray-300 focus:ring-teal-500'
                          }`}
                          placeholder={allowsDec ? 'مثال 1.5' : '1'}
                          required
                        />
                        {isInsufficient && (
                          <span className="text-[10px] text-red-600 block mt-0.5">
                            يتجاوز الرصيد المتاح!
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            ملاحظات إضافية وتوجيهات الاستلام
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات حول طريقة التسليم أو موقع التفريغ..."
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="bg-amber-100 text-amber-900 hover:bg-amber-200 border-0"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ كمسودة'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSubmit('approve')}
            disabled={loading}
            className="bg-teal-700 hover:bg-teal-800"
          >
            {loading ? 'جاري الاعتماد...' : 'اعتماد وخصم من المخزن'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
