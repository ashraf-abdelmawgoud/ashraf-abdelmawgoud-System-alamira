import React from 'react'
import { formatCurrency } from '@/lib/formatters'
import { InvoiceDiscountType } from '@/types'
import { InvoiceCalculationsResult } from '@/domain/invoiceCalculations'
import { Calculator } from 'lucide-react'

interface InvoiceTotalsProps {
  calculations: InvoiceCalculationsResult
  invoiceDiscountType: InvoiceDiscountType
  invoiceDiscountValue: number
  additionalCharges: number
  onDiscountTypeChange: (type: InvoiceDiscountType) => void
  onDiscountValueChange: (val: number) => void
  onChargesChange: (val: number) => void
  notes: string
  onNotesChange: (notes: string) => void
  isReadOnly?: boolean
}

export const InvoiceTotals: React.FC<InvoiceTotalsProps> = ({
  calculations,
  invoiceDiscountType,
  invoiceDiscountValue,
  additionalCharges,
  onDiscountTypeChange,
  onDiscountValueChange,
  onChargesChange,
  notes,
  onNotesChange,
  isReadOnly = false,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[#F5F7FA] p-4 sm:p-5 rounded-xl border border-[#E2E8F0]">
      {/* Right Column: Notes & Delivery Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#11243A] mb-1.5">
            ملاحظات وشروط الفاتورة
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="مثال: شروط الدفع، موعد التسليم، موقع المشروع، أو بيانات التحويل البنكي..."
            className="w-full p-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#11243A] focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] disabled:bg-slate-50 outline-none"
          />
        </div>

        {/* Global Invoice Discount Input */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] space-y-2 shadow-xs">
          <label className="block text-xs font-semibold text-[#11243A]">
            خصم إجمالي إضافي على الفاتورة (Invoice Discount)
          </label>
          <div className="flex gap-2">
            <select
              value={invoiceDiscountType}
              onChange={(e) => onDiscountTypeChange(e.target.value as InvoiceDiscountType)}
              disabled={isReadOnly}
              className="w-32 p-2 border border-[#CBD5E1] rounded-md text-xs bg-white text-[#11243A] font-medium"
            >
              <option value="none">بدون خصم</option>
              <option value="percentage">% نسبة مئوية</option>
              <option value="fixed">مبلغ محدد (ج.م)</option>
            </select>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={invoiceDiscountValue}
              onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
              disabled={invoiceDiscountType === 'none' || isReadOnly}
              className="flex-1 p-2 border border-[#CBD5E1] rounded-md text-xs font-semibold text-center tabular-nums text-[#11243A]"
              placeholder={invoiceDiscountType === 'percentage' ? 'مثال: 5%' : '0.00'}
            />
          </div>
        </div>

        {/* Delivery charges */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] space-y-2 shadow-xs">
          <label className="block text-xs font-semibold text-[#11243A]">
            مصاريف شحن ونقل وتوريد (تضاف على الإجمالي)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={additionalCharges}
            onChange={(e) => onChargesChange(parseFloat(e.target.value) || 0)}
            disabled={isReadOnly}
            className="w-full p-2 border border-[#CBD5E1] rounded-md text-xs font-semibold text-center tabular-nums text-[#11243A]"
            placeholder="0.00 ج.م"
          />
        </div>
      </div>

      {/* Left Column: Calculated Financial Summary Box */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <span className="p-2 rounded-lg bg-slate-100 text-[#0F766E]">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-[#11243A]">الملخص المالي للفاتورة</h4>
              <p className="text-[11px] text-[#64748B]">
                حسابات معتمدة ودقيقة وفق معادلات V1 الموثقة
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between text-[#64748B]">
              <span>إجمالي البنود قبل الخصومات (Gross Total):</span>
              <span className="font-semibold tabular-nums text-[#11243A]">{formatCurrency(calculations.grossTotal)}</span>
            </div>

            {calculations.itemDiscountsTotal > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>إجمالي خصومات البنود:</span>
                <span className="font-semibold tabular-nums">-{formatCurrency(calculations.itemDiscountsTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#11243A] font-semibold pt-1 border-t border-[#E2E8F0]">
              <span>المجموع الفرعي (Subtotal):</span>
              <span className="font-semibold tabular-nums">{formatCurrency(calculations.subtotal)}</span>
            </div>

            {calculations.invoiceDiscountAmount > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>خصم الفاتورة العام:</span>
                <span className="font-semibold tabular-nums">
                  -{formatCurrency(calculations.invoiceDiscountAmount)}
                </span>
              </div>
            )}

            {calculations.additionalCharges > 0 && (
              <div className="flex justify-between text-[#0F766E]">
                <span>مصاريف النقل والتوريد (+):</span>
                <span className="font-semibold tabular-nums">
                  +{formatCurrency(calculations.additionalCharges)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Final Grand Total Badge */}
        <div className="mt-6 pt-4 border-t-2 border-[#0F766E] bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-[#E2E8F0]">
          <div>
            <span className="text-xs font-semibold text-[#11243A] block">الصافي النهائي للفاتورة</span>
            <span className="text-[11px] text-[#64748B]">
              المبلغ المستحق على العميل (شامل الخصومات والمصاريف)
            </span>
          </div>
          <span className="text-2xl font-bold text-[#0F766E] tabular-nums font-mono">
            {formatCurrency(calculations.finalTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
