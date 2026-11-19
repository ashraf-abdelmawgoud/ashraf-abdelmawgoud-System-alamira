import { AuditLogEntry, User } from '@/types'
import { formatCairoDateTime } from '@/lib/formatters'
import {
  AUDIT_ACTION_MAP,
  AUDIT_CATEGORY_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_OUTCOME_LABELS,
} from '@/domain/auditMetadata'
import { exportToExcel } from '@/lib/excelExport'
import { mockDataService } from '@/services/mockDataService'

/**
 * Export audit logs to formatted Excel (.xlsx) file
 */
export function exportAuditLogsToExcel(
  logs: AuditLogEntry[],
  actor?: User
): { success: boolean; filename: string; rowCount: number } {
  if (!logs || logs.length === 0) {
    throw new Error('لا توجد سجلات رقابية للتصدير')
  }

  const exportData = logs.map((log) => {
    const actionMeta = AUDIT_ACTION_MAP[log.action]
    const categoryLabel =
      (log.category ? AUDIT_CATEGORY_LABELS[log.category] : undefined) ||
      log.category ||
      'عام'
    const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type
    const outcomeMeta = AUDIT_OUTCOME_LABELS[log.outcome] || { label: log.outcome }
    const roleLabel = log.performed_by_role === 'ADMIN' ? 'مدير نظام' : 'مسؤول مبيعات'

    return {
      'المعرّف': log.id,
      'التاريخ والوقت (بتوقيت قنا – مصر)': formatCairoDateTime(log.timestamp),
      'العملية': actionMeta?.title || log.action,
      'التصنيف': categoryLabel,
      'الكيان': entityLabel,
      'رقم / اسم المستند': log.entity_name_or_number || log.entity_id,
      'المنفّذ': log.performed_by,
      'الدور الوظيفي': roleLabel,
      'النتيجة': outcomeMeta.label,
      'السبب / الملاحظات': log.reason || '--',
      'وصف الحركة': actionMeta?.description || '--',
    }
  })

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `AlAmira_AuditLog_${dateStr}.xlsx`

  const result = exportToExcel({
    filename,
    sheetName: 'سجل_الرقابة_والنشاط',
    data: exportData,
  })

  if (!result.success) {
    throw new Error(result.error || 'تعذر تصدير ملف الإكسل')
  }

  // Record audit event for log export
  mockDataService.logAuditExport('excel', actor)

  return result
}

/**
 * Export audit logs to JSON file
 */
export function exportAuditLogsToJson(
  logs: AuditLogEntry[],
  actor?: User
): { success: boolean; filename: string; rowCount: number } {
  if (!logs || logs.length === 0) {
    throw new Error('لا توجد سجلات رقابية للتصدير')
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const payload = {
    metadata: {
      system: 'Al-Amira ERP V2 Modernization',
      version: '2.0.0-mock',
      export_date: now,
      timezone: 'Africa/Cairo',
      timezone_label: 'بتوقيت قنا – مصر',
      total_records: logs.length,
      notice: 'ملف تصدير سجل النشاط والرقابة الشامل بصيغة JSON.',
    },
    records: logs.map((l) => ({
      ...l,
      qena_formatted_time: formatCairoDateTime(l.timestamp),
    })),
  }

  const jsonStr = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const filename = `AlAmira_AuditLog_${dateStr}.json`

  if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Record audit event for log export
  mockDataService.logAuditExport('json', actor)

  return { success: true, filename, rowCount: logs.length }
}
