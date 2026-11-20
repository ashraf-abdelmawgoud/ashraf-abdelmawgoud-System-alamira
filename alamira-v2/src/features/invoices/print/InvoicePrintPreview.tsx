import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { SalesInvoice, Customer } from '../../../types';
import { mapInvoiceToPrintModel } from './invoicePrintMapper';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { InvoicePrintActions } from './InvoicePrintActions';
import { printInvoice, isMobileDevice } from './printInvoice';
import { exportInvoicePng } from './exportInvoicePng';
import { dataService } from '@/services/dataService';
import { useAuth } from '../../../auth/AuthContext';
import { Share2, Download, X, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface InvoicePrintPreviewProps {
  invoice: SalesInvoice | null;
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const InvoicePrintPreview: React.FC<InvoicePrintPreviewProps> = ({
  invoice,
  customer,
  isOpen,
  onClose,
  onNotification,
}) => {
  const { currentUser } = useAuth();
  const sheetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual'>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [sheetHeight, setSheetHeight] = useState<number>(1123);
  const [exportedImage, setExportedImage] = useState<{
    url: string;
    fileName: string;
    blob?: Blob;
  } | null>(null);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
    if (sheetRef.current) {
      setSheetHeight(sheetRef.current.offsetHeight || 1123);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateDimensions();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (exportedImage) {
          setExportedImage(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateDimensions);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      if (sheetRef.current) resizeObserver.observe(sheetRef.current);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isOpen, onClose, updateDimensions, exportedImage]);

  if (!isOpen || !invoice) {
    return null;
  }

  const printModel = mapInvoiceToPrintModel(invoice, customer);

  const handlePrint = () => {
    if (isPrinting || isExporting) return;
    setIsPrinting(true);
    try {
      const success = printInvoice(sheetRef.current, {
        invoiceNumber: invoice.invoice_number,
      });
      if (success) {
        dataService.logInvoicePrint(invoice.id, invoice.invoice_number, currentUser);
        if (onNotification && isMobileDevice()) {
          onNotification('جاري فتح خيارات الطباعة / حفظ PDF...', 'info');
        }
      } else if (onNotification) {
        onNotification('تعذر بدء عملية الطباعة، يرجى المحاولة مرة أخرى أو تصدير الصورة', 'error');
      }
    } finally {
      setTimeout(() => setIsPrinting(false), 800);
    }
  };

  const handleExportPng = async () => {
    if (!sheetRef.current || isPrinting || isExporting) return;
    setIsExporting(true);
    if (onNotification) {
      onNotification('جاري تجهيز صورة الفاتورة بدقة عالية...', 'info');
    }

    try {
      const result = await exportInvoicePng(sheetRef.current, invoice.invoice_number);
      if (result.success) {
        dataService.logInvoiceExportPng(invoice.id, invoice.invoice_number, currentUser);
        if (onNotification) {
          onNotification(
            `تم تصدير الفاتورة كصورة PNG بنجاح: ${result.fileName}`,
            'success'
          );
        }

        // On mobile devices, open the preview dialog for easy long-press saving or sharing
        if (isMobileDevice() && (result.blobUrl || result.dataUrl)) {
          setExportedImage({
            url: result.blobUrl || result.dataUrl || '',
            fileName: result.fileName || `فاتورة_الأميرة_${invoice.invoice_number}.png`,
            blob: result.blob,
          });
        }
      } else {
        if (onNotification) {
          onNotification(result.error || 'تعذر تجهيز صورة الفاتورة. يرجى المحاولة مرة أخرى.', 'error');
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareExported = async () => {
    if (!exportedImage || !exportedImage.blob) return;
    try {
      const file = new File([exportedImage.blob], exportedImage.fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: exportedImage.fileName,
          text: `فاتورة مبيعات رقم ${invoice.invoice_number} - شركة الأميرة للتوريدات والتجارة العامة`,
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.warn('Share sheet error:', e);
      }
    }
  };

  // Calculate fit scale: 210mm is ~794px at 96 DPI
  const A4_WIDTH_PX = 794;
  // Account for container padding (p-2 on mobile is 16px total)
  const availableWidth = containerWidth > 0 ? containerWidth - 20 : A4_WIDTH_PX;
  const fitScale = availableWidth < A4_WIDTH_PX
    ? Math.max(0.25, Math.min(1, availableWidth / A4_WIDTH_PX))
    : 1;

  const effectiveScale = zoomMode === 'fit' ? fitScale : 1;
  const isScaled = effectiveScale < 0.99;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-preview-title"
        className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200 invoice-print-modal-backdrop"
      >
        {/* Top Action Header Bar */}
        <div className="shrink-0 shadow-md z-10 bg-white invoice-print-modal-actions no-print">
          <InvoicePrintActions
            onPrint={handlePrint}
            onExportPng={handleExportPng}
            onClose={onClose}
            isPrinting={isPrinting}
            isExporting={isExporting}
            scale={fitScale}
            zoomMode={zoomMode}
            onToggleZoom={() => setZoomMode((prev) => (prev === 'fit' ? 'actual' : 'fit'))}
          />
        </div>

        {/* Sheet Preview Scroll Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4 md:p-8 bg-[#cbd5e1] flex justify-center items-start invoice-print-modal-scroll"
        >
          {isScaled ? (
            /* Scaled responsive wrapper for small screens */
            <div
              className="relative flex justify-center shrink-0 transition-all duration-150 invoice-print-modal-scale-wrapper"
              style={{
                width: `${Math.round(A4_WIDTH_PX * effectiveScale)}px`,
                height: `${Math.round(sheetHeight * effectiveScale)}px`,
                minHeight: `${Math.round(1123 * effectiveScale)}px`,
              }}
            >
              <div
                className="absolute top-0 shadow-2xl transition-transform duration-150 origin-top invoice-print-modal-inner-scale"
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top center',
                  left: '50%',
                  marginLeft: `-${A4_WIDTH_PX / 2}px`,
                }}
              >
                <InvoicePrintTemplate ref={sheetRef} data={printModel} />
              </div>
            </div>
          ) : (
            /* Natural 100% size wrapper for desktop or zoomed view */
            <div className="max-w-full shrink-0 invoice-print-modal-scale-wrapper">
              <div className="relative shadow-2xl transition-transform origin-top invoice-print-modal-inner-scale">
                <InvoicePrintTemplate ref={sheetRef} data={printModel} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Interactive Image Save & Share Modal */}
      {exportedImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                صورة الفاتورة المعتمدة (جاهزة للحفظ)
              </h3>
              <button
                type="button"
                onClick={() => setExportedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Tip */}
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                💡 نصيحة: يمكنك أيضاً الضغط مطولاً على الصورة لحفظها مباشرة في ألبوم الصور بهاتفك.
              </span>
            </div>

            {/* Image Preview Scroll */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center items-start">
              <img
                src={exportedImage.url}
                alt={exportedImage.fileName}
                className="max-w-full h-auto rounded-lg shadow-md border border-slate-200 object-contain select-all"
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleShareExported}
                    className="flex-1 bg-[#11243A] hover:bg-[#1E3A5F] text-xs gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>مشاركة عبر التطبيقات</span>
                  </Button>
                )}
                <a
                  href={exportedImage.url}
                  download={exportedImage.fileName}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex-1 text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل الصورة</span>
                </a>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExportedImage(null)}
                className="text-xs"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
