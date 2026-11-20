import React, { useState } from 'react';
import { FileSpreadsheet, ChevronRight, ChevronLeft } from 'lucide-react';

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
  align?: 'right' | 'center' | 'left';
}

interface ReportDataTableProps {
  columns: ColumnDef[];
  data: Record<string, unknown>[];
  searchQuery?: string;
  pageSize?: number;
}

export const ReportDataTable: React.FC<ReportDataTableProps> = ({
  columns,
  data,
  searchQuery = '',
  pageSize = 25,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side quick search filtering
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, data]);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-500 shadow-2xs">
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

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const formatCellValue = (key: string, val: unknown) => {
    if (val === null || val === undefined || val === '') return '--';

    if (key === 'status') {
      const strVal = String(val);
      const isPositive = ['معتمد', 'معتمدة', 'نشط', 'آمن', 'متوفر', 'معتمدة ومصروفة'].includes(strVal);
      const isWarning = ['أوشك على النفاد', 'تنبيه عاجل', 'دون الحد الأدنى', 'منخفض'].includes(strVal);
      const isDanger = ['رصيد صفري / منتهي', 'ملغاة', 'معطل', 'نفد', 'منتهي تماماً'].includes(strVal);

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
      if (
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('cost') ||
        key.toLowerCase().includes('total') ||
        key.toLowerCase().includes('discount') ||
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('valuation') ||
        key.toLowerCase().includes('balance') ||
        key.toLowerCase().includes('purchases') ||
        key.toLowerCase().includes('revenue')
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
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-[#E2E8F0] shadow-2xs">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#475569] border-b border-[#E2E8F0]">
              <th className="py-2.5 px-3 text-center w-10 font-semibold text-[#475569]">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-3.5 font-semibold tracking-tight text-[#475569] ${
                    col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                  }`}
                  style={{ width: col.width ? `${col.width * 8}px` : 'auto' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-[#F8FAFC] transition-colors"
              >
                <td className="py-2.5 px-3 text-center text-[#64748B] text-[11px] tabular-nums">
                  {startIndex + idx + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-2.5 px-3.5 text-[#11243A] tabular-nums ${
                      col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                    }`}
                  >
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
        {paginatedData.map((row, idx) => (
          <div
            key={idx}
            className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                #{startIndex + idx + 1}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 no-print">
          <div>
            عرض <span className="font-bold text-[#11243A] tabular-nums">{startIndex + 1}</span> إلى{' '}
            <span className="font-bold text-[#11243A] tabular-nums">
              {Math.min(startIndex + pageSize, filteredData.length)}
            </span>{' '}
            من أصل <span className="font-bold text-[#11243A] tabular-nums">{filteredData.length}</span> سجل
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-[#11243A] tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
