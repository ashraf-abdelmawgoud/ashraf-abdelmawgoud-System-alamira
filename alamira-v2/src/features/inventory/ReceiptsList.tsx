import React, { useState } from 'react'
import {
  Search,
  Plus,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  FileSpreadsheet,
} from 'lucide-react'
import { Button, Input, Badge, Table, Modal } from '@/components/ui'
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters'
import { StockReceipt, Product, Supplier } from '@/types'
import { ReceiptFormModal } from './ReceiptFormModal'

interface ReceiptsListProps {
  receipts: StockReceipt[]
  products: Product[]
  suppliers: Supplier[]
  onApprove: (id: string) => Promise<void>
  onCreateReceipt: (data: Parameters<typeof import('@/services/mockDataService').mockDataService.createReceipt>[0]) => Promise<StockReceipt>
  loading?: boolean
}

export const ReceiptsList: React.FC<ReceiptsListProps> = ({
  receipts,
  products,
  suppliers,
  onApprove,
  onCreateReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'draft'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<StockReceipt | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const filtered = receipts.filter((r) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      r.receipt_number.toLowerCase().includes(q) ||
      (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
      (r.supplier_invoice_number && r.supplier_invoice_number.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      await onApprove(id)
    } finally {
      setApprovingId(null)
    }
  }

  const handlePrint = (r: StockReceipt) => {
    window.print()
    // Simulated print action
    void r
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            <span>أذون استلام البضاعة (الوارد والتوريدات)</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            إدارة أذون توريد الأصناف للمخزن، تحديث تكلفة الشراء، والاعتماد السحابي الفوري
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-emerald-700 hover:bg-emerald-800 shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 ml-1" />
          إذن استلام بضاعة جديد
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="relative flex-1">
          <Input
            placeholder="بحث برقم الإذن، المورد، أو رقم فاتورة المورد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'draft')}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">كافة الحالات</option>
            <option value="approved">معتمد ومضاف للمخزن</option>
            <option value="draft">مسودة قيد المراجعة</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <thead className="bg-[#F8FAFC] text-[#475569] text-xs font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">رقم الإذن</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">تاريخ الإذن</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">المورد</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">فاتورة المورد</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">عدد الأصناف</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">إجمالي القيمة</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الحالة</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">المعتمد</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white text-xs sm:text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-[#64748B]">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  لا توجد أذون استلام مطابقة لمعايير البحث
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isApproved = r.status === 'approved'
                return (
                  <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold">
                      <span className="inv-number-badge">{r.receipt_number}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs">{formatDate(r.receipt_date)}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#11243A]">
                      {r.supplier_name || 'توريد عام بدون مورد'}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] font-mono text-xs" dir="ltr">
                      {r.supplier_invoice_number || '--'}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#11243A] tabular-nums">
                      {formatNumber(r.items ? r.items.length : 0)} صنف
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#0F766E] whitespace-nowrap tabular-nums">
                      {formatCurrency(r.total_amount)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      {isApproved ? (
                        <Badge variant="emerald" className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          معتمد ومضاف
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          مسودة
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs">
                      {r.approved_by || '--'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="action-btn-pill"
                          title="عرض تفاصيل الإذن"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                        </button>
                        <button
                          onClick={() => handlePrint(r)}
                          className="action-btn-pill hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                          title="طباعة إذن الاستلام"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#b45309]" />
                        </button>
                        {!isApproved && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={approvingId === r.id}
                            onClick={() => handleApprove(r.id)}
                            className="bg-[#047857] hover:bg-[#064e3b] text-white text-xs py-1 px-2.5 h-7.5"
                          >
                            {approvingId === r.id ? 'جاري...' : 'اعتماد'}
                          </Button>
                        )}
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
            لا توجد أذون استلام مطابقة
          </div>
        ) : (
          filtered.map((r) => {
            const isApproved = r.status === 'approved'
            return (
              <div
                key={r.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900 block">{r.receipt_number}</span>
                    <span className="text-xs text-gray-500">{formatDate(r.receipt_date)}</span>
                  </div>
                  {isApproved ? (
                    <Badge variant="emerald" className="text-xs">
                      معتمد
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">
                      مسودة
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span className="text-xs text-gray-400">المورد:</span>
                    <span className="font-semibold text-emerald-950">
                      {r.supplier_name || 'توريد مباشر'}
                    </span>
                  </div>
                  {r.supplier_invoice_number && (
                    <div className="flex justify-between text-gray-600">
                      <span className="text-xs text-gray-400">فاتورة المورد:</span>
                      <span className="font-mono text-xs">{r.supplier_invoice_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span className="text-xs text-gray-400">الأصناف:</span>
                    <span>{formatNumber(r.items ? r.items.length : 0)} صنف</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-600">إجمالي القيمة:</span>
                    <span className="text-base font-black text-emerald-800">
                      {formatCurrency(r.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReceipt(r)}
                    className="flex-1 justify-center text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    عرض البنود
                  </Button>
                  {!isApproved && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={approvingId === r.id}
                      onClick={() => handleApprove(r.id)}
                      className="flex-1 justify-center bg-emerald-700 hover:bg-emerald-800 text-xs"
                    >
                      {approvingId === r.id ? 'جاري...' : 'اعتماد'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create Receipt Modal */}
      {isCreateModalOpen && (
        <ReceiptFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (formData) => {
            await onCreateReceipt(formData)
          }}
          products={products}
          suppliers={suppliers}
        />
      )}

      {/* Details View Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={`تفاصيل إذن الاستلام ${selectedReceipt.receipt_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-gray-400 block">التاريخ:</span>
                <span className="font-bold text-gray-800">{selectedReceipt.receipt_date}</span>
              </div>
              <div>
                <span className="text-gray-400 block">المورد:</span>
                <span className="font-bold text-gray-800">
                  {selectedReceipt.supplier_name || 'بدون مورد'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">فاتورة المورد:</span>
                <span className="font-bold text-gray-800">
                  {selectedReceipt.supplier_invoice_number || '--'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">الحالة:</span>
                <span className="font-bold text-emerald-700">
                  {selectedReceipt.status === 'approved' ? 'معتمد ومضاف' : 'مسودة'}
                </span>
              </div>
            </div>

            {selectedReceipt.notes && (
              <div className="text-xs bg-amber-50 text-amber-900 p-2.5 rounded-lg border border-amber-200">
                <strong>ملاحظات:</strong> {selectedReceipt.notes}
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5 text-center">الوحدة</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-center">سعر الشراء</th>
                    <th className="p-2.5 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedReceipt.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-gray-800">
                        {it.product_sku ? `[${it.product_sku}] ` : ''}
                        {it.product_name}
                      </td>
                      <td className="p-2.5 text-center text-gray-500">{it.unit || '--'}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-900">
                        {formatNumber(it.quantity)}
                      </td>
                      <td className="p-2.5 text-center">{formatCurrency(it.unit_price)}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-800">
                        {formatCurrency(it.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900">القيمة الإجمالية للإذن:</span>
              <span className="text-xl font-black text-emerald-900">
                {formatCurrency(selectedReceipt.total_amount)}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReceipt(null)}>
                إغلاق
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handlePrint(selectedReceipt)}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                <Printer className="w-4 h-4 ml-1" />
                طباعة الإذن
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
