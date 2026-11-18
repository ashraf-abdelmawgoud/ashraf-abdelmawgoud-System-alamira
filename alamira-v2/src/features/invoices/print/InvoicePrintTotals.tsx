import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintTotalsProps {
  data: InvoicePrintModel;
}

export const InvoicePrintTotals: React.FC<InvoicePrintTotalsProps> = ({ data }) => {
  const { totals, invoice } = data;

  return (
    <div className="print-bottom-container flex justify-between items-start gap-3.5 mt-2.5 break-inside-avoid">
      {/* Notes and Tafqeet Column */}
      <div className="print-notes-column flex-1">
        <div className="print-tafqeet-box bg-[#f8fafc] border-[1.5px] border-[#cbd5e1] border-r-4 border-r-[#c59b27] rounded-sm p-2 text-[8.8pt] font-bold text-[#0f172a] leading-relaxed">
          <span className="text-[#64748b]">المبلغ بالحروف: </span>
          <strong className="text-[#0a192f]">{totals.tafqeetText}</strong>
        </div>

        {invoice.notes && (
          <div className="print-notes-block mt-2 text-[8.5pt] text-[#334155] bg-[#f8fafc] border border-[#cbd5e1] rounded-sm p-2">
            <strong className="text-[#0a192f] block mb-1">
              شروط وملاحظات الفاتورة:
            </strong>
            <div className="text-[8pt] text-[#334155] leading-normal whitespace-pre-line">
              {invoice.notes}
            </div>
          </div>
        )}
      </div>

      {/* Totals Table Column */}
      <div className="print-totals-column w-[320px]">
        <table className="print-totals-table w-full border-collapse text-[8.5pt] border-[1.5px] border-[#0a192f] rounded-sm overflow-hidden">
          <tbody>
            <tr className="border-b border-[#cbd5e1]">
              <td className="p-1.5 px-2 border-l border-[#cbd5e1] text-[#334155]">
                إجمالي البضاعة:
              </td>
              <td className="p-1.5 px-2 text-left font-mono font-bold text-[#0f172a]">
                {totals.grossAmount.toFixed(2)} ج.م
              </td>
            </tr>

            {totals.itemDiscountsAmount > 0 && (
              <>
                <tr className="border-b border-[#cbd5e1]">
                  <td className="p-1.5 px-2 border-l border-[#cbd5e1] text-[#334155]">
                    خصومات الأصناف:
                  </td>
                  <td className="p-1.5 px-2 text-left font-mono font-bold text-rose-700">
                    -{totals.itemDiscountsAmount.toFixed(2)} ج.م
                  </td>
                </tr>
                <tr className="border-b border-[#cbd5e1]">
                  <td className="p-1.5 px-2 border-l border-[#cbd5e1] text-[#334155]">
                    المجموع بعد خصم الأصناف:
                  </td>
                  <td className="p-1.5 px-2 text-left font-mono font-bold text-[#0f172a]">
                    {totals.subtotal.toFixed(2)} ج.م
                  </td>
                </tr>
              </>
            )}

            {totals.invoiceDiscountAmount > 0 && (
              <tr className="border-b border-[#cbd5e1]">
                <td className="p-1.5 px-2 border-l border-[#cbd5e1] text-[#334155]">
                  خصم الفاتورة العام:
                </td>
                <td className="p-1.5 px-2 text-left font-mono font-bold text-rose-700">
                  -{totals.invoiceDiscountAmount.toFixed(2)} ج.م
                </td>
              </tr>
            )}

            {totals.additionalCharges > 0 && (
              <tr className="border-b border-[#cbd5e1]">
                <td className="p-1.5 px-2 border-l border-[#cbd5e1] text-[#334155]">
                  مصاريف إضافية / شحن:
                </td>
                <td className="p-1.5 px-2 text-left font-mono font-bold text-emerald-700">
                  +{totals.additionalCharges.toFixed(2)} ج.م
                </td>
              </tr>
            )}

            <tr
              className="final-total-row text-white text-[10.5pt] font-black border-t-2 border-t-[#c59b27]"
              style={{
                background: 'linear-gradient(135deg, #0a192f 0%, #0f2b5c 100%)',
              }}
            >
              <td className="p-2 px-2.5 text-white">الصافي النهائي المستحق:</td>
              <td className="p-2 px-2.5 text-left font-mono text-white text-[11pt]">
                {totals.finalTotal.toFixed(2)} ج.م
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
