import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ShieldAlert, Clock } from 'lucide-react'
import { AuditLogEntry, AuditLogFilters as FiltersType } from '@/types'
import { useAuth } from '@/auth/AuthContext'
import { dataService } from '@/services/dataService'
import { Button } from '@/components/ui/Button'
import { AlertBanner } from '@/components/ui/AlertBanner'
import { AuditLogFilters } from './AuditLogFilters'
import { AuditLogTable } from './AuditLogTable'
import { AuditLogDetailModal } from './AuditLogDetailModal'
import { exportAuditLogsToExcel, exportAuditLogsToJson } from './exportAuditLog'
import { QENA_TIMEZONE_LABEL } from '@/lib/formatters'

const INITIAL_FILTERS: FiltersType = {
  category: 'all',
  outcome: 'all',
  user: 'all',
  search: '',
  date_from: '',
  date_to: '',
}

export const AuditLogView: React.FC = () => {
  const { currentUser } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filters, setFilters] = useState<FiltersType>(INITIAL_FILTERS)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await dataService.getAuditLogs()
      setLogs(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل سجل النشاط والرقابة'
      showNotification(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Filter logs locally based on current filters
  const filteredLogs = useMemo(() => {
    let result = [...logs]

    if (filters.category && filters.category !== 'all') {
      result = result.filter((l) => l.category === filters.category)
    }

    if (filters.outcome && filters.outcome !== 'all') {
      result = result.filter((l) => l.outcome === filters.outcome)
    }

    if (filters.user && filters.user !== 'all') {
      result = result.filter((l) => l.performed_by === filters.user)
    }

    if (filters.date_from) {
      result = result.filter((l) => l.timestamp.slice(0, 10) >= filters.date_from!)
    }

    if (filters.date_to) {
      result = result.filter((l) => l.timestamp.slice(0, 10) <= filters.date_to!)
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase()
      result = result.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.performed_by.toLowerCase().includes(q) ||
          (l.entity_name_or_number && l.entity_name_or_number.toLowerCase().includes(q)) ||
          (l.reason && l.reason.toLowerCase().includes(q))
      )
    }

    return result
  }, [logs, filters])

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  const handleSelectLog = (log: AuditLogEntry) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const handleExportExcel = () => {
    try {
      exportAuditLogsToExcel(filteredLogs, currentUser)
      showNotification('تم تصدير سجل النشاط والرقابة بنجاح بصيغة إكسل (XLSX)', 'success')
      loadLogs() // reload so the audit log of export appears
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تصدير ملف الإكسل'
      showNotification(msg, 'error')
    }
  }

  const handleExportJson = () => {
    try {
      exportAuditLogsToJson(filteredLogs, currentUser)
      showNotification('تم تصدير سجل النشاط والرقابة بنجاح بصيغة JSON', 'success')
      loadLogs() // reload so the audit log of export appears
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تصدير ملف JSON'
      showNotification(msg, 'error')
    }
  }

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {notification && (
        <AlertBanner
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>إدارة الرقابة والأمان (Super Admin)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-lg border border-slate-200 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>{QENA_TIMEZONE_LABEL}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#11243A]">سجل النشاط والرقابة</h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مباشرة ومبسطة للعمليات والحركات المنفذة بواسطة مستخدمي المنظومة
          </p>
        </div>

        {/* Secondary Unobtrusive Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            title="تصدير السجلات إلى ملف إكسل XLSX"
          >
            تصدير Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
            title="تصدير السجلات إلى ملف JSON"
          >
            تصدير JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? 'جاري التحديث...' : 'تحديث'}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <AuditLogFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
        totalCount={logs.length}
        filteredCount={filteredLogs.length}
      />

      {/* Table & List View */}
      <AuditLogTable logs={paginatedLogs} onSelectLog={handleSelectLog} />

      {/* Pagination Controls */}
      {filteredLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>عرض</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>سجل في الصفحة (إجمالي {filteredLogs.length})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs px-2.5 py-1"
            >
              السابق
            </Button>
            <span className="px-2 font-semibold">
              صفحة {currentPage} من {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs px-2.5 py-1"
            >
              التالي
            </Button>
          </div>
        </div>
      )}

      {/* Detail Viewer Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedLog(null)
        }}
      />
    </div>
  )
}
