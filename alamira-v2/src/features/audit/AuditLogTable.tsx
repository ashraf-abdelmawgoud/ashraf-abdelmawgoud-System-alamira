import React from 'react'
import { Eye, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react'
import { AuditLogEntry } from '@/types'
import { formatCairoDateTime } from '@/lib/formatters'
import {
  AUDIT_ACTION_MAP,
  AUDIT_CATEGORY_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_OUTCOME_LABELS,
} from '@/domain/auditMetadata'
import { Button } from '@/components/ui/Button'

interface AuditLogTableProps {
  logs: AuditLogEntry[]
  onSelectLog: (log: AuditLogEntry) => void
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs, onSelectLog }) => {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 mb-1">لا توجد سجلات رقابية مطابقة</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          لم يتم العثور على أي حركات رقابية تطابق محددات البحث والتصفية الحالية. جرّب تعديل الفلاتر أو إعادة ضبطها.
        </p>
      </div>
    )
  }

  const renderOutcomeBadge = (outcome: AuditLogEntry['outcome']) => {
    const meta = AUDIT_OUTCOME_LABELS[outcome] || { label: outcome, badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' }
    let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    if (outcome === 'denied') {
      icon = <XCircle className="w-3.5 h-3.5 text-rose-600" />
    } else if (outcome === 'failure') {
      icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}
      >
        {icon}
        <span>{meta.label}</span>
      </span>
    )
  }

  const renderRoleBadge = (role: AuditLogEntry['performed_by_role']) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          مدير نظام
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        مسؤول مبيعات
      </span>
    )
  }

  return (
    <div className="space-y-3">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold select-none">
            <tr>
              <th className="py-3 px-4">التاريخ والوقت (بتوقيت قنا)</th>
              <th className="py-3 px-4">المنفّذ والدور</th>
              <th className="py-3 px-4">العملية والتصنيف</th>
              <th className="py-3 px-4">الكيان / المستند</th>
              <th className="py-3 px-4 text-center">النتيجة</th>
              <th className="py-3 px-4 text-left">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {logs.map((log) => {
              const actionMeta = AUDIT_ACTION_MAP[log.action]
              const categoryLabel =
                (log.category ? AUDIT_CATEGORY_LABELS[log.category] : undefined) ||
                log.category ||
                'عام'
              const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type
              const isDenied = log.outcome === 'denied'

              return (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    isDenied ? 'bg-rose-50/30' : ''
                  }`}
                >
                  {/* Cairo Timestamp */}
                  <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                    {formatCairoDateTime(log.timestamp)}
                  </td>

                  {/* Performer */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {log.performed_by.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{log.performed_by}</div>
                        <div>{renderRoleBadge(log.performed_by_role)}</div>
                      </div>
                    </div>
                  </td>

                  {/* Action & Category */}
                  <td className="py-3 px-4 max-w-[240px]">
                    <div className="font-bold text-slate-900 truncate" title={actionMeta?.title || log.action}>
                      {actionMeta?.title || log.action}
                    </div>
                    <div className="text-[11px] text-slate-500">{categoryLabel}</div>
                  </td>

                  {/* Entity & Name/Number */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">
                      {log.entity_name_or_number || log.entity_id}
                    </span>
                    <span className="text-[11px] text-slate-500">{entityLabel}</span>
                  </td>

                  {/* Outcome */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {renderOutcomeBadge(log.outcome)}
                  </td>

                  {/* Action button */}
                  <td className="py-3 px-4 text-left whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectLog(log)}
                      className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض</span>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {logs.map((log) => {
          const actionMeta = AUDIT_ACTION_MAP[log.action]
          const categoryLabel =
            (log.category ? AUDIT_CATEGORY_LABELS[log.category] : undefined) ||
            log.category ||
            'عام'
          const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type
          const isDenied = log.outcome === 'denied'

          return (
            <div
              key={log.id}
              className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                isDenied ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              {/* Header with time and outcome */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                <span className="font-mono text-slate-500">{formatCairoDateTime(log.timestamp)}</span>
                {renderOutcomeBadge(log.outcome)}
              </div>

              {/* Action Title & Performer */}
              <div>
                <h4 className="text-sm font-bold text-slate-900">{actionMeta?.title || log.action}</h4>
                <p className="text-xs text-slate-500">{categoryLabel}</p>
              </div>

              {/* Entity info */}
              <div className="bg-slate-50 rounded-lg p-2.5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">المستند / الكيان:</span>
                  <span className="font-bold text-slate-800">
                    {log.entity_name_or_number || log.entity_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">النوع:</span>
                  <span className="text-slate-700">{entityLabel}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">المنفّذ:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">{log.performed_by}</span>
                    {renderRoleBadge(log.performed_by_role)}
                  </div>
                </div>
              </div>

              {/* Reason if present */}
              {log.reason && (
                <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <span className="font-bold">السبب: </span>
                  {log.reason}
                </div>
              )}

              {/* Footer action */}
              <div className="pt-1 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectLog(log)}
                  className="w-full text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>عرض التفاصيل الكاملة</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
