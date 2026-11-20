import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintCustomerInfoProps {
  data: InvoicePrintModel;
}

export const InvoicePrintCustomerInfo: React.FC<InvoicePrintCustomerInfoProps> = ({
  data,
}) => {
  return (
    <div className="print-info-grid grid grid-cols-[1.15fr_0.85fr] gap-3 mb-2.5 text-[8.8pt]">
      {/* Customer Information Card */}
      <div className="print-card-box border-[1.5px] border-[#cbd5e1] rounded-md p-2.5 bg-[#f8fafc] leading-relaxed flex flex-col justify-between">
        <div>
          <div className="box-title text-[9pt] font-extrabold text-[#0a192f] border-b border-[#cbd5e1] pb-1.5 mb-2 flex items-center">
            بيانات العميل
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-1.5">
              <span className="text-[#64748b] shrink-0 font-medium">الاسم / الجهة:</span>
              <strong className="text-[#0f172a] font-bold break-words">{data.customer.name}</strong>
            </div>
            {data.customer.phone && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#64748b] shrink-0 font-medium">الهاتف:</span>
                <strong className="text-[#0f172a] font-mono font-bold" dir="ltr">
                  {data.customer.phone}
                </strong>
              </div>
            )}
            {data.customer.address && (
              <div className="flex items-start gap-1.5">
                <span className="text-[#64748b] shrink-0 font-medium">العنوان:</span>
                <strong className="text-[#0f172a] font-bold break-words">{data.customer.address}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction & Operation Metadata Card */}
      <div className="print-card-box border-[1.5px] border-[#cbd5e1] rounded-md p-2.5 bg-[#f8fafc] leading-relaxed flex flex-col justify-between">
        <div>
          <div className="box-title text-[9pt] font-extrabold text-[#0a192f] border-b border-[#cbd5e1] pb-1.5 mb-2 flex items-center">
            بيانات العملية والمعاملة
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#64748b] font-medium">طريقة السداد:</span>
              <strong className="text-[#0f172a] font-bold">{data.invoice.paymentTermLabel}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748b] font-medium">نوع المستند:</span>
              <strong className="text-[#0a192f] font-bold">
                {data.invoice.documentTypeLabel || 'بيان الأسعار'}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748b] font-medium">المحرر بواسطة:</span>
              <strong className="text-[#0f172a] font-bold">{data.invoice.creatorLabel}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
