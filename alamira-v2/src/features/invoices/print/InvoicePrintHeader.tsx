import React, { useState } from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintHeaderProps {
  data: InvoicePrintModel;
}

export const InvoicePrintHeader: React.FC<InvoicePrintHeaderProps> = ({ data }) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="print-header-container border-b-[2.5px] border-[#0a192f] pb-2.5 mb-3 flex justify-between items-start gap-4 relative">
      {/* Decorative navy and gold gradient underline */}
      <div
        className="absolute -bottom-[5px] right-0 left-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, #c59b27 0%, #d4af37 50%, #0a192f 100%)',
        }}
      />

      {/* Company Branding (Right Side) */}
      <div className="print-company-info text-right">
        <div className="print-logo-wrap mb-1">
          {!logoError ? (
            <img
              src={data.company.logoUrl}
              alt={data.company.name}
              className="print-official-logo h-12 max-w-[280px] w-auto object-contain block"
              onError={() => setLogoError(true)}
            />
          ) : (
            <h1 className="text-xl font-black text-[#0a192f] tracking-tight m-0">
              {data.company.name}
            </h1>
          )}
        </div>
        {/* Company Name below logo */}
        <div className="text-[10pt] font-black text-[#0a192f] tracking-tight leading-snug">
          {data.company.name}
        </div>
      </div>

      {/* Official Document Info Box (Top-Left) */}
      <div className="print-doc-badge text-right border-2 border-[#0a192f] rounded-md px-3.5 py-2 min-w-[210px] bg-[#f8fafc] shadow-xs relative overflow-hidden">
        {/* Decorative thin gold accent */}
        <div className="absolute top-0 right-0 left-0 h-[2.5px] bg-[#c59b27]" />

        <div className="doc-meta text-[8.5pt] font-bold text-[#334155] space-y-1.5 pt-0.5">
          <div className="flex justify-between items-center gap-2">
            <span className="text-[#64748b]">رقم الفاتورة:</span>
            <strong className="text-[#0a192f] font-mono text-[9pt] tracking-wide">
              {data.invoice.invoiceNumber}
            </strong>
          </div>
          <div className="flex justify-between items-center gap-2 pt-1 border-t border-[#e2e8f0]">
            <span className="text-[#64748b]">تاريخ التحرير:</span>
            <strong className="text-[#0a192f] tabular-nums font-mono text-[8.5pt]">
              {data.invoice.invoiceDate}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
