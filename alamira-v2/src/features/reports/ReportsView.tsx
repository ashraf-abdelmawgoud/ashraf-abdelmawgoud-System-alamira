import React, { useState, useEffect, useCallback } from 'react';
import type { ReportCategory, ReportType } from '../../domain/reportCalculations';
import { mockReportService, GeneratedReport } from '../../services/mockReportService';
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
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');
  const [selectedReportType, setSelectedReportType] =
    useState<ReportType>('current_inventory');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<GeneratedReport | null>(null);

  const fetchReport = useCallback(async () => {
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
  }, [selectedReportType, dateFrom, dateTo, onNotification]);

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
    </div>
  );
};
