import React from 'react';
import { Loader2 } from 'lucide-react';
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
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#D9E2EC] shadow-xs">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#11243A] animate-pulse" />
        <h2 className="text-sm font-extrabold text-[#11243A]">{reportTitle}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F8FAFC] text-slate-700 border border-[#D9E2EC] tabular-nums font-bold">
          {rowCount} سجل
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onExportExcel}
          disabled={isExporting || rowCount === 0}
          className="text-[#11243A] border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-xs"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 ml-1.5" />
              <span>جاري تصدير الإكسل...</span>
            </>
          ) : (
            <span>تصدير التقرير (Excel)</span>
          )}
        </Button>

        <Button
          variant="primary"
          onClick={onPrint}
          disabled={rowCount === 0}
          className="bg-[#11243A] hover:bg-[#1e3a5f] text-white font-bold text-xs border border-[#11243A]"
        >
          <span>طباعة التقرير</span>
        </Button>
      </div>
    </div>
  );
};
