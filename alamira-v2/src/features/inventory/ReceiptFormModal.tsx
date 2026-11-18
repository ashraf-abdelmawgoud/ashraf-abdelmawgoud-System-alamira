import React, { useState } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Product, Supplier, StockReceiptFormData } from '@/types'

interface ReceiptFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: StockReceiptFormData) => Promise<void>
  products: Product[]
  suppliers: Supplier[]
}

interface FormRow {
  productId: string
  quantity: number
  unitPrice: number
}

export const ReceiptFormModal: React.FC<ReceiptFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
  suppliers,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [receiptDate, setReceiptDate] = useState(todayStr)
  const [supplierId, setSupplierId] = useState('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormRow[]>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ])
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const activeProducts = products.filter((p) => p.is_active)
  const activeSuppliers = suppliers.filter((s) => s.is_active)

  const handleRowProductChange = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId)
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId: pId,
      unitPrice: prod ? prod.purchase_price : 0,
      quantity: prod && !prod.allows_decimal_quantity ? Math.max(1, Math.round(newItems[index].quantity || 1)) : (newItems[index].quantity || 1),
    }
    setItems(newItems)
  }

  const handleRowQtyChange = (index: number, val: number) => {
    const newItems = [...items]
    newItems[index].quantity = val
    setItems(newItems)
  }

  const handleRowPriceChange = (index: number, val: number) => {
    const newItems = [...items]
    newItems[index].unitPrice = val
    setItems(newItems)
  }

  const addRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])
  }

  const removeRow = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const grandTotal = items.reduce((acc, row) => {
    return acc + (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)
  }, 0)

  const handleSubmit = async (action: 'draft' | 'approve') => {
    setFormError(null)

    // Validation
    if (items.length === 0) {
      setFormError('يجب إضافة صنف واحد على الأقل في إذن الاستلام')
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
    }

    setLoading(true)
    try {
      await onSave({
        receipt_date: receiptDate,
        supplier_id: supplierId || null,
        supplier_invoice_number: supplierInvoiceNumber.trim(),
        notes: notes.trim(),
        items: items.map((it) => ({
          product_id: it.productId,
          quantity: Number(it.quantity),
          unit_price: Number(it.unitPrice),
        })),
        action,
      })
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'فشل حفظ إذن الاستلام')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء إذن استلام بضاعة للمخزن (توريدات)"
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
              تاريخ الإذن <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              المورد المعتمد
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">-- توريد مباشر بدون مورد محدد --</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              رقم فاتورة المورد
            </label>
            <Input
              placeholder="مثال: SW-88912"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-800">بنود البضاعة المستلمة</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 ml-1" />
              إضافة صنف آخر
            </Button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3 w-5/12">الصنف المستلم</th>
                  <th className="p-3 w-1/12 text-center">الوحدة</th>
                  <th className="p-3 w-2/12">الكمية</th>
                  <th className="p-3 w-2/12">سعر الشراء (ج.م)</th>
                  <th className="p-3 w-2/12">الإجمالي</th>
                  <th className="p-3 w-10 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((row, idx) => {
                  const prod = products.find((p) => p.id === row.productId)
                  const lineTotal = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)
                  const allowsDec = Boolean(prod?.allows_decimal_quantity)

                  return (
                    <tr key={idx} className="hover:bg-gray-50/70">
                      <td className="p-2">
                        <select
                          value={row.productId}
                          onChange={(e) => handleRowProductChange(idx, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500"
                          required
                        >
                          <option value="">-- اختر الصنف من الدليل --</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-semibold">
                          {prod ? prod.unit : '--'}
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
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-emerald-500"
                          placeholder={allowsDec ? 'مثال 1.5' : '1'}
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.unitPrice}
                          onChange={(e) => handleRowPriceChange(idx, parseFloat(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </td>
                      <td className="p-2 font-bold text-emerald-800 whitespace-nowrap">
                        {formatCurrency(lineTotal)}
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

        {/* Total & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              ملاحظات وبيان التوريد
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول حالة الشحنة أو بوليصة الشحن..."
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
            <div>
              <span className="text-xs text-emerald-800 font-bold block">إجمالي قيمة التوريد</span>
              <span className="text-xs text-gray-500">
                {formatNumber(items.length)} بنود مستلمة
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-900">
              {formatCurrency(grandTotal)}
            </span>
          </div>
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
            className="bg-emerald-700 hover:bg-emerald-800"
          >
            {loading ? 'جاري الاعتماد...' : 'اعتماد وإضافة للمخزن فوراً'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
