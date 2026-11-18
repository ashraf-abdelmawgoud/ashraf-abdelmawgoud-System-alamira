import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintFooterProps {
  data: InvoicePrintModel;
}

export const InvoicePrintFooter: React.FC<InvoicePrintFooterProps> = ({ data }) => {
  return (
    <div className="print-footer-container mt-6 break-inside-avoid">
      {/* Signatures Section */}
      <div className="print-signatures-section flex justify-between gap-3 text-center">
        {/* Customer Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc]">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            توقيع المستلم (العميل)
          </div>
          <div className="sign-placeholder h-9"></div>
          <div className="text-[8pt] text-[#475569] truncate">
            الاسم: {data.customer.name}
          </div>
        </div>

        {/* Accountant / Warehouse Manager Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc]">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            المحاسب / مسؤول المخزن
          </div>
          <div className="sign-placeholder h-9"></div>
          <div className="text-[8pt] text-[#475569]">
            التوقيع: ............................
          </div>
        </div>

        {/* Management & Company Seal Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc]">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            اعتماد الإدارة وختم الشركة
          </div>
          <div className="sign-placeholder h-9"></div>
          <div className="text-[8pt] text-[#0a192f] font-extrabold">
            {data.company.name}
          </div>
        </div>
      </div>

      {/* Official Bottom Banner */}
      <div className="print-footer-banner mt-3.5 pt-2 border-t border-[#e2e8f0] text-center text-[8pt] text-[#64748b] leading-relaxed">
        <div className="font-bold text-[#334155]">
          {data.company.name} — {data.company.address}
        </div>
        <div className="text-[7.5pt] text-[#94a3b8] mt-0.5">
          نسعد دائماً بخدمتكم وتوفير أفضل العروض والمنتجات
        </div>
      </div>
    </div>
  );
};
