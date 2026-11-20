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

      {/* Company Branding */}
      <div className="print-company-info text-right">
        <div className="print-logo-wrap mb-1">
          {!logoError ? (
            <img
              src={data.company.logoUrl}
              alt={data.company.name}
              className="print-official-logo h-12 max-w-[280px] w-auto object-contain block mb-1"
              onError={() => setLogoError(true)}
            />
          ) : (
            <h1 className="text-xl font-black text-[#0a192f] tracking-tight m-0">
              {data.company.name}
            </h1>
          )}
        </div>
        <div className="text-[8.5pt] text-[#334155] leading-snug">
          {data.company.address}
        </div>
      </div>

      {/* Official Document Badge */}
      <div className="print-doc-badge text-center border-2 border-[#0a192f] rounded-md px-4 py-2 min-w-[200px] bg-[#f8fafc] shadow-xs">
        <div className="doc-title text-[13.5pt] font-black text-[#0a192f] pb-1 mb-1.5 border-b-[1.5px] border-[#c59b27] tracking-tight">
          فاتورة مبيعات
        </div>
        <div className="doc-meta text-[8.5pt] font-bold text-[#334155] text-right space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">رقم الفاتورة:</span>
            <strong className="text-[#0a192f] font-mono text-[9pt]">
              {data.invoice.invoiceNumber}
            </strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#64748b]">تاريخ التحرير:</span>
            <strong className="text-[#0a192f]">{data.invoice.invoiceDate}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
