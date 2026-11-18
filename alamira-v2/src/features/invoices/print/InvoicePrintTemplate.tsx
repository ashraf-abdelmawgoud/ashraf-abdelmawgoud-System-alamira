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
        className={`invoice-sheet bg-white text-[#0f172a] box-border select-text font-sans ${
          isPrintMode
            ? 'w-full print:block p-0'
            : 'w-[210mm] min-h-[297mm] p-[12mm_15mm] mx-auto shadow-xl rounded-xs'
        } ${className}`}
        style={{
          fontFamily: "'Cairo', system-ui, -apple-system, sans-serif",
          fontSize: '9.5pt',
          lineHeight: '1.45',
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
