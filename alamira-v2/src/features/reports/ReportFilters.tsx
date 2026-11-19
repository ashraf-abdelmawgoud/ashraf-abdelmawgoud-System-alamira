import React from 'react';
import { Search, Boxes, Receipt, AlertTriangle, Truck, Users } from 'lucide-react';
import type { ReportCategory, ReportType } from '../../domain/reportCalculations';
import { REPORT_METADATA } from '../../services/mockReportService';

interface ReportFiltersProps {
  selectedCategory: ReportCategory;
  onCategoryChange: (cat: ReportCategory) => void;
  selectedReportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
  dateFrom: string;
  onDateFromChange: (val: string) => void;
  dateTo: string;
  onDateToChange: (val: string) => void;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onReset: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  selectedReportType,
  onReportTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  searchQuery,
  onSearchQueryChange,
  onReset,
}) => {
  const categoryTabs: { id: ReportCategory; label: string; icon: (isActive: boolean) => React.ReactNode }[] = [
    {
      id: 'stock',
      label: 'المخزون والأرصدة',
      icon: (active) => <Boxes className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#11243A]'}`} />,
    },
    {
      id: 'alerts',
      label: 'النواقص والحد الأدنى',
      icon: (active) => <AlertTriangle className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#D97706]'}`} />,
    },
    {
      id: 'movements',
      label: 'حركات وتدفق البضاعة',
      icon: (active) => <Truck className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#64748B]'}`} />,
    },
    {
      id: 'parties',
      label: 'العملاء والموردين',
      icon: (active) => <Users className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#64748B]'}`} />,
    },
    {
      id: 'sales',
      label: 'تقارير المبيعات',
      icon: (active) => <Receipt className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#0F766E]'}`} />,
    },
  ];

  const reportOptions = (Object.keys(REPORT_METADATA) as ReportType[]).filter((key) => {
    if (selectedCategory === 'all') return true;
    return REPORT_METADATA[key].category === selectedCategory;
  });

  const handleSelectTab = (id: ReportCategory) => {
    onCategoryChange(id);
    // Switch to the first report in this category if current doesn't match
    const firstInCat = (Object.keys(REPORT_METADATA) as ReportType[]).find(
      (k) => REPORT_METADATA[k].category === id
    );
    if (firstInCat) onReportTypeChange(firstInCat);
  };

  return (
    <div className="space-y-3.5 bg-white p-4 rounded-xl border border-[#D9E2EC] shadow-xs">
      {/* Category Navigation Tabs without 'جميع التقارير' */}
      <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-slate-100">
        {categoryTabs.map((tab) => {
          const isSelected = selectedCategory === tab.id;
          const isSales = tab.id === 'sales';
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? isSales
                    ? 'bg-[#0F766E] text-white shadow-xs border border-[#0F766E]'
                    : 'bg-[#11243A] text-white shadow-xs border border-[#11243A]'
                  : isSales
                    ? 'bg-emerald-50/70 text-[#0F766E] hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-[#F8FAFC] text-slate-700 hover:bg-slate-100 border border-[#D9E2EC]'
              }`}
            >
              {tab.icon(isSelected)}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Report Type Selector */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            نوع التقرير المطلوب
          </label>
          <select
            value={selectedReportType}
            onChange={(e) => onReportTypeChange(e.target.value as ReportType)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            {reportOptions.map((key) => (
              <option key={key} value={key}>
                {REPORT_METADATA[key].title}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">من تاريخ</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full h-9.5 px-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        {/* Date To */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full h-9.5 px-2.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        {/* Search inside report */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-slate-700 mb-1">بحث في السجلات</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="اسم الصنف، العميل، رقم الإذن..."
              className="w-full h-9.5 pr-8 pl-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Reset Filters */}
        <div className="md:col-span-1">
          <button
            type="button"
            onClick={onReset}
            className="w-full h-9.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="إعادة تعيين المرشحات"
          >
            إعادة
          </button>
        </div>
      </div>
    </div>
  );
};
