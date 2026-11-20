import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart3, AlertCircle, RefreshCw, Info } from 'lucide-react'
import {
  reportingService,
  ReportMainCategory,
  DateFilterPreset,
  SalesReportSubType,
  InventoryReportSubType,
  ReportResult,
} from '@/services/reportingService'
import { dataService } from '@/services/dataService'
import { useAuth } from '@/auth'
import { ReportFilters } from './ReportFilters'
import { ReportMetricCards } from './ReportMetricCards'
import { ReportExportActions } from './ReportExportActions'
import { ReportDataTable } from './ReportDataTable'
import { ReportsBarChart, BarChartItem } from './ReportsBarChart'
import { LoadingState } from '@/components/ui'
import { SalesTrendChart } from '@/features/dashboard/SalesTrendChart'
import type { SalesInvoice } from '@/types'

interface ReportsViewProps {
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNotification }) => {
  const { currentUser } = useAuth()
  const userRole = currentUser?.role || 'ADMIN'
  const isAdmin = userRole === 'ADMIN'

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<ReportMainCategory>('overview')
  const [salesSubType, setSalesSubType] = useState<SalesReportSubType>('invoices_list')
  const [inventorySubType, setInventorySubType] = useState<InventoryReportSubType>('current_stock')
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Report loading and results
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportResult | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  // Chart data
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])

  // Load auxiliary data for charts
  useEffect(() => {
    let isMounted = true
    dataService
      .getInvoices()
      .then((invs) => {
        if (!isMounted) return
        setSalesInvoices(invs)
      })
      .catch(() => {
        // Non-critical auxiliary chart failure
      })

    return () => {
      isMounted = false
    }
  }, [userRole])

  // Compute top products reactively with date filtering
  const topProductBars = useMemo<BarChartItem[]>(() => {
    const productMap = new Map<string, { name: string; sku: string; revenue: number }>()
    salesInvoices
      .filter((i) => {
        if (i.status !== 'approved') return false
        if (dateFrom && i.invoice_date < dateFrom) return false
        if (dateTo && i.invoice_date > dateTo) return false
        return true
      })
      .forEach((inv) => {
        ;(inv.items || []).forEach((item) => {
          const ex = productMap.get(item.product_id) || {
            name: item.product_name_snapshot || 'صنف',
            sku: item.product_sku_snapshot || '',
            revenue: 0,
          }
          ex.revenue += Number(item.net_amount || item.gross_amount || 0)
          productMap.set(item.product_id, ex)
        })
      })

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7)
      .map((p) => ({
        label: p.name,
        subLabel: p.sku,
        value: Math.round(p.revenue),
        formattedValue: `${Math.round(p.revenue).toLocaleString('en-US')} ج.م`,
      }))
  }, [salesInvoices, dateFrom, dateTo])

  // Fetch active report
  const fetchReport = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      let result: ReportResult

      switch (selectedCategory) {
        case 'sales':
          result = await reportingService.getSalesReport({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            subType: salesSubType,
            userRole,
          })
          break

        case 'inventory':
          if (!isAdmin) {
            throw new Error('غير مصرح لك باستعراض تقارير المخزون (ADMIN ONLY)')
          }
          result = await reportingService.getInventoryReport({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            subType: inventorySubType,
            userRole,
          })
          break

        case 'customers':
          result = await reportingService.getCustomerReport({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          })
          break

        case 'suppliers':
          if (!isAdmin) {
            throw new Error('غير مصرح لك باستعراض تقارير الموردين (ADMIN ONLY)')
          }
          result = await reportingService.getSupplierReport({
            userRole,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          })
          break

        case 'financial':
          if (!isAdmin) {
            throw new Error('غير مصرح لك باستعراض التقارير المالية (ADMIN ONLY)')
          }
          result = await reportingService.getFinancialReport({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            userRole,
          })
          break

        case 'overview':
        default:
          result = await reportingService.getOverviewReport({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            userRole,
          })
          break
      }

      setReportData(result)
    } catch (err: unknown) {
      console.error('Report Generation Error:', err)
      const msg = err instanceof Error ? err.message : 'تعذر تحميل التقرير. يرجى إعادة المحاولة.'
      setErrorMessage(msg)
      if (onNotification) {
        onNotification(msg, 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, salesSubType, inventorySubType, dateFrom, dateTo, userRole, isAdmin, onNotification])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleResetFilters = () => {
    setDatePreset('all')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }

  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      if (onNotification) onNotification('لا توجد بيانات متاحة للتصدير إلى ملف إكسل', 'error')
      return
    }

    setIsExportingExcel(true)
    try {
      const res = reportingService.exportToExcel(reportData)
      if (res.success) {
        if (onNotification) {
          onNotification(`تم تصدير التقرير بنجاح إلى ملف إكسل (${res.filename}) بعدد ${res.rowCount} سجل`, 'success')
        }
      } else {
        if (onNotification) onNotification(res.error || 'فشل تصدير ملف الإكسل', 'error')
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'فشل تصدير ملف الإكسل'
      if (onNotification) onNotification(err, 'error')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportCsv = () => {
    if (!reportData || reportData.rows.length === 0) {
      if (onNotification) onNotification('لا توجد بيانات متاحة للتصدير إلى ملف CSV', 'error')
      return
    }

    try {
      const res = reportingService.exportToCsv(reportData)
      if (onNotification) {
        onNotification(`تم تصدير ملف CSV بنجاح (${res.filename}) بعدد ${res.rowCount} سجل`, 'success')
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'فشل تصدير ملف CSV'
      if (onNotification) onNotification(err, 'error')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* 1. Header (No-Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E8F0] no-print">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#11243A] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#11243A] tracking-tight">
              التقارير العامة والمؤشرات
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            استعراض تقارير المبيعات المعتمدة، أرصدة المخزون، حركة العملاء، والمؤشرات المالية
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {selectedCategory === 'overview' && 'القسم: نظرة عامة شاملة'}
            {selectedCategory === 'sales' && 'القسم: تقارير المبيعات والفواتير'}
            {selectedCategory === 'inventory' && 'القسم: تقارير المخزون والأرصدة'}
            {selectedCategory === 'customers' && 'القسم: تقارير وحسابات العملاء'}
            {selectedCategory === 'suppliers' && 'القسم: تقارير وحسابات الموردين'}
            {selectedCategory === 'financial' && 'القسم: التقارير المالية والإيرادات'}
          </span>
        </div>
      </div>

      {/* 2. Filters Component */}
      <ReportFilters
        userRole={userRole}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        salesSubType={salesSubType}
        onSalesSubTypeChange={setSalesSubType}
        inventorySubType={inventorySubType}
        onInventorySubTypeChange={setInventorySubType}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onReset={handleResetFilters}
      />

      {/* 3. Loading State */}
      {loading ? (
        <div className="py-12 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <LoadingState message="جاري تحميل وتحليل بيانات التقرير..." />
        </div>
      ) : errorMessage ? (
        /* 4. Error State */
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-xl text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-900">تعذر تحميل التقرير. يرجى إعادة المحاولة.</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#11243A] text-white rounded-lg text-xs font-bold hover:bg-[#1E3A5F] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : reportData ? (
        <>
          {/* 5. Highlight KPI Cards */}
          <ReportMetricCards
            metrics={reportData.metrics.map((m) => ({
              id: m.id,
              label: m.label,
              value: m.value,
              highlightColor: m.variant === 'emerald' ? 'emerald' : m.variant === 'amber' ? 'amber' : m.variant === 'rose' ? 'rose' : 'navy',
            }))}
          />

          {/* 6. Accounting / Policy Notice */}
          {reportData.notice && (
            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{reportData.notice}</p>
            </div>
          )}

          {/* 7. Interactive Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
            {/* Sales Trend Chart */}
            {(selectedCategory === 'overview' || selectedCategory === 'sales') && salesInvoices.length > 0 && (
              <div className="h-full">
                <SalesTrendChart invoices={salesInvoices} defaultMode="weekly" />
              </div>
            )}

            {/* Top Products Bar Chart */}
            {(selectedCategory === 'overview' || (selectedCategory === 'sales' && salesSubType === 'by_product')) &&
              topProductBars.length > 0 && (
                <div className="h-full">
                  <ReportsBarChart
                    title="الأصناف الأعلى إيراداً"
                    subtitle="ترتيب الأصناف الأكثر طلباً ومساهمة في المبيعات المعتمدة"
                    items={topProductBars}
                  />
                </div>
              )}
          </div>

          {/* 8. Export & Toolbar Actions */}
          <div className="no-print">
            <ReportExportActions
              reportTitle={reportData.title}
              rowCount={reportData.rows.length}
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onPrint={handlePrint}
              isExporting={isExportingExcel}
            />
          </div>

          {/* 9. Printable Report Header (Print Media Only) */}
          <div className="hidden print:block pb-3 mb-3 border-b-2 border-[#11243A] text-right font-cairo">
            <h1 className="text-xl font-black text-[#11243A] mb-1">
              شركة الأميرة للتوريدات العامة والتجارة
            </h1>
            <h2 className="text-sm font-bold text-slate-700">{reportData.title}</h2>
            <div className="text-xs text-slate-500 font-mono mt-1">
              {reportData.dateRangeText} — تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
            </div>
          </div>

          {/* 10. Responsive Table & Mobile Cards */}
          <ReportDataTable
            columns={reportData.columns}
            data={reportData.rows}
            searchQuery={searchQuery}
            pageSize={25}
          />
        </>
      ) : null}
    </div>
  )
}
