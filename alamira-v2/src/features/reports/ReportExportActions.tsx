import React from 'react';
import { FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface ReportExportActionsProps {
  reportTitle: string;
  rowCount: number;
  onExportExcel: () => void;
  onPrint: () => void;
  isExporting?: boolean;
}

export const ReportExportActions: React.FC<ReportExportActionsProps> = ({
  reportTitle,
  rowCount,
  onExportExcel,
  onPrint,
  isExporting = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-extrabold text-[#0a192f]">{reportTitle}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
          {rowCount} سجل
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onExportExcel}
          disabled={isExporting || rowCount === 0}
          className="gap-2 text-[#107c41] border-[#a7f3d0] hover:bg-[#ecfdf5] font-bold text-xs"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري تصدير الإكسل...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#107c41]" />
              <span>تصدير التقرير (Excel)</span>
            </>
          )}
        </Button>

        <Button
          variant="primary"
          onClick={onPrint}
          disabled={rowCount === 0}
          className="bg-[#0a192f] hover:bg-[#0f2b5c] text-white border-none gap-2 font-bold text-xs"
        >
          <Printer className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>طباعة التقرير</span>
        </Button>
      </div>
    </div>
  );
};
