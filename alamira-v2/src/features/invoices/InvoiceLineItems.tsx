import React from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Product, InvoiceDiscountType } from '@/types'
import { CalculatedLineItem } from '@/domain/invoiceCalculations'

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
  const activeProducts = products.filter((p) => p.is_active)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">بنود أصناف الفاتورة</h3>
          <p className="text-xs text-neutral-500">
            حدد الأصناف والكميات وأسعار البيع ونسب الخصم لكل بند
          </p>
        </div>
        {!isApprovedContext && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddItem}
            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
          >
            <Plus className="w-3.5 h-3.5 ml-1" />
            إضافة صنف آخر
          </Button>
        )}
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
              <tr>
                <th className="p-3 w-4/12 min-w-[200px]">الصنف المطلوب</th>
                <th className="p-3 w-1/12 text-center min-w-[70px]">الوحدة</th>
                <th className="p-3 w-2/12 min-w-[110px]">الكمية</th>
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
                  <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
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
                            {p.sku} - {p.name} (المتاح: {formatNumber(p.current_stock)} {p.unit})
                          </option>
                        ))}
                      </select>

                      {prod && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                          {curStock <= 0 ? (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              رصيد المخزن: 0 (نفد)
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">
                              متاح بالمخزن: {formatNumber(curStock)} {prod.unit}
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

                    {/* 3. Quantity */}
                    <td className="p-2.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        step={allowsDec ? '0.001' : '1'}
                        min={allowsDec ? '0.001' : '1'}
                        value={row.quantity}
                        onChange={(e) =>
                          onItemChange(idx, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        className={`w-full p-2 border rounded-lg text-xs text-center font-bold focus:ring-2 ${
                          isInsufficient
                            ? 'border-rose-400 bg-rose-50 text-rose-800 focus:ring-rose-500'
                            : 'border-neutral-300 focus:ring-emerald-500'
                        }`}
                        placeholder={allowsDec ? 'مثال: 1.5' : '1'}
                        required
                        disabled={isApprovedContext}
                      />
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
                          className="w-16 p-1.5 border border-neutral-300 rounded-lg text-xs text-center font-mono"
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
                    <td className="p-2.5 text-center font-bold text-emerald-800 whitespace-nowrap text-sm">
                      {formatCurrency(calc.netAmount)}
                    </td>

                    {/* 7. Delete Row */}
                    {!isApprovedContext && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer rounded-md transition-colors"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
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
