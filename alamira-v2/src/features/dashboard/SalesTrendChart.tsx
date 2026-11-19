import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { DailySalesTrend, SalesInvoice } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { TrendingUp, Calendar } from 'lucide-react'
import {
  TrendPeriodMode,
  TrendPoint,
  aggregateDailyTrend,
  aggregateWeeklyTrends,
  aggregateMonthlyTrends,
} from '@/domain/salesTrendAggregations'

export interface SalesTrendChartProps {
  /** Legacy or precomputed daily trends (used as fallback for weekly view) */
  trends?: DailySalesTrend[]
  /** Authoritative invoices for dynamic multi-period aggregations */
  invoices?: SalesInvoice[]
  /** Alias for backward compatibility */
  initialTrends?: DailySalesTrend[]
  /** Default active period (defaults to 'weekly') */
  defaultMode?: TrendPeriodMode
  /** Reference anchor date for calculations (defaults to today or latest invoice in Egypt time) */
  referenceDate?: string | Date
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  trends,
  invoices,
  initialTrends,
  defaultMode = 'weekly',
  referenceDate,
}) => {
  const [mode, setMode] = useState<TrendPeriodMode>(defaultMode)

  // Resolve active trend points based on selected period mode
  const activeTrends: TrendPoint[] = useMemo(() => {
    if (invoices && invoices.length > 0) {
      if (mode === 'daily') {
        return aggregateDailyTrend(invoices, referenceDate)
      }
      if (mode === 'weekly') {
        return aggregateWeeklyTrends(invoices, referenceDate, trends || initialTrends)
      }
      if (mode === 'monthly') {
        return aggregateMonthlyTrends(invoices, referenceDate)
      }
    }

    // Fallbacks when invoices are not provided or empty
    if (mode === 'weekly') {
      return aggregateWeeklyTrends([], referenceDate, trends || initialTrends)
    }
    if (mode === 'daily') {
      return aggregateDailyTrend([], referenceDate)
    }
    return aggregateMonthlyTrends([], referenceDate)
  }, [mode, invoices, referenceDate, trends, initialTrends])

  // Recalculate period total whenever selection or data changes
  const totalPeriodSales = useMemo(() => {
    return activeTrends.reduce((acc, t) => acc + t.totalSales, 0)
  }, [activeTrends])

  const maxSales = useMemo(() => {
    return Math.max(...activeTrends.map((t) => t.totalSales), 1)
  }, [activeTrends])

  const periodMeta = {
    daily: {
      title: 'مؤشر المبيعات اليومي',
      desc: 'إجمالي مبيعات اليوم المعتمدة (توقيت مصر) بالجنيه المصري',
    },
    weekly: {
      title: 'مؤشر المبيعات الأسبوعي',
      desc: 'توزيع قيم مبيعات آخر 7 أيام بالجنيه المصري',
    },
    monthly: {
      title: 'مؤشر المبيعات الشهري',
      desc: 'توزيع قيم مبيعات آخر 6 أشهر بالجنيه المصري',
    },
  }[mode]

  const formatInvoiceCountArabic = (count: number) => {
    if (count === 0) return 'لا توجد فواتير'
    if (count === 1) return 'فاتورة واحدة'
    if (count === 2) return 'فاتورتان'
    if (count >= 3 && count <= 10) return `${count} فواتير`
    return `${count} فاتورة`
  }

  // Adaptive grid layout class based on bucket count
  const gridColsClass =
    activeTrends.length === 6
      ? 'grid-cols-6'
      : activeTrends.length === 7
      ? 'grid-cols-7'
      : activeTrends.length === 8
      ? 'grid-cols-8'
      : activeTrends.length === 9
      ? 'grid-cols-9'
      : 'grid-cols-8'

  return (
    <Card className="border-[#E2E8F0] shadow-xs">
      <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 sm:p-5 pb-2 sm:pb-3 border-b border-[#E2E8F0]">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-[15px] text-[#11243A]">
            <TrendingUp className="w-5 h-5 text-[#0F766E] shrink-0" />
            <span>{periodMeta.title}</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-0.5">
            {periodMeta.desc}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start lg:self-auto">
          {/* RTL Segmented Control: Compact, Text-Only, Navy palette */}
          <div
            role="group"
            aria-label="نطاق مؤشر المبيعات الزمني"
            className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 gap-0.5 select-none"
          >
            <button
              type="button"
              onClick={() => setMode('daily')}
              aria-pressed={mode === 'daily'}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer text-xs font-bold ${
                mode === 'daily'
                  ? 'bg-[#11243A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              يومي
            </button>
            <button
              type="button"
              onClick={() => setMode('weekly')}
              aria-pressed={mode === 'weekly'}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer text-xs font-bold ${
                mode === 'weekly'
                  ? 'bg-[#11243A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              أسبوعي
            </button>
            <button
              type="button"
              onClick={() => setMode('monthly')}
              aria-pressed={mode === 'monthly'}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer text-xs font-bold ${
                mode === 'monthly'
                  ? 'bg-[#11243A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              شهري
            </button>
          </div>

          {/* Period Total Display Badge */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span>
              إجمالي الفترة:{' '}
              <strong className="text-[#11243A] font-bold tabular-nums">
                {formatCurrency(totalPeriodSales)}
              </strong>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3">
        {/* Responsive CSS Bar Chart */}
        <div className="w-full">
          {mode === 'daily' ? (
            /* Single Bar Centered View for Daily Mode */
            <div>
              <div className="flex justify-center items-end h-36 sm:h-44 w-full border-b border-[#E2E8F0] pb-2">
                {activeTrends.map((item) => {
                  const heightPercent = item.totalSales > 0 ? 75 : 8

                  return (
                    <div
                      key={item.dateKey}
                      className="flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 bg-[#11243A] text-white text-[10px] sm:text-[11px] py-1.5 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-md text-center border border-slate-700">
                        <p className="font-semibold text-slate-300 text-[9px] mb-0.5">
                          {item.details || item.label}
                        </p>
                        <p className="font-bold tabular-nums text-white">
                          {formatCurrency(item.totalSales)}
                        </p>
                        <p className="text-[9px] text-[#A7F3D0]">
                          {formatInvoiceCountArabic(item.invoicesCount)}
                        </p>
                      </div>

                      {/* Prominent Daily Total displayed clearly above the bar */}
                      <span className="block text-xs sm:text-sm font-bold text-[#11243A] mb-1.5 tabular-nums">
                        {formatCurrency(item.totalSales)}
                      </span>

                      {/* Single Bar: fixed/max-width centered */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-20 sm:w-24 max-w-[96px] rounded-t-md transition-all duration-300 group-hover:brightness-95 ${
                          item.totalSales === 0
                            ? 'bg-slate-200'
                            : 'bg-[#0F766E] border-t-2 border-[#D7A44A] shadow-xs'
                        }`}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Single Centered Label */}
              <div className="flex justify-center pt-2 text-center text-xs font-medium text-[#64748B] w-full">
                {activeTrends.map((item) => (
                  <div key={item.dateKey} className="w-20 sm:w-24 text-center">
                    <span className="block font-bold text-[#0F766E] text-sm">
                      {item.label}
                    </span>
                    <span className="block text-[10px] sm:text-xs text-slate-400 mt-0.5 tabular-nums">
                      {item.subLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Multi-Bar Grid View for Weekly and Monthly Modes */
            <div>
              <div
                className={`grid ${gridColsClass} gap-1.5 sm:gap-3.5 items-end h-36 sm:h-44 w-full border-b border-[#E2E8F0] pb-2`}
              >
                {activeTrends.map((item) => {
                  const heightPercent = Math.max(
                    Math.round((item.totalSales / maxSales) * 100),
                    item.totalSales > 0 ? 8 : 4
                  )

                  return (
                    <div
                      key={item.dateKey}
                      className="flex flex-col items-center h-full justify-end group relative min-w-0"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 bg-[#11243A] text-white text-[10px] sm:text-[11px] py-1.5 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-md text-center border border-slate-700">
                        <p className="font-semibold text-slate-300 text-[9px] mb-0.5">
                          {item.details || item.label}
                        </p>
                        <p className="font-bold tabular-nums text-white">
                          {formatCurrency(item.totalSales)}
                        </p>
                        <p className="text-[9px] text-[#A7F3D0]">
                          {formatInvoiceCountArabic(item.invoicesCount)}
                        </p>
                      </div>

                      {/* Concise value on top of bar on tablet+ */}
                      <span className="hidden sm:block text-[10px] font-semibold text-[#64748B] mb-1 tabular-nums">
                        {item.totalSales >= 1000
                          ? `${Math.round(item.totalSales / 1000)}k`
                          : item.totalSales > 0
                          ? `${Math.round(item.totalSales)}`
                          : '0'}
                      </span>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[34px] sm:max-w-[40px] rounded-t-md transition-all duration-300 group-hover:brightness-95 ${
                          item.isCurrent
                            ? 'bg-[#0F766E] border-t-2 border-[#D7A44A] shadow-xs'
                            : item.totalSales === 0
                            ? 'bg-slate-200'
                            : 'bg-[#0F766E]/70 hover:bg-[#0F766E]'
                        }`}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Labels Row below bars */}
              <div
                className={`grid ${gridColsClass} gap-1.5 sm:gap-3.5 pt-2 text-center text-[10px] sm:text-xs font-medium text-[#64748B] w-full`}
              >
                {activeTrends.map((item) => (
                  <div key={item.dateKey} className="min-w-0 truncate">
                    <span
                      className={`block truncate ${
                        item.isCurrent
                          ? 'font-bold text-[#0F766E]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[8px] sm:text-[10px] text-slate-400 mt-0.5 tabular-nums">
                      {item.subLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
