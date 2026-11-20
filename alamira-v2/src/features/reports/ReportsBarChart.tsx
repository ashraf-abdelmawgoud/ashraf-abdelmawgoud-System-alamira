import React from 'react'

export interface BarChartItem {
  label: string
  value: number
  formattedValue?: string
  subLabel?: string
}

export interface ReportsBarChartProps {
  title: string
  subtitle?: string
  items: BarChartItem[]
  maxItems?: number
  height?: number
}

export const ReportsBarChart: React.FC<ReportsBarChartProps> = ({
  title,
  subtitle,
  items,
  maxItems = 7,
  height = 220,
}) => {
  const displayItems = items.slice(0, maxItems)
  const maxValue = Math.max(...displayItems.map((i) => i.value), 1)

  if (displayItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center text-slate-500 shadow-2xs">
        <h4 className="text-xs font-bold text-[#11243A] mb-1">{title}</h4>
        <p className="text-[11px] text-slate-400">لا توجد بيانات متاحة لعرض الرسم البياني للفترة المحددة</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-[#11243A]">{title}</h4>
          {subtitle && <p className="text-[11px] text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          أعلى {displayItems.length} عناصر
        </span>
      </div>

      <div className="space-y-2 pt-1" style={{ minHeight: height }}>
        {displayItems.map((item, idx) => {
          const percent = Math.min(100, Math.max(8, Math.round((item.value / maxValue) * 100)))
          const isTop = idx === 0

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#11243A] truncate max-w-[200px] sm:max-w-[280px]" title={item.label}>
                  {item.label}
                  {item.subLabel && <span className="text-[10px] text-slate-400 mr-1.5 font-normal">({item.subLabel})</span>}
                </span>
                <span className="font-bold text-[#11243A] tabular-nums text-xs">
                  {item.formattedValue || item.value.toLocaleString('en-US')}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTop ? 'bg-gradient-to-l from-[#D7A44A] to-[#11243A]' : 'bg-[#1E3A5F]'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
