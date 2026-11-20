import React from 'react';
import type { InvoicePrintModel } from './invoicePrintMapper';

interface InvoicePrintItemsProps {
  data: InvoicePrintModel;
}

export const InvoicePrintItems: React.FC<InvoicePrintItemsProps> = ({ data }) => {
  const { items, hasItemDiscounts } = data;

  return (
    <table className="print-table w-full border-collapse my-2 text-[8.5pt]">
      <thead className="table-header-group">
        {hasItemDiscounts ? (
          <tr>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[32px]">
              م
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[85px]">
              كود الصنف
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-right min-w-[170px]">
              اسم الصنف والبيان
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[55px]">
              الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[60px]">
              الكمية
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-left w-[75px]">
              سعر الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-left w-[75px]">
              الإجمالي
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-left w-[65px]">
              الخصم
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-left w-[80px]">
              الصافي
            </th>
          </tr>
        ) : (
          <tr>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[36px]">
              م
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[95px]">
              كود الصنف
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-right min-w-[200px]">
              اسم الصنف والبيان
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[65px]">
              الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2 py-2 font-extrabold text-center w-[70px]">
              الكمية
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-left w-[90px]">
              سعر الوحدة
            </th>
            <th className="bg-[#0a192f] text-white border border-[#0a192f] border-b-2 border-b-[#c59b27] px-2.5 py-2 font-extrabold text-left w-[100px]">
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
            <td className="border border-[#cbd5e1] px-2 py-2 text-center text-[#64748b]">
              {item.index}
            </td>
            <td className="border border-[#cbd5e1] px-2 py-2 text-center font-mono font-bold text-[#0f172a]">
              <bdi dir="ltr">{item.sku}</bdi>
            </td>
            <td className="border border-[#cbd5e1] px-2.5 py-2 text-right">
              <div
                className="font-bold text-[#0f172a] leading-relaxed break-words"
                dir="rtl"
                style={{
                  unicodeBidi: 'plaintext',
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                }}
              >
                <bdi dir="auto">{item.name}</bdi>
              </div>
            </td>
            <td className="border border-[#cbd5e1] px-2 py-2 text-center text-[#334155] whitespace-nowrap">
              <bdi>{item.unit}</bdi>
            </td>
            <td className="border border-[#cbd5e1] px-2 py-2 text-center font-bold text-[#0a192f] tabular-nums">
              <span dir="ltr">{item.quantityFormatted}</span>
            </td>
            <td className="border border-[#cbd5e1] px-2.5 py-2 text-left font-mono tabular-nums">
              <span dir="ltr">{item.unitPrice.toFixed(2)}</span> ج.م
            </td>
            {hasItemDiscounts ? (
              <>
                <td className="border border-[#cbd5e1] px-2.5 py-2 text-left font-mono tabular-nums">
                  <span dir="ltr">{item.grossAmount.toFixed(2)}</span> ج.م
                </td>
                <td className="border border-[#cbd5e1] px-2 py-2 text-left font-mono tabular-nums text-rose-700">
                  {item.discountAmount > 0 ? (
                    <>
                      <span dir="ltr">-{item.discountAmount.toFixed(2)}</span>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="border border-[#cbd5e1] px-2.5 py-2 text-left font-mono font-bold text-[#0a192f] tabular-nums">
                  <span dir="ltr">{item.netAmount.toFixed(2)}</span> ج.م
                </td>
              </>
            ) : (
              <td className="border border-[#cbd5e1] px-2.5 py-2 text-left font-mono font-bold text-[#0a192f] tabular-nums">
                <span dir="ltr">{item.grossAmount.toFixed(2)}</span> ج.م
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
