import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Database } from 'lucide-react';
import type { ReportCategory, ReportType } from '../../domain/reportCalculations';
import { mockReportService, GeneratedReport } from '../../services/mockReportService';
import { dataService } from '../../services/dataService';
import { exportToExcel } from '../../lib/excelExport';
import { ReportFilters } from './ReportFilters';
import { ReportMetricCards } from './ReportMetricCards';
import { ReportExportActions } from './ReportExportActions';
import { ReportDataTable } from './ReportDataTable';
import { LoadingState } from '../../components/ui';

interface ReportsViewProps {
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNotification }) => {
  const isMock = dataService.isMock();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('stock');
  const [selectedReportType, setSelectedReportType] =
    useState<ReportType>('current_inventory');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(isMock);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<GeneratedReport | null>(null);

  const fetchReport = useCallback(async () => {
    if (!isMock) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await mockReportService.generateReport({
        reportType: selectedReportType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setReportData(result);
    } catch (err) {
      console.error('Report Generation Error:', err);
      if (onNotification) {
        onNotification('فشل توليد التقرير المطلوب، يرجى المحاولة لاحقاً', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [isMock, selectedReportType, dateFrom, dateTo, onNotification]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      if (onNotification) onNotification('لا توجد بيانات متاحة للتصدير', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const filename = `AlAmira_Report_${reportData.id}_${today}`;
      const columns = reportData.columnDefs.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width,
      }));

      const res = exportToExcel({
        filename,
        sheetName: reportData.title.slice(0, 31),
        data: reportData.rows,
        columns,
      });

      if (res.success) {
        if (onNotification) {
          onNotification(
            `تم تصدير التقرير بنجاح إلى ملف إكسل (${res.filename}) بعدد ${res.rowCount} سجل`,
            'success'
          );
        }
      } else {
        if (onNotification) {
          onNotification(res.error || 'فشل تصدير ملف الإكسل', 'error');
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Page Header (No-Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E8F0] no-print">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#11243A] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#11243A] tracking-tight">
              التقارير العامة والمؤشرات
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            استعراض تقارير المخزون والأرصدة، حركات التوريد والصرف، وتقارير المبيعات المالية
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {selectedCategory === 'sales'
              ? 'القسم النشط: تقارير المبيعات المالية'
              : 'القسم النشط: التقارير العامة والتشغيلية'}
          </span>
        </div>
      </div>

      {!isMock ? (
        <div className="bg-white rounded-xl border border-blue-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#11243A] mb-2">
            قسم التقارير قيد الربط المباشر مع قاعدة البيانات السحابية
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed mb-6">
            حرصاً على سلامة وموثوقية البيانات المحاسبية وعدم عرض أرقام تجريبية أو مضللة في بيئة الإنتاج،
            سيتم تفعيل الاستعلامات التجميعية السحابية المباشرة فور اكتمال التدشين.
            يمكنك متابعة حركة المبيعات المعتمدة ومؤشرات الإيرادات من خلال <strong>لوحة التحكم الرئيسية</strong>،
            ومراجعة تفاصيل الفواتير من قسم <strong>الفواتير</strong>.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
            حالة القسم: مجدول للربط السحابي في المرحلة القادمة (Post-Cutover)
          </div>
        </div>
      ) : (
        <>
          {/* Filters Section */}
          <div className="no-print">
            <ReportFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedReportType={selectedReportType}
              onReportTypeChange={setSelectedReportType}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onReset={handleResetFilters}
            />
          </div>

          {loading ? (
            <div className="py-12">
              <LoadingState message="جاري استخراج وتحليل بيانات التقرير..." />
            </div>
          ) : reportData ? (
            <>
              {/* Highlight KPIs / Summary Metrics */}
              <ReportMetricCards metrics={reportData.metrics} />

              {/* Export & Actions Toolbar */}
              <div className="no-print">
                <ReportExportActions
                  reportTitle={reportData.title}
                  rowCount={reportData.rows.length}
                  onExportExcel={handleExportExcel}
                  onPrint={handlePrint}
                  isExporting={isExporting}
                />
              </div>

              {/* Printable Report Header for print media only */}
              <div className="hidden print:block pb-3 mb-3 border-b-2 border-[#0a192f] text-right">
                <h1 className="text-xl font-black text-[#0a192f] mb-1">
                  شركة الأميرة للتوريدات العامة والتجارة
                </h1>
                <h2 className="text-sm font-bold text-slate-700">{reportData.title}</h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>

              {/* Report Data Table */}
              <ReportDataTable
                columns={reportData.columnDefs}
                data={reportData.rows}
                searchQuery={searchQuery}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
};
