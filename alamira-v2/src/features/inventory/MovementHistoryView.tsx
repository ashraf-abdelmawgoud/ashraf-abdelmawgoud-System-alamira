import React, { useState } from 'react'
import {
  Search,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  FileText,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react'
import { Input, Badge, Table, Button } from '@/components/ui'
import { formatNumber, formatDate } from '@/lib/formatters'
import { InventoryMovementLog, InventoryMovementType } from '@/types'

interface MovementHistoryViewProps {
  movements: InventoryMovementLog[]
  onRefresh?: () => void
  loading?: boolean
}

export const MovementHistoryView: React.FC<MovementHistoryViewProps> = ({
  movements,
  onRefresh,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<InventoryMovementType | 'all'>('all')

  const filtered = movements.filter((m) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      m.source_doc_number.toLowerCase().includes(q) ||
      (m.product_name && m.product_name.toLowerCase().includes(q)) ||
      (m.product_sku && m.product_sku.toLowerCase().includes(q)) ||
      (m.notes && m.notes.toLowerCase().includes(q))

    const matchesType = typeFilter === 'all' || m.movement_type === typeFilter
    return matchesSearch && matchesType
  })

  const renderTypeBadge = (type: InventoryMovementType) => {
    switch (type) {
      case 'receipt':
        return (
          <Badge variant="emerald" className="inline-flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            إضافة (وارد)
          </Badge>
        )
      case 'issue':
        return (
          <Badge variant="warning" className="inline-flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            صرف مخزني
          </Badge>
        )
      case 'adjustment':
        return (
          <Badge variant="info" className="inline-flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            تسوية جردية
          </Badge>
        )
      case 'sale':
        return (
          <Badge variant="emerald" className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
            بيع بفاتورة
          </Badge>
        )
      case 'reversal':
        return (
          <Badge variant="danger" className="inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            إلغاء وإرجاع
          </Badge>
        )
      default:
        return <Badge variant="default">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>سجل حركات المخزون المعصوم (Audit Trail)</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            سجل تاريخي غير قابل للتعديل يوثق كافة حركات الوارد والمنصرف وتسويات الجرد اللحظية
          </p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs"
          >
            تحديث السجل
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="relative flex-1">
          <Input
            placeholder="بحث برقم المستند، الصنف، أو البيان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InventoryMovementType | 'all')}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">كافة أنواع الحركات</option>
            <option value="receipt">إضافة بضاعة (وارد)</option>
            <option value="issue">صرف مخزني (صادر)</option>
            <option value="adjustment">تسوية جردية</option>
            <option value="sale">بيع بفاتورة</option>
            <option value="reversal">إلغاء وإرجاع</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <thead className="bg-gray-50 text-gray-700 text-xs font-bold border-b border-gray-200">
            <tr>
              <th className="p-3.5 text-right">التوقيت والتاريخ</th>
              <th className="p-3.5 text-right">نوع الحركة</th>
              <th className="p-3.5 text-right">رقم المستند</th>
              <th className="p-3.5 text-right">الصنف</th>
              <th className="p-3.5 text-center">كمية وارد (+)</th>
              <th className="p-3.5 text-center">كمية صادر (-)</th>
              <th className="p-3.5 text-center">الرصيد بعد الحركة</th>
              <th className="p-3.5 text-right">البيان والملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  لا توجد حركات مخزون مسجلة مطابقة لمعايير البحث
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/70">
                  <td className="p-3.5 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="p-3.5">{renderTypeBadge(m.movement_type)}</td>
                  <td className="p-3.5 font-bold text-gray-900 text-xs tabular-nums">
                    {m.source_doc_number}
                  </td>
                  <td className="p-3.5 font-semibold text-gray-900">
                    <div>
                      <span>{m.product_name}</span>
                      {m.product_sku && (
                        <span className="block text-xs text-gray-400">
                          {m.product_sku}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-center font-bold text-emerald-700">
                    {m.quantity_in > 0 ? `+${formatNumber(m.quantity_in)}` : '-'}
                  </td>
                  <td className="p-3.5 text-center font-bold text-red-700">
                    {m.quantity_out > 0 ? `-${formatNumber(m.quantity_out)}` : '-'}
                  </td>
                  <td className="p-3.5 text-center font-black text-gray-900">
                    {formatNumber(m.stock_balance_after)} {m.unit || ''}
                  </td>
                  <td className="p-3.5 text-xs text-gray-600 max-w-xs truncate" title={m.notes}>
                    {m.notes || '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
            لا توجد حركات مخزون مسجلة
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-gray-900 block text-xs tabular-nums">
                    {m.source_doc_number}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatDate(m.created_at)}</span>
                </div>
                {renderTypeBadge(m.movement_type)}
              </div>

              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs space-y-1">
                <span className="font-bold text-gray-900 block">{m.product_name}</span>
                <div className="flex justify-between text-gray-600">
                  <span>الكمية:</span>
                  <span
                    className={`font-black ${
                      m.quantity_in > 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {m.quantity_in > 0
                      ? `+${formatNumber(m.quantity_in)}`
                      : `-${formatNumber(m.quantity_out)}`}{' '}
                    {m.unit}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
                  <span>الرصيد بعد الحركة:</span>
                  <span className="font-bold text-gray-900">
                    {formatNumber(m.stock_balance_after)} {m.unit}
                  </span>
                </div>
              </div>

              {m.notes && (
                <div className="text-[11px] text-gray-500">
                  <span className="text-gray-400">البيان: </span>
                  {m.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
