import React from 'react';
import { MapPin, Phone } from 'lucide-react';
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
    <div className="print-footer-container mt-5 break-inside-avoid">
      {/* Signatures Section */}
      <div className="print-signatures-section flex justify-between gap-3 text-center">
        {/* Customer Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc]">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            توقيع المستلم (العميل)
          </div>
          <div className="sign-placeholder h-8"></div>
          <div className="text-[8pt] text-[#475569] truncate">
            الاسم: {data.customer.name}
          </div>
        </div>

        {/* Accountant / Warehouse Manager Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc]">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            المحاسب / مسؤول المخزن
          </div>
          <div className="sign-placeholder h-8"></div>
          <div className="text-[8pt] text-[#475569]">
            التوقيع: ............................
          </div>
        </div>

        {/* Management & Company Seal Signature Box */}
        <div className="print-sign-box flex-1 border border-dashed border-[#94a3b8] rounded-md p-2 text-[8.5pt] font-bold text-[#1e293b] bg-[#fafbfc]">
          <div className="text-[#0a192f] font-extrabold pb-1 border-b border-dashed border-[#cbd5e1] mb-1">
            اعتماد الإدارة وختم الشركة
          </div>
          <div className="sign-placeholder h-8"></div>
          <div className="text-[8pt] text-[#0a192f] font-extrabold">
            {data.company.name}
          </div>
        </div>
      </div>

      {/* Two-Column Official Branches & Contact Info */}
      <div className="print-branches-footer mt-3 pt-2.5 bg-[#f8fafc] rounded-md p-2.5 border border-[#cbd5e1] border-t-2 border-t-[#0a192f]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[#c59b27]/40">
          {/* QENA BRANCH (Right Column in RTL) */}
          <div className="text-right space-y-1 sm:pl-3">
            <div className="flex items-center gap-1.5 text-[#0a192f] font-black text-[8.8pt]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c59b27]" />
              <span>{branches.qena.name}</span>
            </div>
            <div className="flex items-start gap-1.5 text-[8pt] text-[#334155] leading-snug">
              <MapPin className="w-3 h-3 text-[#c59b27] shrink-0 mt-0.5" />
              <span>{branches.qena.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[8pt] text-[#334155] pt-0.5">
              <Phone className="w-3 h-3 text-[#c59b27] shrink-0" />
              <div className="flex items-center gap-2 font-mono font-bold text-[#0a192f]">
                {branches.qena.phones.map((phone, idx) => (
                  <React.Fragment key={phone}>
                    {idx > 0 && <span className="text-[#cbd5e1] font-sans">-</span>}
                    <span dir="ltr" className="select-all">
                      {phone}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* HURGHADA BRANCH (Left Column in RTL) */}
          <div className="text-right space-y-1 pt-2 sm:pt-0 sm:pr-3">
            <div className="flex items-center gap-1.5 text-[#0a192f] font-black text-[8.8pt]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c59b27]" />
              <span>{branches.hurghada.name}</span>
            </div>
            <div className="flex items-start gap-1.5 text-[8pt] text-[#334155] leading-snug">
              <MapPin className="w-3 h-3 text-[#c59b27] shrink-0 mt-0.5" />
              <span>{branches.hurghada.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[8pt] text-[#334155] pt-0.5">
              <Phone className="w-3 h-3 text-[#c59b27] shrink-0" />
              <div className="flex items-center gap-2 font-mono font-bold text-[#0a192f]">
                {branches.hurghada.phones.map((phone, idx) => (
                  <React.Fragment key={phone}>
                    {idx > 0 && <span className="text-[#cbd5e1] font-sans">-</span>}
                    <span dir="ltr" className="select-all">
                      {phone}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom subtle identity note */}
        <div className="text-center text-[7.5pt] text-[#64748b] mt-2 pt-1.5 border-t border-[#e2e8f0] font-medium">
          شركة {data.company.name} — نسعد بخدمتكم دائماً
        </div>
      </div>
    </div>
  );
};
