/**
 * Excel Export Utility for Al-Amira ERP V2
 * Uses xlsx (SheetJS) to serialize structured report records into formatted XLSX workbooks.
 * Fully compatible with Arabic RTL spreadsheets and protected against formula injection.
 */

import * as XLSX from 'xlsx';

export interface ExcelColumnDef<T = Record<string, unknown>> {
  header: string;
  key: keyof T | string;
  width?: number;
  format?: 'number' | 'currency' | 'date' | 'string';
}

/**
 * Sanitizes cell values to prevent Excel Formula Injection (CWE-1236)
 */
function sanitizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  const str = String(value).trim();
  // Prevent Excel from executing formulas if text begins with =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    // If it is a negative number represented as a valid numeric string, convert to number
    const num = Number(str);
    if (!isNaN(num)) {
      return num;
    }
    return `'${str}`;
  }

  return str;
}

/**
 * Exports data rows to a downloaded Excel (.xlsx) workbook.
 */
export function exportToExcel<T extends Record<string, unknown>>(options: {
  filename: string;
  sheetName?: string;
  data: T[];
  columns?: ExcelColumnDef<T>[];
}): { success: boolean; filename: string; rowCount: number; error?: string } {
  try {
    const { filename, sheetName = 'تقرير', data, columns } = options;

    if (!data || data.length === 0) {
      throw new Error('لا توجد بيانات متاحة للتصدير إلى ملف إكسل');
    }

    // Format rows according to column definitions or raw object keys
    const formattedRows = data.map((row) => {
      if (columns && columns.length > 0) {
        const outRow: Record<string, unknown> = {};
        for (const col of columns) {
          const rawVal = row[col.key as keyof T];
          outRow[col.header] = sanitizeCellValue(rawVal);
        }
        return outRow;
      } else {
        const outRow: Record<string, unknown> = {};
        for (const key of Object.keys(row)) {
          outRow[key] = sanitizeCellValue(row[key]);
        }
        return outRow;
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);

    // Enable Right-to-Left (RTL) mode for Arabic display in Microsoft Excel
    worksheet['!views'] = [{ RTL: true }];

    // Auto-compute column widths
    const headers = columns
      ? columns.map((c) => c.header)
      : Object.keys(formattedRows[0] || {});

    const colWidths = headers.map((header, idx) => {
      let maxLen = header.length;
      if (columns && columns[idx]?.width) {
        return { wch: columns[idx].width };
      }
      for (const r of formattedRows) {
        const val = String(r[header] ?? '');
        if (val.length > maxLen) maxLen = Math.min(val.length, 50);
      }
      return { wch: Math.max(maxLen + 4, 12) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const safeSheetName = sheetName.replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, safeFilename);

    return {
      success: true,
      filename: safeFilename,
      rowCount: formattedRows.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Excel Export Error:', err);
    return {
      success: false,
      filename: options.filename,
      rowCount: 0,
      error: message,
    };
  }
}
