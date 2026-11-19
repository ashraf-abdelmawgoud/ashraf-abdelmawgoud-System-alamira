import React from 'react';
import { Printer, ImageDown, X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface InvoicePrintActionsProps {
  onPrint: () => void;
  onExportPng: () => void;
  onClose: () => void;
  isExporting?: boolean;
  scale?: number;
  zoomMode?: 'fit' | 'actual';
  onToggleZoom?: () => void;
}

export const InvoicePrintActions: React.FC<InvoicePrintActionsProps> = ({
  onPrint,
  onExportPng,
  onClose,
  isExporting = false,
  scale,
  zoomMode = 'fit',
  onToggleZoom,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3 sm:px-6 sm:py-3.5 bg-white border-b border-slate-200">
      {/* Utility / Meta row on mobile (order-2 on desktop, order-1 on mobile) */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:order-2 gap-2">
        <div className="flex items-center gap-2">
          {/* Mobile title & zoom badge */}
          <div className="flex items-center gap-1.5 text-slate-700 sm:hidden">
            <span className="text-xs font-bold text-slate-900">معاينة A4</span>
            {scale && scale < 0.98 ? (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                %{Math.round(scale * 100)}
              </span>
            ) : null}
          </div>

          {/* Zoom toggle button for mobile/compact screens */}
          {onToggleZoom && scale && scale < 0.98 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleZoom}
              className="h-8 px-2 text-xs font-medium text-slate-700 border-slate-200 hover:bg-slate-50 gap-1 sm:hidden"
              title={zoomMode === 'actual' ? 'ملاءمة للشاشة' : 'عرض بالحجم الأصلي'}
            >
              {zoomMode === 'actual' ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  <span>ملاءمة</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  <span>%100</span>
                </>
              )}
            </Button>
          ) : null}
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isExporting}
          className="h-8 px-2.5 gap-1.5 text-slate-600 hover:text-slate-900 shrink-0 font-medium"
        >
          <X className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm">إغلاق</span>
        </Button>
      </div>

      {/* Main Print & Export Action Buttons */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto sm:order-1">
        <Button
          variant="primary"
          onClick={onPrint}
          disabled={isExporting}
          className="bg-[#0a192f] hover:bg-[#0f2b5c] text-white border-none gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 h-9 sm:h-9.5 justify-center text-xs sm:text-sm w-full sm:w-auto shrink-0 shadow-xs"
        >
          <Printer className="w-4 h-4 shrink-0 text-[#d4af37]" />
          <span className="truncate">طباعة الفاتورة (A4)</span>
        </Button>

        <Button
          variant="secondary"
          onClick={onExportPng}
          disabled={isExporting}
          className="gap-1.5 sm:gap-2 font-bold px-3 sm:px-4 h-9 sm:h-9.5 justify-center text-xs sm:text-sm border-slate-300 hover:bg-slate-50 w-full sm:w-auto shrink-0 shadow-xs"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-emerald-600" />
              <span className="truncate">جاري الإنشاء...</span>
            </>
          ) : (
            <>
              <ImageDown className="w-4 h-4 shrink-0 text-emerald-700" />
              <span className="truncate">تصدير صورة PNG</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
