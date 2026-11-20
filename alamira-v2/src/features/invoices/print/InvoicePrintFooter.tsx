import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintFooterProps {
  data: InvoicePrintModel;
}

export const InvoicePrintFooter: React.FC<InvoicePrintFooterProps> = ({ data }) => {
  const branches = data.company.branches || {
    qena: {
      name: 'فرع قنا',
      address: 'قنا - م الوقف',
      phones: ['01008949310', '01001239995'],
    },
    hurghada: {
      name: 'فرع الغردقة',
      address: 'الغردقة - شيراتون',
      phones: ['01001239995', '01020680007'],
    },
  };

  return (
    <div className="print-footer-container mt-4 break-inside-avoid">
      {/* Signatures Section */}
      <div className="print-signatures-section flex justify-between gap-3 text-center">
        {/* Customer Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2.5 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc] min-h-[90px] flex flex-col justify-between">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            توقيع المستلم (العميل)
          </div>
          <div className="sign-placeholder flex-1 min-h-[28px]"></div>
          <div className="text-[8pt] text-[#475569] break-words leading-tight px-1 pb-0.5">
            الاسم: {data.customer.name}
          </div>
        </div>

        {/* Accountant / Warehouse Manager Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2.5 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc] min-h-[90px] flex flex-col justify-between">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            المحاسب / مسؤول المخزن
          </div>
          <div className="sign-placeholder flex-1 min-h-[28px]"></div>
          <div className="text-[8pt] text-[#475569] leading-tight px-1 pb-0.5">
            التوقيع: ............................
          </div>
        </div>

        {/* Management & Company Seal Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2.5 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc] min-h-[90px] flex flex-col justify-between">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            اعتماد الإدارة وختم الشركة
          </div>
          <div className="sign-placeholder flex-1 min-h-[28px]"></div>
          <div className="text-[8pt] text-[#0a192f] font-extrabold leading-tight px-1 pb-0.5">
            {data.company.name}
          </div>
        </div>
      </div>

      {/* Redesigned Compact Official Branches & Contact Strip */}
      <div className="print-branches-footer mt-2.5 pt-2 border-t-[1.5px] border-[#0a192f] bg-[#f8fafc] px-3 py-1.5 rounded-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[8pt] text-[#334155] leading-normal">
          {/* QENA BRANCH (Right Column in RTL) */}
          <div className="text-right flex items-center justify-start gap-1.5 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c59b27] shrink-0" />
            <strong className="text-[#0a192f] font-extrabold">{branches.qena.name}:</strong>
            <span>{branches.qena.address}</span>
            <span className="text-[#cbd5e1] font-sans mx-0.5">|</span>
            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-[#0a192f]" dir="ltr">
              {branches.qena.phones.map((phone, idx) => (
                <React.Fragment key={phone}>
                  {idx > 0 && <span className="text-[#94a3b8] font-sans">-</span>}
                  <span className="select-all">{phone}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* HURGHADA BRANCH (Left Column in RTL) */}
          <div className="text-right sm:text-left flex items-center sm:justify-end gap-1.5 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c59b27] shrink-0 sm:order-last" />
            <strong className="text-[#0a192f] font-extrabold">{branches.hurghada.name}:</strong>
            <span>{branches.hurghada.address}</span>
            <span className="text-[#cbd5e1] font-sans mx-0.5">|</span>
            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-[#0a192f]" dir="ltr">
              {branches.hurghada.phones.map((phone, idx) => (
                <React.Fragment key={phone}>
                  {idx > 0 && <span className="text-[#94a3b8] font-sans">-</span>}
                  <span className="select-all">{phone}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Subtle Identity Note */}
        <div className="text-center text-[7pt] text-[#64748b] mt-1 pt-1 border-t border-[#e2e8f0]/60 font-medium">
          شركة {data.company.name} — نسعد بخدمتكم دائماً
        </div>
      </div>
    </div>
  );
};
