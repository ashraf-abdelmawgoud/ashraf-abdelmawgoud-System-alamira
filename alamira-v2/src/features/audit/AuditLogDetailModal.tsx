import React from 'react'
import {
  ShieldAlert,
  Clock,
  User as UserIcon,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Info,
} from 'lucide-react'
import { AuditLogEntry } from '@/types'
import { formatCairoDateTime } from '@/lib/formatters'
import {
  AUDIT_ACTION_MAP,
  AUDIT_CATEGORY_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_OUTCOME_LABELS,
} from '@/domain/auditMetadata'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface AuditLogDetailModalProps {
  log: AuditLogEntry | null
  isOpen: boolean
  onClose: () => void
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  isOpen,
  onClose,
}) => {
  if (!log) return null

  const actionMeta = AUDIT_ACTION_MAP[log.action]
  const categoryLabel =
    (log.category ? AUDIT_CATEGORY_LABELS[log.category] : undefined) ||
    log.category ||
    'عام'
  const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type
  const outcomeMeta = AUDIT_OUTCOME_LABELS[log.outcome] || { label: log.outcome }
  const isDenied = log.outcome === 'denied'

  const hasDiff = Boolean(
    log.before_state &&
      log.after_state &&
      Object.keys(log.before_state).length > 0 &&
      Object.keys(log.after_state).length > 0
  )

  // Merge keys from before and after
  const diffKeys = hasDiff
    ? Array.from(
        new Set([
          ...Object.keys(log.before_state || {}),
          ...Object.keys(log.after_state || {}),
        ])
      )
    : []

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '--'
    if (typeof val === 'boolean') return val ? 'نعم / مفعّل' : 'لا / معطل'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل السجل والرقابة الإدارية"
      maxWidth="3xl"
    >
      <div className="space-y-5 text-right text-xs">
        {/* Top Banner with Action, Time, Outcome */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            isDenied
              ? 'bg-rose-50/50 border-rose-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded-sm border border-slate-200">
                {log.id}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">{categoryLabel}</span>
            </div>
            <h3 className="text-base font-extrabold text-[#0a192f]">
              {actionMeta?.title || log.action}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {actionMeta?.description || 'حركة موثقة في سجل النظام'}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${outcomeMeta.badgeClass}`}
            >
              {isDenied ? (
                <XCircle className="w-4 h-4 text-rose-600" />
              ) : log.outcome === 'failure' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <span>{outcomeMeta.label}</span>
            </span>
            <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatCairoDateTime(log.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Reason / Security Alert Box (if present or denied) */}
        {log.reason && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              isDenied
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <div className="font-bold text-xs">
                {isDenied ? 'سبب الرفض الرقابي / منع الصلاحية' : 'ملاحظات الحركة'}
              </div>
              <div className="text-xs mt-0.5">{log.reason}</div>
            </div>
          </div>
        )}

        {/* Two-Column Grid: Actor & Entity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Actor Info */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              <span>بيانات المستخدم المنفّذ</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">الاسم:</span>
                <span className="font-bold text-slate-800">{log.performed_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الدور الوظيفي:</span>
                <span className="font-semibold text-slate-800">
                  {log.performed_by_role === 'ADMIN' ? 'مدير نظام (Super Admin)' : 'مسؤول مبيعات (Sales Operator)'}
                </span>
              </div>
              {log.performed_by_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">معرّف الحساب:</span>
                  <span className="font-mono text-slate-600">{log.performed_by_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Entity Info */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>المستند / الكيان المرتبط</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">نوع الكيان:</span>
                <span className="font-semibold text-slate-800">{entityLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المستند / الاسم:</span>
                <span className="font-bold text-slate-800">
                  {log.entity_name_or_number || log.entity_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">معرّف الكيان:</span>
                <span className="font-mono text-slate-600">{log.entity_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Before / After State Diff Table */}
        {hasDiff && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-slate-800">مقارنة التعديلات (الحالة السابقة مقابل الحالية)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">الحقل / البيان</th>
                    <th className="py-2 px-3 text-rose-800 bg-rose-50/50">الحالة السابقة</th>
                    <th className="py-2 px-3 text-emerald-800 bg-emerald-50/50">الحالة بعد التعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diffKeys.map((k) => {
                    const beforeVal = formatValue((log.before_state as Record<string, unknown>)[k])
                    const afterVal = formatValue((log.after_state as Record<string, unknown>)[k])
                    const isChanged = beforeVal !== afterVal

                    return (
                      <tr key={k} className={isChanged ? 'bg-amber-50/30 font-medium' : ''}>
                        <td className="py-2 px-3 font-mono text-slate-700">{k}</td>
                        <td className="py-2 px-3 text-rose-700 bg-rose-50/20">{beforeVal}</td>
                        <td className="py-2 px-3 text-emerald-700 bg-emerald-50/20">{afterVal}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Additional Details Payload */}
        {log.details && Object.keys(log.details).length > 0 && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold border-b border-slate-200 pb-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              <span>البيانات الإضافية والمرفقات الرقابية</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(log.details).map(([k, v]) => (
                <div key={k} className="flex justify-between bg-white px-2.5 py-1.5 rounded-md border border-slate-200">
                  <span className="text-slate-500 font-mono text-[11px]">{k}:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={formatValue(v)}>
                    {formatValue(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  )
}
