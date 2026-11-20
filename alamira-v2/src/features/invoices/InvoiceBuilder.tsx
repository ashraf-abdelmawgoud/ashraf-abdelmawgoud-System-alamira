import React, { useState } from 'react'
import {
  FileText,
  AlertCircle,
  ArrowRight,
  Phone,
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import {
  Customer,
  Product,
  SalesInvoice,
  SalesInvoiceFormData,
  InvoiceDiscountType,
} from '@/types'
import {
  calculateInvoiceTotals,
} from '@/domain/invoiceCalculations'
import { InvoiceLineItems, LineItemFormState } from './InvoiceLineItems'
import { InvoiceTotals } from './InvoiceTotals'

interface InvoiceBuilderProps {
  initialInvoice?: SalesInvoice | null
  customers: Customer[]
  products: Product[]
  onSave: (data: SalesInvoiceFormData) => Promise<SalesInvoice>
  onClose: () => void
}

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  initialInvoice,
  customers,
  products,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(initialInvoice && initialInvoice.id)
  const todayStr = new Date().toISOString().slice(0, 10)

  // Header State
  const [invoiceDate, setInvoiceDate] = useState(
    initialInvoice ? initialInvoice.invoice_date : todayStr
  )
  const [customerId, setCustomerId] = useState(
    initialInvoice ? initialInvoice.customer_id || '' : ''
  )
  const [customerPhone, setCustomerPhone] = useState(
    initialInvoice ? initialInvoice.customer_phone_snapshot || '' : ''
  )
  const [notes, setNotes] = useState(initialInvoice ? initialInvoice.notes || '' : '')

  // Global Discount & Charges State
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<InvoiceDiscountType>(
    initialInvoice ? initialInvoice.invoice_discount_type : 'none'
  )
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<number>(
    initialInvoice ? initialInvoice.invoice_discount_value : 0
  )
  const [additionalCharges, setAdditionalCharges] = useState<number>(
    initialInvoice ? initialInvoice.additional_charges : 0
  )

  // Line items state
  const [items, setItems] = useState<LineItemFormState[]>(() => {
    if (initialInvoice && initialInvoice.items && initialInvoice.items.length > 0) {
      return initialInvoice.items.map((it) => ({
        productId: it.product_id,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        discountType: it.discount_type,
        discountValue: it.discount_value,
      }))
    }
    return [
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        discountType: 'none',
        discountValue: 0,
      },
    ]
  })

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Active records
  const activeCustomers = customers.filter((c) => c.is_active || c.id === customerId)

  // Handle customer selection and auto-populate phone
  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId)
    const cust = customers.find((c) => c.id === cId)
    if (cust && cust.phone) {
      setCustomerPhone(cust.phone)
    }
  }

  // Handle line-item mutation
  const handleItemChange = (index: number, updated: Partial<LineItemFormState>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updated }
    setItems(newItems)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        discountType: 'none',
        discountValue: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  // Calculate live totals using verified domain function
  const calculations = calculateInvoiceTotals({
    items: items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountType: it.discountType,
      discountValue: it.discountValue,
    })),
    discountType: invoiceDiscountType,
    discountValue: invoiceDiscountValue,
    additionalCharges,
  })

  // Submit handler
  const handleSubmit = async (action: 'draft' | 'approve') => {
    setErrorMessage(null)

    if (!customerId) {
      setErrorMessage('يرجى اختيار العميل أولاً لحفظ الفاتورة')
      return
    }

    if (!invoiceDate) {
      setErrorMessage('يرجى تحديد تاريخ إصدار الفاتورة')
      return
    }

    if (items.length === 0) {
      setErrorMessage('يجب إضافة صنف واحد على الأقل في الفاتورة')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.productId) {
        setErrorMessage(`يرجى اختيار صنف محدد في البند رقم (${i + 1})`)
        return
      }
      if (isNaN(it.quantity) || it.quantity <= 0) {
        setErrorMessage(`الكمية يجب أن تكون أكبر من الصفر في البند رقم (${i + 1})`)
        return
      }
      if (isNaN(it.unitPrice) || it.unitPrice < 0) {
        setErrorMessage(`سعر الوحدة لا يمكن أن يكون سالباً في البند رقم (${i + 1})`)
        return
      }

      const prod = products.find((p) => p.id === it.productId)
      if (prod && !prod.allows_decimal_quantity && it.quantity % 1 !== 0) {
        setErrorMessage(
          `الصنف "${prod.name}" يباع بالعدد الصحيح فقط ولا يقبل كميات كسرية (الكمية المطلوبة: ${it.quantity})`
        )
        return
      }

      if (action === 'approve' && prod) {
        if (!prod.is_active) {
          setErrorMessage(`الصنف "${prod.name}" موقوف/مؤرشف ولا يمكن بيعه في فواتير معتمدة`)
          return
        }
        if (it.quantity > prod.current_stock) {
          setErrorMessage(
            `تعذر الاعتماد: رصيد الصنف "${prod.name}" في المخزن غير كافٍ لإتمام البيع (المتاح بالمخزن: ${prod.current_stock} ${prod.unit}، المطلوب: ${it.quantity} ${prod.unit}). يمكنك حفظ الفاتورة كمسودة.`
          )
          return
        }
      }
    }

    setLoading(true)
    try {
      await onSave({
        invoice_number: initialInvoice?.invoice_number,
        invoice_date: invoiceDate,
        customer_id: customerId,
        customer_phone: customerPhone,
        invoice_discount_type: invoiceDiscountType,
        invoice_discount_value: invoiceDiscountValue,
        additional_charges: additionalCharges,
        notes,
        items: items.map((it) => ({
          product_id: it.productId,
          quantity: Number(it.quantity),
          unit_price: Number(it.unitPrice),
          discount_type: it.discountType,
          discount_value: Number(it.discountValue),
        })),
        action,
      })
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'فشل حفظ فاتورة المبيعات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Back */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="العودة لقائمة الفواتير"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>
                {isEditing
                  ? `تعديل مسودة فاتورة مبيعات (${initialInvoice?.invoice_number})`
                  : 'إنشاء فاتورة مبيعات جديدة'}
              </span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              محرر الفواتير المتكامل — احتساب لحظي للخصومات والمجاميع وتدقيق مباشر للمخزون
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSubmit('approve')}
            disabled={loading}
            className="w-full sm:w-auto bg-[#0F766E] hover:bg-[#115E59] text-xs order-1 sm:order-3"
          >
            {loading ? 'جاري الاعتماد...' : 'اعتماد الفاتورة وخصم المخزون'}
          </Button>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 order-2 sm:order-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="w-full sm:w-auto bg-amber-100 text-amber-900 hover:bg-amber-200 border-0 text-xs"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </Button>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Form Section: Header fields (Customer, Date, Phone) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        {/* Customer select */}
        <div>
          <label className="block text-xs font-bold text-neutral-800 mb-1.5">
            العميل المعتمد <span className="text-rose-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
            required
          >
            <option value="">-- اختر العميل من الدليل --</option>
            {activeCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Date */}
        <div>
          <label className="block text-xs font-bold text-neutral-800 mb-1.5">
            تاريخ الفاتورة <span className="text-rose-500">*</span>
          </label>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />
        </div>

        {/* Customer Phone snapshot */}
        <div>
          <label className="block text-xs font-bold text-neutral-800 mb-1.5">
            رقم هاتف العميل للتواصل
          </label>
          <div className="relative">
            <Input
              placeholder="مثال: 01012345678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="pr-9 tabular-nums"
            />
            <Phone className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <InvoiceLineItems
          items={items}
          calculatedItems={calculations.items}
          products={products}
          onItemChange={handleItemChange}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
        />
      </div>

      {/* Totals & Notes Section */}
      <InvoiceTotals
        calculations={calculations}
        invoiceDiscountType={invoiceDiscountType}
        invoiceDiscountValue={invoiceDiscountValue}
        additionalCharges={additionalCharges}
        onDiscountTypeChange={setInvoiceDiscountType}
        onDiscountValueChange={setInvoiceDiscountValue}
        onChargesChange={setAdditionalCharges}
        notes={notes}
        onNotesChange={setNotes}
      />
    </div>
  )
}
