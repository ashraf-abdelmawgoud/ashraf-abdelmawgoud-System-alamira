import React, { useState } from 'react'
import {
  Search,
  ClipboardCheck,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
} from 'lucide-react'
import { Button, Input, Badge, Table } from '@/components/ui'
import { formatNumber, formatDate } from '@/lib/formatters'
import { StockAdjustment, Product } from '@/types'
import { AdjustmentFormModal } from './AdjustmentFormModal'

interface AdjustmentsListProps {
  adjustments: StockAdjustment[]
  products: Product[]
  onCreateAdjustment: (data: Parameters<typeof import('@/services/dataService').dataService.createAdjustment>[0]) => Promise<StockAdjustment>
  loading?: boolean
}

export const AdjustmentsList: React.FC<AdjustmentsListProps> = ({
  adjustments,
  products,
  onCreateAdjustment,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const filtered = adjustments.filter((a) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesNumber = a.adjustment_number.toLowerCase().includes(q)
    const matchesReason = a.reason.toLowerCase().includes(q)
    const matchesItem = a.items.some(
      (it) =>
        (it.product_name && it.product_name.toLowerCase().includes(q)) ||
        (it.product_sku && it.product_sku.toLowerCase().includes(q))
    )
    return !q || matchesNumber || matchesReason || matchesItem
  })

  const handlePrint = (a: StockAdjustment) => {
    window.print()
    void a
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#0F766E]" />
            <span>تسويات الجرد المخزني الفعلي</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            مطابقة الأرصدة الدفترية مع المحاضر الفعلية لإثبات الفروقات والعجز والزيادة
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#0F766E] hover:bg-[#115E59] shrink-0 w-full sm:w-auto"
        >
          تسوية جردية جديدة
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <div className="relative">
          <Input
            placeholder="بحث برقم التسوية، الصنف، أو سبب محضر الجرد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <thead className="bg-[#F8FAFC] text-[#475569] text-xs font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">رقم التسوية</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">تاريخ المحضر</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">الصنف المسوى</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الرصيد الدفتري</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الرصيد الفعلي</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">فارق الجرد</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">السبب والملاحظات</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الحالة</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">المعتمد</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">طباعة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white text-xs sm:text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-[#64748B]">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  لا توجد تسويات جرد مطابقة لمعايير البحث
                </td>
              </tr>
            ) : (
              filtered.map((a) => {
                const item = a.items[0]
                const diff = item ? item.difference : 0
                return (
                  <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold">
                      <span className="inv-number-badge">{a.adjustment_number}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs">{formatDate(a.adjustment_date)}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#11243A]">
                      {item ? (
                        <div>
                          <span>{item.product_name}</span>
                          {item.product_sku && (
                            <span className="block text-xs text-[#64748B] mt-0.5" dir="ltr">
                              [{item.product_sku}]
                            </span>
                          )}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center text-[#11243A] tabular-nums">
                      {item ? `${formatNumber(item.recorded_quantity)} ${item.unit || ''}` : '--'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[#11243A] tabular-nums">
                      {item ? `${formatNumber(item.actual_quantity)} ${item.unit || ''}` : '--'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          diff > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : diff < 0
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs max-w-xs truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <Badge variant="emerald" className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        معتمدة
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64766f] text-xs">
                      {a.approved_by || '--'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handlePrint(a)}
                          className="action-btn-pill action-btn-pill-muted"
                          title="طباعة إذن التسوية"
                          aria-label="طباعة إذن التسوية"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#64748B]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
            لا توجد تسويات جرد مطابقة
          </div>
        ) : (
          filtered.map((a) => {
            const item = a.items[0]
            const diff = item ? item.difference : 0
            return (
              <div
                key={a.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900 block">{a.adjustment_number}</span>
                    <span className="text-xs text-gray-500">{formatDate(a.adjustment_date)}</span>
                  </div>
                  <Badge variant="emerald" className="text-xs">
                    معتمدة
                  </Badge>
                </div>

                {item && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1 text-xs">
                    <span className="font-bold text-gray-900 block">{item.product_name}</span>
                    <div className="flex justify-between text-gray-600 pt-1">
                      <span>الرصيد الدفتري: {formatNumber(item.recorded_quantity)}</span>
                      <span>الرصيد الفعلي: {formatNumber(item.actual_quantity)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-200 font-bold">
                      <span>فارق الجرد:</span>
                      <span
                        className={
                          diff > 0
                            ? 'text-emerald-700'
                            : diff < 0
                            ? 'text-red-700'
                            : 'text-gray-700'
                        }
                      >
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)} {item.unit}
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-600">
                  <span className="text-gray-400">السبب: </span>
                  {a.reason}
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(a)}
                    className="text-xs"
                  >
                    طباعة المحضر
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create Adjustment Modal */}
      {isCreateModalOpen && (
        <AdjustmentFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (formData) => {
            await onCreateAdjustment(formData)
          }}
          products={products}
        />
      )}
    </div>
  )
}
