import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { DailySalesTrend } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { TrendingUp, Calendar } from 'lucide-react'

export interface SalesTrendChartProps {
  trends: DailySalesTrend[]
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ trends }) => {
  const maxSales = Math.max(...trends.map((t) => t.totalSales), 1)
  const totalPeriodSales = trends.reduce((acc, t) => acc + t.totalSales, 0)

  return (
    <Card className="border-[#E2E8F0] shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 sm:p-5 pb-2 sm:pb-3 border-b border-[#E2E8F0]">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-[15px] text-[#11243A]">
            <TrendingUp className="w-5 h-5 text-[#0F766E] shrink-0" />
            <span>مؤشر المبيعات الأسبوعي</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-0.5">
            توزيع قيم مبيعات آخر 7 أيام بالجنيه المصري
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>إجمالي الفترة: <strong className="text-[#11243A] font-semibold tabular-nums">{formatCurrency(totalPeriodSales)}</strong></span>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-3">
        {/* Responsive CSS Bar Chart */}
        <div className="w-full">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-4 items-end h-36 sm:h-44 w-full border-b border-[#E2E8F0] pb-2">
            {trends.map((item, index) => {
              const heightPercent = Math.max(
                Math.round((item.totalSales / maxSales) * 100),
                item.totalSales > 0 ? 8 : 4
              )
              const isToday = index === trends.length - 1

              return (
                <div
                  key={item.date}
                  className="flex flex-col items-center h-full justify-end group relative min-w-0"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-[#11243A] text-white text-[10px] sm:text-[11px] py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-md text-center border border-slate-700">
                    <p className="font-semibold tabular-nums">{formatCurrency(item.totalSales)}</p>
                    <p className="text-[9px] text-slate-300">
                      {item.invoicesCount} فاتورة
                    </p>
                  </div>

                  {/* Value on top of bar on tablet+ */}
                  <span className="hidden sm:block text-[10px] font-semibold text-[#64748B] mb-1 tabular-nums">
                    {item.totalSales > 0 ? `${Math.round(item.totalSales / 1000)}k` : '0'}
                  </span>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[34px] sm:max-w-[40px] rounded-t-md transition-all duration-300 group-hover:brightness-95 ${
                      isToday
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

          {/* Days labels */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-4 pt-2 text-center text-[10px] sm:text-xs font-medium text-[#64748B] w-full">
            {trends.map((item, index) => {
              const isToday = index === trends.length - 1
              const shortDay = item.day.includes('اليوم')
                ? 'اليوم'
                : item.day.split(' ')[0]

              return (
                <div key={item.date} className="min-w-0 truncate">
                  <span className={`block truncate ${isToday ? 'font-semibold text-[#0F766E]' : 'text-[#64748B]'}`}>
                    {shortDay}
                  </span>
                  <span className="block text-[8px] sm:text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    {item.date}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
