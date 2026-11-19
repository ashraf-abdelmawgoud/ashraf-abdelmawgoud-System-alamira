import React, { useState } from 'react'
import {
  Search,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  FileSpreadsheet,
} from 'lucide-react'
import { Button, Input, Badge, Table, Modal } from '@/components/ui'
import { formatNumber, formatDate } from '@/lib/formatters'
import { StockIssue, Product } from '@/types'
import { IssueFormModal } from './IssueFormModal'

interface IssuesListProps {
  issues: StockIssue[]
  products: Product[]
  onApprove: (id: string) => Promise<void>
  onCreateIssue: (data: Parameters<typeof import('@/services/dataService').dataService.createIssue>[0]) => Promise<StockIssue>
  loading?: boolean
}

export const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  products,
  onApprove,
  onCreateIssue,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'draft'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<StockIssue | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const filtered = issues.filter((i) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      i.issue_number.toLowerCase().includes(q) ||
      i.recipient_name.toLowerCase().includes(q) ||
      (i.reason && i.reason.toLowerCase().includes(q)) ||
      (i.notes && i.notes.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
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

  const handlePrint = (i: StockIssue) => {
    window.print()
    void i
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-[#0F766E]" />
            <span>أذون صرف البضاعة من المخزن</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            صرف المواد والمعدات للمواقع، المستودعات الفرعية، والورش مع حظر الأرصدة السالبة
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#0F766E] hover:bg-[#115E59] shrink-0 w-full sm:w-auto"
        >
          إذن صرف بضاعة جديد
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="relative flex-1">
          <Input
            placeholder="بحث برقم الإذن، المستلم، أو سبب الصرف..."
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
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">كافة الحالات</option>
            <option value="approved">معتمد ومخصوم</option>
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
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">تاريخ الصرف</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">المستلم / الجهة</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">سبب الصرف</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">عدد الأصناف</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الحالة</th>
              <th className="py-2.5 px-3.5 text-right font-semibold text-[#475569]">المعتمد</th>
              <th className="py-2.5 px-3.5 text-center font-semibold text-[#475569]">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white text-xs sm:text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#64748B]">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  لا توجد أذون صرف مطابقة لمعايير البحث
                </td>
              </tr>
            ) : (
              filtered.map((i) => {
                const isApproved = i.status === 'approved'
                return (
                  <tr key={i.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3.5 font-semibold">
                      <span className="inv-number-badge">{i.issue_number}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs">{formatDate(i.issue_date)}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#11243A]">{i.recipient_name}</td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs">{i.reason || '--'}</td>
                    <td className="py-2.5 px-3.5 text-[#11243A] tabular-nums">
                      {formatNumber(i.items ? i.items.length : 0)} صنف
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      {isApproved ? (
                        <Badge variant="emerald" className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          معتمد ومخصوم
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          مسودة
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#64748B] text-xs">
                      {i.approved_by || '--'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedIssue(i)}
                          className="action-btn-pill"
                          title="عرض تفاصيل الإذن"
                          aria-label="عرض تفاصيل الإذن"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#11243A]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(i)}
                          className="action-btn-pill action-btn-pill-muted"
                          title="طباعة إذن الصرف"
                          aria-label="طباعة إذن الصرف"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#64748B]" />
                        </button>
                        {!isApproved && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={approvingId === i.id}
                            onClick={() => handleApprove(i.id)}
                            className="bg-emerald-50 text-[#0F766E] hover:bg-emerald-100 border border-emerald-200 text-xs py-1 px-2.5 h-7.5"
                          >
                            {approvingId === i.id ? 'جاري...' : 'اعتماد وخصم'}
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
            لا توجد أذون صرف مطابقة
          </div>
        ) : (
          filtered.map((i) => {
            const isApproved = i.status === 'approved'
            return (
              <div
                key={i.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900 block">{i.issue_number}</span>
                    <span className="text-xs text-gray-500">{formatDate(i.issue_date)}</span>
                  </div>
                  {isApproved ? (
                    <Badge variant="emerald" className="text-xs">
                      معتمد ومخصوم
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">
                      مسودة
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span className="text-xs text-gray-400">المستلم:</span>
                    <span className="font-semibold text-gray-900">{i.recipient_name}</span>
                  </div>
                  {i.reason && (
                    <div className="flex justify-between text-gray-600">
                      <span className="text-xs text-gray-400">سبب الصرف:</span>
                      <span className="text-xs text-gray-700">{i.reason}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span className="text-xs text-gray-400">عدد الأصناف:</span>
                    <span>{formatNumber(i.items ? i.items.length : 0)} صنف</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIssue(i)}
                    className="flex-1 justify-center text-xs"
                  >
                    عرض البنود
                  </Button>
                  {!isApproved && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={approvingId === i.id}
                      onClick={() => handleApprove(i.id)}
                      className="flex-1 justify-center bg-[#0F766E] hover:bg-[#115E59] text-xs"
                    >
                      {approvingId === i.id ? 'جاري...' : 'اعتماد وخصم'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create Issue Modal */}
      {isCreateModalOpen && (
        <IssueFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (formData) => {
            await onCreateIssue(formData)
          }}
          products={products}
        />
      )}

      {/* Details View Modal */}
      {selectedIssue && (
        <Modal
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title={`تفاصيل إذن الصرف ${selectedIssue.issue_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-gray-400 block">التاريخ:</span>
                <span className="font-bold text-gray-800">{selectedIssue.issue_date}</span>
              </div>
              <div>
                <span className="text-gray-400 block">المستلم:</span>
                <span className="font-bold text-gray-800">{selectedIssue.recipient_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block">السبب:</span>
                <span className="font-bold text-gray-800">{selectedIssue.reason || '--'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">الحالة:</span>
                <span className="font-bold text-[#0F766E]">
                  {selectedIssue.status === 'approved' ? 'معتمد ومخصوم' : 'مسودة'}
                </span>
              </div>
            </div>

            {selectedIssue.notes && (
              <div className="text-xs bg-amber-50 text-amber-900 p-2.5 rounded-lg border border-amber-200">
                <strong>ملاحظات:</strong> {selectedIssue.notes}
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-2.5">الصنف المنصرف</th>
                    <th className="p-2.5 text-center">الوحدة</th>
                    <th className="p-2.5 text-center">الكمية المنصرفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedIssue.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-gray-800">
                        {it.product_sku ? `[${it.product_sku}] ` : ''}
                        {it.product_name}
                      </td>
                      <td className="p-2.5 text-center text-gray-500">{it.unit || '--'}</td>
                      <td className="p-2.5 text-center font-bold text-red-700">
                        -{formatNumber(it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIssue(null)}>
                إغلاق
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handlePrint(selectedIssue)}
                className="bg-[#0F766E] hover:bg-[#115E59]"
              >
                طباعة الإذن
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
