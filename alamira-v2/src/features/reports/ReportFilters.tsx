import React from 'react';
import { Search, RotateCcw, Boxes, FileSpreadsheet, AlertTriangle, Truck, Users } from 'lucide-react';
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
  const categoryPills: { id: ReportCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'جميع التقارير', icon: <Boxes className="w-3.5 h-3.5" /> },
    { id: 'sales', label: 'تقارير المبيعات', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> },
    { id: 'stock', label: 'المخزون والأرصدة', icon: <Boxes className="w-3.5 h-3.5 text-blue-600" /> },
    { id: 'alerts', label: 'النواقص والحد الأدنى', icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> },
    { id: 'movements', label: 'حركات وتدفق البضاعة', icon: <Truck className="w-3.5 h-3.5 text-amber-600" /> },
    { id: 'parties', label: 'العملاء والموردين', icon: <Users className="w-3.5 h-3.5 text-purple-600" /> },
  ];

  const reportOptions = (Object.keys(REPORT_METADATA) as ReportType[]).filter((key) => {
    if (selectedCategory === 'all') return true;
    return REPORT_METADATA[key].category === selectedCategory;
  });

  return (
    <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
        {categoryPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => {
              onCategoryChange(pill.id);
              // Switch to the first report in this category if current doesn't match
              if (pill.id !== 'all') {
                const firstInCat = (Object.keys(REPORT_METADATA) as ReportType[]).find(
                  (k) => REPORT_METADATA[k].category === pill.id
                );
                if (firstInCat) onReportTypeChange(firstInCat);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === pill.id
                ? 'bg-[#0a192f] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            {pill.icon}
            <span>{pill.label}</span>
          </button>
        ))}
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
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        {/* Date To */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full h-9.5 px-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        {/* Instant Search */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            تصفية وبحث في الجدول
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="بحث في بيانات التقرير..."
              className="w-full h-9.5 pr-8 pl-3 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Reset Button */}
        <div className="md:col-span-1">
          <button
            type="button"
            onClick={onReset}
            className="w-full h-9.5 flex items-center justify-center gap-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="إعادة تعيين المرشحات"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">إعادة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
