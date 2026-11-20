import React from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Product, InvoiceDiscountType } from '@/types'
import { CalculatedLineItem } from '@/domain/invoiceCalculations'
import { useAuth } from '@/auth'

export interface LineItemFormState {
  productId: string
  quantity: number
  unitPrice: number
  discountType: InvoiceDiscountType
  discountValue: number
}

interface InvoiceLineItemsProps {
  items: LineItemFormState[]
  calculatedItems: CalculatedLineItem[]
  products: Product[]
  onItemChange: (index: number, updated: Partial<LineItemFormState>) => void
  onAddItem: () => void
  onRemoveItem: (index: number) => void
  isApprovedContext?: boolean
}

export const InvoiceLineItems: React.FC<InvoiceLineItemsProps> = ({
  items,
  calculatedItems,
  products,
  onItemChange,
  onAddItem,
  onRemoveItem,
  isApprovedContext = false,
}) => {
  const { canViewExactStock } = useAuth()
  const activeProducts = products.filter((p) => p.is_active)

  return (
    <div className="space-y-3">
      {/* Header & Add Button */}
      <div className="flex justify-between items-center gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">بنود أصناف الفاتورة</h3>
          <p className="text-xs text-neutral-500">
            حدد الأصناف والكميات وأسعار البيع ونسب الخصم لكل بند
          </p>
        </div>
        {!isApprovedContext && (
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#11243A] hover:bg-[#1E3A5F] active:bg-[#0c1a2b] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 whitespace-nowrap"
            title="إضافة صنف جديد للفاتورة"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>إضافة صنف</span>
          </button>
        )}
      </div>

      {/* Mobile Cards Layout (Priority Order: Product -> Quantity w/ Unit -> Unit Price -> Discount -> Net Total -> Delete) */}
      <div className="space-y-3 md:hidden">
        {items.map((row, idx) => {
          const prod = products.find((p) => p.id === row.productId)
          const calc = calculatedItems[idx] || {
            grossAmount: 0,
            discountAmount: 0,
            netAmount: 0,
          }
          const curStock = prod ? prod.current_stock : 0
          const isInsufficient = prod ? row.quantity > curStock : false
          const allowsDec = Boolean(prod?.allows_decimal_quantity)

          return (
            <div
              key={`mobile-item-${idx}`}
              className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-3"
            >
              {/* Item Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="font-bold text-neutral-800 text-xs">
                  بند #{idx + 1}
                </span>
                {prod && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      curStock <= 0
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {canViewExactStock
                      ? `المتاح: ${formatNumber(curStock)} ${prod.unit}`
                      : curStock > 0
                        ? 'متوفر'
                        : 'غير متوفر'}
                  </span>
                )}
              </div>

              {/* 1. Product Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700">
                  الصنف المطلوب *
                </label>
                <select
                  value={row.productId}
                  onChange={(e) => {
                    const pId = e.target.value
                    const selected = products.find((p) => p.id === pId)
                    onItemChange(idx, {
                      productId: pId,
                      unitPrice: selected ? selected.selling_price : 0,
                      quantity:
                        selected && !selected.allows_decimal_quantity
                          ? Math.max(1, Math.round(row.quantity || 1))
                          : row.quantity || 1,
                    })
                  }}
                  className="w-full p-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  disabled={isApprovedContext}
                >
                  <option value="">-- اختر الصنف من المخزن --</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                      {canViewExactStock
                        ? ` (المتاح: ${formatNumber(p.current_stock)} ${p.unit})`
                        : p.current_stock > 0
                          ? ' (متوفر)'
                          : ' (غير متوفر)'}
                    </option>
                  ))}
                </select>
                {prod && curStock <= 0 && (
                  <div className="text-[11px] text-rose-700 font-bold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{canViewExactStock ? 'رصيد المخزن: 0 (نفد)' : 'غير متوفر بالمخزن'}</span>
                  </div>
                )}
              </div>

              {/* 2. Quantity & 3. Unit Price in 2-column grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 2. Quantity (with unit displayed) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">
                    الكمية المطلوبة
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step={allowsDec ? '0.001' : '1'}
                      min={allowsDec ? '0.001' : '1'}
                      value={row.quantity}
                      onChange={(e) =>
                        onItemChange(idx, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className={`flex-1 min-w-0 p-2 border rounded-lg text-xs text-center font-bold focus:ring-2 ${
                        isInsufficient
                          ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-500'
                          : 'border-neutral-300 focus:ring-emerald-500'
                      }`}
                      placeholder={allowsDec ? 'مثال: 1.5' : '1'}
                      required
                      disabled={isApprovedContext}
                    />
                    <span className="shrink-0 px-2 py-2 bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold text-[11px] rounded-lg min-w-[42px] text-center truncate">
                      {prod ? prod.unit : 'وحدة'}
                    </span>
                  </div>
                  {isInsufficient && (
                    <span className="text-[10px] text-rose-600 block mt-0.5 font-bold">
                      يتجاوز الرصيد ({formatNumber(curStock)})!
                    </span>
                  )}
                </div>

                {/* 3. Unit Price */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">
                    سعر البيع (ج.م)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={row.unitPrice}
                    onChange={(e) =>
                      onItemChange(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2 border border-neutral-300 rounded-lg text-xs text-center font-semibold focus:ring-2 focus:ring-emerald-500"
                    required
                    disabled={isApprovedContext}
                  />
                </div>
              </div>

              {/* 4. Discount */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700">
                  خصم البند
                </label>
                <div className="flex gap-2 items-center">
                  <select
                    value={row.discountType}
                    onChange={(e) =>
                      onItemChange(idx, {
                        discountType: e.target.value as InvoiceDiscountType,
                      })
                    }
                    className="flex-1 p-2 border border-neutral-300 rounded-lg text-xs bg-white"
                    disabled={isApprovedContext}
                  >
                    <option value="none">بدون خصم</option>
                    <option value="percentage">% نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت (ج.م)</option>
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={row.discountValue}
                    onChange={(e) =>
                      onItemChange(idx, {
                        discountValue: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24 p-2 border border-neutral-300 rounded-lg text-xs text-center tabular-nums font-semibold"
                    placeholder="0.00"
                    disabled={row.discountType === 'none' || isApprovedContext}
                  />
                </div>
                {calc.discountAmount > 0 && (
                  <div className="text-[11px] text-rose-600 font-bold mt-1 text-left">
                    قيمة الخصم: -{formatCurrency(calc.discountAmount)}
                  </div>
                )}
              </div>

              {/* 5. Line Total (الصافي) */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-100">
                <span className="text-xs font-bold text-neutral-700">صافي البند:</span>
                <span className="font-extrabold text-emerald-900 text-sm tabular-nums">
                  {formatCurrency(calc.netAmount)}
                </span>
              </div>

              {/* 6. Distinct Delete Action */}
              {!isApprovedContext && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  disabled={items.length <= 1}
                  className="w-full py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title="حذف البند"
                  aria-label="حذف البند"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>حذف هذا البند</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
              <tr>
                <th className="p-3 w-4/12 min-w-[200px]">الصنف المطلوب</th>
                <th className="p-3 w-1/12 text-center min-w-[70px]">الوحدة</th>
                <th className="p-3 w-2/12 min-w-[120px]">الكمية</th>
                <th className="p-3 w-2/12 min-w-[110px]">سعر البيع (ج.م)</th>
                <th className="p-3 w-2/12 min-w-[150px]">خصم البند</th>
                <th className="p-3 w-2/12 text-center min-w-[110px]">الصافي</th>
                {!isApprovedContext && (
                  <th className="p-3 w-10 text-center min-w-[50px]">حذف</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {items.map((row, idx) => {
                const prod = products.find((p) => p.id === row.productId)
                const calc = calculatedItems[idx] || {
                  grossAmount: 0,
                  discountAmount: 0,
                  netAmount: 0,
                }
                const curStock = prod ? prod.current_stock : 0
                const isInsufficient = prod ? row.quantity > curStock : false
                const allowsDec = Boolean(prod?.allows_decimal_quantity)

                return (
                  <tr
                    key={`desktop-item-${idx}`}
                    className="hover:bg-neutral-50/70 transition-colors"
                  >
                    {/* 1. Product selector & stock badge */}
                    <td className="p-2.5">
                      <select
                        value={row.productId}
                        onChange={(e) => {
                          const pId = e.target.value
                          const selected = products.find((p) => p.id === pId)
                          onItemChange(idx, {
                            productId: pId,
                            unitPrice: selected ? selected.selling_price : 0,
                            quantity:
                              selected && !selected.allows_decimal_quantity
                                ? Math.max(1, Math.round(row.quantity || 1))
                                : row.quantity || 1,
                          })
                        }}
                        className="w-full p-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                        disabled={isApprovedContext}
                      >
                        <option value="">-- اختر الصنف من المخزن --</option>
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                            {canViewExactStock
                              ? ` (المتاح: ${formatNumber(p.current_stock)} ${p.unit})`
                              : p.current_stock > 0
                                ? ' (متوفر)'
                                : ' (غير متوفر)'}
                          </option>
                        ))}
                      </select>

                      {prod && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                          {curStock <= 0 ? (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {canViewExactStock ? 'رصيد المخزن: 0 (نفد)' : 'غير متوفر بالمخزن'}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">
                              {canViewExactStock
                                ? `متاح بالمخزن: ${formatNumber(curStock)} ${prod.unit}`
                                : 'متوفر بالمخزن للطلب والبيع'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 2. Unit */}
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md font-semibold">
                        {prod ? prod.unit : '--'}
                      </span>
                    </td>

                    {/* 3. Quantity (with unit displayed) */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={allowsDec ? '0.001' : '1'}
                          min={allowsDec ? '0.001' : '1'}
                          value={row.quantity}
                          onChange={(e) =>
                            onItemChange(idx, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className={`flex-1 min-w-0 p-2 border rounded-lg text-xs text-center font-bold focus:ring-2 ${
                            isInsufficient
                              ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-500'
                              : 'border-neutral-300 focus:ring-emerald-500'
                          }`}
                          placeholder={allowsDec ? 'مثال: 1.5' : '1'}
                          required
                          disabled={isApprovedContext}
                        />
                        <span className="shrink-0 px-2 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-semibold rounded border border-neutral-200 min-w-[36px] text-center">
                          {prod ? prod.unit : '--'}
                        </span>
                      </div>
                      {isInsufficient && (
                        <span className="text-[10px] text-rose-600 block mt-0.5 font-bold">
                          يتجاوز الرصيد ({formatNumber(curStock)})!
                        </span>
                      )}
                    </td>

                    {/* 4. Unit Price */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={row.unitPrice}
                        onChange={(e) =>
                          onItemChange(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full p-2 border border-neutral-300 rounded-lg text-xs text-center font-semibold focus:ring-2 focus:ring-emerald-500"
                        required
                        disabled={isApprovedContext}
                      />
                    </td>

                    {/* 5. Line Item Discount */}
                    <td className="p-2.5">
                      <div className="flex gap-1.5 items-center">
                        <select
                          value={row.discountType}
                          onChange={(e) =>
                            onItemChange(idx, {
                              discountType: e.target.value as InvoiceDiscountType,
                            })
                          }
                          className="w-24 p-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                          disabled={isApprovedContext}
                        >
                          <option value="none">بدون خصم</option>
                          <option value="percentage">% نسبة</option>
                          <option value="fixed">مبلغ ج.م</option>
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={row.discountValue}
                          onChange={(e) =>
                            onItemChange(idx, {
                              discountValue: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 p-1.5 border border-neutral-300 rounded-lg text-xs text-center tabular-nums"
                          disabled={row.discountType === 'none' || isApprovedContext}
                        />
                      </div>
                      {calc.discountAmount > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold mt-1">
                          -{formatCurrency(calc.discountAmount)}
                        </div>
                      )}
                    </td>

                    {/* 6. Net Amount */}
                    <td className="p-2.5 text-center">
                      <span className="font-bold text-emerald-800 whitespace-nowrap text-sm tabular-nums">
                        {formatCurrency(calc.netAmount)}
                      </span>
                    </td>

                    {/* 7. Delete Row */}
                    {!isApprovedContext && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="action-btn-pill action-btn-pill-danger disabled:opacity-30 disabled:pointer-events-none"
                          title="حذف البند"
                          aria-label="حذف البند"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
