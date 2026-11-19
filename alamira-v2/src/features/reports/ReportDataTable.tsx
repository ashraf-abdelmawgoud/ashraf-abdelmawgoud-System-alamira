import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

interface ReportDataTableProps {
  columns: ColumnDef[];
  data: Record<string, unknown>[];
  searchQuery?: string;
}

export const ReportDataTable: React.FC<ReportDataTableProps> = ({
  columns,
  data,
  searchQuery = '',
}) => {
  // Client-side quick search filtering
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-500 shadow-xs">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-700 mb-1">
          لا توجد بيانات مطابقة لمعايير التقرير والبحث
        </h3>
        <p className="text-xs text-slate-400">
          جرب تغيير الفترة الزمنية أو معايير التصفية أعلاه لعرض السجلات
        </p>
      </div>
    );
  }

  const formatCellValue = (key: string, val: unknown) => {
    if (val === null || val === undefined || val === '') return '--';

    if (key === 'status') {
      const strVal = String(val);
      const isPositive = ['معتمد', 'معتمدة', 'نشط', 'آمن'].includes(strVal);
      const isWarning = ['أوشك على النفاد', 'تنبيه عاجل'].includes(strVal);
      const isDanger = ['رصيد صفري / منتهي', 'ملغاة', 'معطل'].includes(strVal);

      const badgeClass = isPositive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : isWarning
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : isDanger
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-100 text-slate-700 border-slate-200';

      return (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}
        >
          {strVal}
        </span>
      );
    }

    if (typeof val === 'number') {
      // Check if monetary
      if (
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('cost') ||
        key.toLowerCase().includes('total') ||
        key.toLowerCase().includes('discount') ||
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('valuation') ||
        key.toLowerCase().includes('balance')
      ) {
        return (
          <span className="font-bold text-slate-900 tabular-nums">
            {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            ج.م
          </span>
        );
      }
      return <span className="font-bold text-slate-900 tabular-nums">{val.toLocaleString('en-US')}</span>;
    }

    return String(val);
  };

  return (
    <div className="space-y-3">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#475569] border-b border-[#E2E8F0]">
              <th className="py-2.5 px-3 text-center w-10 font-semibold text-[#475569]">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="py-2.5 px-3.5 font-semibold tracking-tight text-[#475569]"
                  style={{ width: col.width ? `${col.width * 8}px` : 'auto' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filteredData.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-[#F8FAFC] transition-colors"
              >
                <td className="py-2.5 px-3 text-center text-[#64748B] text-[11px] tabular-nums">
                  {idx + 1}
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="py-2.5 px-3.5 text-[#11243A] tabular-nums">
                    {formatCellValue(col.key, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-2.5">
        {filteredData.map((row, idx) => (
          <div
            key={idx}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                #{idx + 1}
              </span>
              {row.status !== undefined && (
                <div>{formatCellValue('status', row.status)}</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {columns
                .filter((col) => col.key !== 'status')
                .map((col) => (
                  <div key={col.key} className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      {col.header}
                    </span>
                    <div className="text-slate-800 text-[11.5px]">
                      {formatCellValue(col.key, row[col.key])}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
