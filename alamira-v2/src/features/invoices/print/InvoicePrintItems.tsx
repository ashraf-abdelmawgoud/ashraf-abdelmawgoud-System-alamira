import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintItemsProps {
  data: InvoicePrintModel;
}

export const InvoicePrintItems: React.FC<InvoicePrintItemsProps> = ({ data }) => {
  const { items, hasItemDiscounts } = data;

  return (
    <table className="print-table w-full border-collapse my-2.5 text-[8.5pt]">
      <thead className="table-header-group">
        {hasItemDiscounts ? (
          <tr>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[30px]">
              م
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[90px]">
              كود الصنف
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-right">
              اسم الصنف والبيان
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[55px]">
              الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[65px]">
              الكمية
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-left w-[80px]">
              سعر الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-left w-[80px]">
              الإجمالي
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-left w-[70px]">
              الخصم
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-left w-[85px]">
              الصافي
            </th>
          </tr>
        ) : (
          <tr>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[35px]">
              م
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[110px]">
              كود الصنف
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-right">
              اسم الصنف والبيان
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[70px]">
              الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-center w-[75px]">
              الكمية
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-left w-[95px]">
              سعر الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-1.5 py-1.5 font-extrabold text-left w-[100px]">
              القيمة الإجمالية
            </th>
          </tr>
        )}
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr
            key={`${item.sku}-${idx}`}
            className={`break-inside-avoid ${
              idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
            }`}
          >
            <td className="border border-[#cbd5e1] p-1.5 text-center text-[#64748b]">
              {item.index}
            </td>
            <td className="border border-[#cbd5e1] p-1.5 text-center font-mono font-bold text-[#0f172a]">
              {item.sku}
            </td>
            <td className="border border-[#cbd5e1] p-1.5 text-right font-bold text-[#0f172a]">
              {item.name}
            </td>
            <td className="border border-[#cbd5e1] p-1.5 text-center text-[#334155]">
              {item.unit}
            </td>
            <td className="border border-[#cbd5e1] p-1.5 text-center font-bold text-[#0a192f]">
              {item.quantityFormatted}
            </td>
            <td className="border border-[#cbd5e1] p-1.5 text-left font-mono">
              {item.unitPrice.toFixed(2)} ج.م
            </td>
            {hasItemDiscounts ? (
              <>
                <td className="border border-[#cbd5e1] p-1.5 text-left font-mono">
                  {item.grossAmount.toFixed(2)} ج.م
                </td>
                <td className="border border-[#cbd5e1] p-1.5 text-left font-mono text-rose-700">
                  {item.discountAmount > 0
                    ? `-${item.discountAmount.toFixed(2)}`
                    : '-'}
                </td>
                <td className="border border-[#cbd5e1] p-1.5 text-left font-mono font-bold text-[#0a192f]">
                  {item.netAmount.toFixed(2)} ج.م
                </td>
              </>
            ) : (
              <td className="border border-[#cbd5e1] p-1.5 text-left font-mono font-bold text-[#0a192f]">
                {item.grossAmount.toFixed(2)} ج.م
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
