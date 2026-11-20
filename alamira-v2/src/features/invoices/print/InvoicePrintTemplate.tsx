import { forwardRef } from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';
import { InvoicePrintHeader } from './InvoicePrintHeader';
import { InvoicePrintCustomerInfo } from './InvoicePrintCustomerInfo';
import { InvoicePrintItems } from './InvoicePrintItems';
import { InvoicePrintTotals } from './InvoicePrintTotals';
import { InvoicePrintFooter } from './InvoicePrintFooter';

interface InvoicePrintTemplateProps {
  data: InvoicePrintModel;
  className?: string;
  isPrintMode?: boolean;
}

export const InvoicePrintTemplate = forwardRef<HTMLDivElement, InvoicePrintTemplateProps>(
  ({ data, className = '', isPrintMode = false }, ref) => {
    return (
      <div
        ref={ref}
        id={isPrintMode ? 'print-area' : undefined}
        dir="rtl"
        lang="ar"
        className={`invoice-sheet bg-white text-[#0f172a] box-border select-text font-sans ${
          isPrintMode
            ? 'w-full print:block p-0'
            : 'w-[210mm] min-h-[297mm] p-[10mm_12mm] mx-auto shadow-xl rounded-xs'
        } ${className}`}
        style={{
          fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', Tahoma, system-ui, -apple-system, sans-serif",
          fontSize: '9.2pt',
          lineHeight: '1.42',
          letterSpacing: 'normal',
          textRendering: 'geometricPrecision',
          direction: 'rtl',
          textAlign: 'right',
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
      >
        <InvoicePrintHeader data={data} />
        <InvoicePrintCustomerInfo data={data} />
        <InvoicePrintItems data={data} />
        <InvoicePrintTotals data={data} />
        <InvoicePrintFooter data={data} />
      </div>
    );
  }
);

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';
