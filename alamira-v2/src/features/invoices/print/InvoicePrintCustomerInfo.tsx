import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintCustomerInfoProps {
  data: InvoicePrintModel;
}

export const InvoicePrintCustomerInfo: React.FC<InvoicePrintCustomerInfoProps> = ({
  data,
}) => {
  return (
    <div className="print-info-grid grid grid-cols-[1.15fr_0.85fr] gap-3 mb-3 text-[8.8pt]">
      {/* Customer Information Card */}
      <div className="print-card-box border-[1.5px] border-[#cbd5e1] rounded-md p-2.5 bg-[#f8fafc] leading-relaxed">
        <div className="box-title text-[9pt] font-extrabold text-[#0a192f] border-b border-[#cbd5e1] pb-1 mb-1.5 flex items-center">
          بيانات العميل المكرم
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#64748b]">الاسم / الجهة:</span>
          <strong className="text-[#0f172a]">{data.customer.name}</strong>
        </div>
        {data.customer.phone && (
          <div className="flex items-center gap-1">
            <span className="text-[#64748b]">الهاتف:</span>
            <strong className="text-[#0f172a] font-mono">{data.customer.phone}</strong>
          </div>
        )}
        {data.customer.address && (
          <div className="flex items-center gap-1">
            <span className="text-[#64748b]">العنوان:</span>
            <strong className="text-[#0f172a]">{data.customer.address}</strong>
          </div>
        )}
      </div>

      {/* Transaction & Operation Metadata Card */}
      <div className="print-card-box border-[1.5px] border-[#cbd5e1] rounded-md p-2.5 bg-[#f8fafc] leading-relaxed">
        <div className="box-title text-[9pt] font-extrabold text-[#0a192f] border-b border-[#cbd5e1] pb-1 mb-1.5 flex items-center">
          بيانات العملية والمعاملة
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#64748b]">طريقة السداد:</span>
          <strong className="text-[#0f172a]">{data.invoice.paymentTermLabel}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#64748b]">حالة المستند:</span>
          <strong
            className={
              data.invoice.status === 'approved'
                ? 'text-emerald-700 font-bold'
                : data.invoice.status === 'cancelled'
                  ? 'text-rose-700 font-bold'
                  : 'text-amber-700 font-bold'
            }
          >
            {data.invoice.statusLabel}
          </strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#64748b]">المحرر بواسطة:</span>
          <strong className="text-[#0f172a]">{data.invoice.creatorLabel}</strong>
        </div>
      </div>
    </div>
  );
};
