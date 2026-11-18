import React from 'react';
import { Printer, ImageDown, X, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface InvoicePrintActionsProps {
  onPrint: () => void;
  onExportPng: () => void;
  onClose: () => void;
  isExporting?: boolean;
}

export const InvoicePrintActions: React.FC<InvoicePrintActionsProps> = ({
  onPrint,
  onExportPng,
  onClose,
  isExporting = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          onClick={onPrint}
          disabled={isExporting}
          className="bg-[#0a192f] hover:bg-[#0f2b5c] text-white border-none gap-2 font-bold px-4"
        >
          <Printer className="w-4 h-4 text-[#d4af37]" />
          <span>طباعة الفاتورة (A4)</span>
        </Button>

        <Button
          variant="secondary"
          onClick={onExportPng}
          disabled={isExporting}
          className="gap-2 font-bold px-4"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>جاري إنشاء صورة PNG...</span>
            </>
          ) : (
            <>
              <ImageDown className="w-4 h-4 text-emerald-700" />
              <span>تصدير صورة PNG</span>
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={isExporting}
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <X className="w-4 h-4" />
          <span>إغلاق</span>
        </Button>
      </div>
    </div>
  );
};
