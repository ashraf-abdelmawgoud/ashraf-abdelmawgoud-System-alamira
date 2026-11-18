import React, { useRef, useState, useEffect } from 'react';
import type { SalesInvoice, Customer } from '../../../types';
import { mapInvoiceToPrintModel } from './invoicePrintMapper';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { InvoicePrintActions } from './InvoicePrintActions';
import { printInvoice } from './printInvoice';
import { exportInvoicePng } from './exportInvoicePng';

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) {
    return null;
  }

  const printModel = mapInvoiceToPrintModel(invoice, customer);

  const handlePrint = () => {
    const success = printInvoice(sheetRef.current);
    if (!success && onNotification) {
      onNotification('تعذر بدء عملية الطباعة، يرجى المحاولة مرة أخرى', 'error');
    }
  };

  const handleExportPng = async () => {
    if (!sheetRef.current) return;
    setIsExporting(true);
    try {
      const result = await exportInvoicePng(sheetRef.current, invoice.invoice_number);
      if (result.success) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Top Action Header Bar */}
      <div className="shrink-0 shadow-md z-10">
        <InvoicePrintActions
          onPrint={handlePrint}
          onExportPng={handleExportPng}
          onClose={onClose}
          isExporting={isExporting}
        />
      </div>

      {/* Sheet Preview Scroll Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 md:p-8 bg-[#cbd5e1] flex justify-center items-start">
        <div className="max-w-full">
          <div className="relative shadow-2xl transition-transform origin-top">
            <InvoicePrintTemplate ref={sheetRef} data={printModel} />
          </div>
        </div>
      </div>
    </div>
  );
};
