import React from 'react'
import {
  Search,
  LayoutDashboard,
  Receipt,
  Boxes,
  Users,
  Building2,
  DollarSign,
  Calendar,
} from 'lucide-react'
import type { Role } from '@/types'
import {
  ReportMainCategory,
  DateFilterPreset,
  SalesReportSubType,
  InventoryReportSubType,
  resolveDateFilter,
} from '@/services/reportingService'

export interface ReportFiltersProps {
  userRole?: Role
  selectedCategory: ReportMainCategory
  onCategoryChange: (cat: ReportMainCategory) => void
  salesSubType: SalesReportSubType
  onSalesSubTypeChange: (sub: SalesReportSubType) => void
  inventorySubType: InventoryReportSubType
  onInventorySubTypeChange: (sub: InventoryReportSubType) => void
  datePreset: DateFilterPreset
  onDatePresetChange: (preset: DateFilterPreset) => void
  dateFrom: string
  onDateFromChange: (val: string) => void
  dateTo: string
  onDateToChange: (val: string) => void
  searchQuery: string
  onSearchQueryChange: (val: string) => void
  onReset: () => void
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  userRole = 'ADMIN',
  selectedCategory,
  onCategoryChange,
  salesSubType,
  onSalesSubTypeChange,
  inventorySubType,
  onInventorySubTypeChange,
  datePreset,
  onDatePresetChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  searchQuery,
  onSearchQueryChange,
  onReset,
}) => {
  const isAdmin = userRole === 'ADMIN'

  // Define authorized category tabs
  const allCategoryTabs: {
    id: ReportMainCategory
    label: string
    icon: (active: boolean) => React.ReactNode
    adminOnly?: boolean
  }[] = [
    {
      id: 'overview',
      label: 'نظرة عامة',
      icon: (active) => <LayoutDashboard className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#11243A]'}`} />,
    },
    {
      id: 'sales',
      label: 'تقارير المبيعات',
      icon: (active) => <Receipt className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-emerald-700'}`} />,
    },
    {
      id: 'inventory',
      label: 'تقارير المخزون',
      icon: (active) => <Boxes className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#11243A]'}`} />,
      adminOnly: true,
    },
    {
      id: 'customers',
      label: 'تقارير العملاء',
      icon: (active) => <Users className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#11243A]'}`} />,
    },
    {
      id: 'suppliers',
      label: 'تقارير الموردين',
      icon: (active) => <Building2 className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#11243A]'}`} />,
      adminOnly: true,
    },
    {
      id: 'financial',
      label: 'التقارير المالية',
      icon: (active) => <DollarSign className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#D7A44A]'}`} />,
      adminOnly: true,
    },
  ]

  // Filter tabs by role
  const categoryTabs = allCategoryTabs.filter((tab) => !tab.adminOnly || isAdmin)

  const datePresets: { id: DateFilterPreset; label: string }[] = [
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'last_7_days', label: 'آخر 7 أيام' },
    { id: 'current_month', label: 'الشهر الحالي' },
    { id: 'previous_month', label: 'الشهر السابق' },
    { id: 'all', label: 'كافة الفترات' },
    { id: 'custom', label: 'مخصص...' },
  ]

  const handlePresetClick = (preset: DateFilterPreset) => {
    onDatePresetChange(preset)
    if (preset !== 'custom') {
      const resolved = resolveDateFilter(preset)
      onDateFromChange(resolved.from)
      onDateToChange(resolved.to)
    }
  }

  return (
    <div className="space-y-3.5 bg-white p-4 rounded-xl border border-[#D9E2EC] shadow-2xs no-print">
      {/* 1. Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2.5 border-b border-slate-100">
        {categoryTabs.map((tab) => {
          const isSelected = selectedCategory === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onCategoryChange(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#11243A] text-white shadow-xs border border-[#11243A]'
                  : 'bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#D9E2EC]'
              }`}
            >
              {tab.icon(isSelected)}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 2. Date Filter Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 ml-1 inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            الفترة:
          </span>
          {datePresets.map((p) => {
            const isPresetActive = datePreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  isPresetActive
                    ? 'bg-[#1E3A5F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="بحث سريع في سجلات التقرير..."
            className="w-full h-8.5 pr-8 pl-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#11243A]"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* 3. Detailed Filters (Custom Date Inputs & Category-Specific Dropdowns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end pt-2 border-t border-slate-100">
        {/* Sub-report selector when in Sales or Inventory */}
        {selectedCategory === 'sales' && (
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع تقرير المبيعات</label>
            <select
              value={salesSubType}
              onChange={(e) => onSalesSubTypeChange(e.target.value as SalesReportSubType)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#11243A]"
            >
              <option value="invoices_list">قائمة فواتير المبيعات المعتمدة</option>
              <option value="daily_summary">حركة المبيعات اليومية التجميعية</option>
              <option value="by_product">مبيعات الأصناف الأكثر طلباً</option>
              <option value="by_customer">مبيعات العملاء وتوزيع التعامل</option>
              {isAdmin && <option value="by_operator">مبيعات مسؤولي المبيعات (ADMIN)</option>}
            </select>
          </div>
        )}

        {selectedCategory === 'inventory' && (
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع تقرير المخزون</label>
            <select
              value={inventorySubType}
              onChange={(e) => onInventorySubTypeChange(e.target.value as InventoryReportSubType)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#11243A]"
            >
              <option value="current_stock">الأرصدة الحالية لجميع الأصناف</option>
              <option value="low_stock">الأصناف دون حد الأمان (النواقص)</option>
              <option value="out_of_stock">الأصناف المنتهية تماماً (رصيد صفر)</option>
              <option value="movements">سجل تدفق وحركات المخزن المعصومة</option>
            </select>
          </div>
        )}

        {/* Date From (Custom or Preset display) */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">من تاريخ (شامل)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              onDatePresetChange('custom')
              onDateFromChange(e.target.value)
            }}
            className="w-full h-9 px-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#11243A] font-mono"
          />
        </div>

        {/* Date To (Custom or Preset display) */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">إلى تاريخ (شامل)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              onDatePresetChange('custom')
              onDateToChange(e.target.value)
            }}
            className="w-full h-9 px-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#11243A] font-mono"
          />
        </div>

        {/* Reset Button */}
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={onReset}
            className="w-full h-9 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="إعادة تعيين المرشحات"
          >
            إعادة تعيين
          </button>
        </div>
      </div>
    </div>
  )
}
