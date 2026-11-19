import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { SalesInvoice, Customer } from '../../../types';
import { mapInvoiceToPrintModel } from './invoicePrintMapper';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { InvoicePrintActions } from './InvoicePrintActions';
import { printInvoice } from './printInvoice';
import { exportInvoicePng } from './exportInvoicePng';
import { dataService } from '@/services/dataService';
import { useAuth } from '../../../auth/AuthContext';

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
  const [isExporting, setIsExporting] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual'>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [sheetHeight, setSheetHeight] = useState<number>(1123);

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
        onClose();
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
  }, [isOpen, onClose, updateDimensions]);

  if (!isOpen || !invoice) {
    return null;
  }

  const printModel = mapInvoiceToPrintModel(invoice, customer);

  const handlePrint = () => {
    const success = printInvoice(sheetRef.current);
    if (success) {
      dataService.logInvoicePrint(invoice.id, invoice.invoice_number, currentUser);
    } else if (onNotification) {
      onNotification('تعذر بدء عملية الطباعة، يرجى المحاولة مرة أخرى', 'error');
    }
  };

  const handleExportPng = async () => {
    if (!sheetRef.current) return;
    setIsExporting(true);
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
      } else {
        if (onNotification) {
          onNotification(result.error || 'فشل تصدير الفاتورة كصورة', 'error');
        }
      }
    } finally {
      setIsExporting(false);
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Top Action Header Bar */}
      <div className="shrink-0 shadow-md z-10 bg-white">
        <InvoicePrintActions
          onPrint={handlePrint}
          onExportPng={handleExportPng}
          onClose={onClose}
          isExporting={isExporting}
          scale={fitScale}
          zoomMode={zoomMode}
          onToggleZoom={() => setZoomMode((prev) => (prev === 'fit' ? 'actual' : 'fit'))}
        />
      </div>

      {/* Sheet Preview Scroll Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4 md:p-8 bg-[#cbd5e1] flex justify-center items-start"
      >
        {isScaled ? (
          /* Scaled responsive wrapper for small screens */
          <div
            className="relative flex justify-center shrink-0 transition-all duration-150"
            style={{
              width: `${Math.round(A4_WIDTH_PX * effectiveScale)}px`,
              height: `${Math.round(sheetHeight * effectiveScale)}px`,
              minHeight: `${Math.round(1123 * effectiveScale)}px`,
            }}
          >
            <div
              className="absolute top-0 shadow-2xl transition-transform duration-150 origin-top"
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
          <div className="max-w-full shrink-0">
            <div className="relative shadow-2xl transition-transform origin-top">
              <InvoicePrintTemplate ref={sheetRef} data={printModel} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
