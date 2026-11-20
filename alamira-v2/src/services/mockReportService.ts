/**
 * Mock Report Service
 * Coordinates asynchronous mock data retrieval and runs domain calculations.
 */

import { dataService } from './dataService';
import { supabaseDataService } from './supabaseDataService';
import {
  ReportType,
  calculateCurrentInventoryReport,
  calculateValuationReport,
  calculateLowStockReport,
  calculateOutOfStockReport,
  calculateSalesReport,
  calculateDiscountsReport,
  calculatePurchasesReport,
  calculateMovementsReport,
  calculateDailySummary,
  calculateCustomerBalancesReport,
  calculateSupplierBalancesReport,
  ReportMetric,
} from '../domain/reportCalculations';

export interface GeneratedReport {
  id: ReportType;
  title: string;
  category: 'stock' | 'sales' | 'alerts' | 'movements' | 'parties';
  rows: Record<string, unknown>[];
  metrics: ReportMetric[];
  columnDefs: { header: string; key: string; width?: number }[];
}

export const REPORT_METADATA: Record<
  ReportType,
  {
    title: string;
    category: 'stock' | 'sales' | 'alerts' | 'movements' | 'parties';
    columns: { header: string; key: string; width?: number }[];
  }
> = {
  current_inventory: {
    title: 'تقرير أرصدة المخزون الحالي والكميات المتاحة',
    category: 'stock',
    columns: [
      { header: 'كود الصنف (SKU)', key: 'sku', width: 14 },
      { header: 'اسم الصنف والبيان', key: 'name', width: 32 },
      { header: 'التصنيف', key: 'category', width: 16 },
      { header: 'الوحدة', key: 'unit', width: 10 },
      { header: 'الرصيد المتاح', key: 'currentStock', width: 14 },
      { header: 'سعر الشراء (ج.م)', key: 'purchasePrice', width: 14 },
      { header: 'سعر البيع (ج.م)', key: 'sellingPrice', width: 14 },
      { header: 'القيمة الإجمالية (ج.م)', key: 'totalCost', width: 18 },
    ],
  },
  valuation: {
    title: 'تقرير القيمة التقديرية للمخزون (بسعر الشراء)',
    category: 'stock',
    columns: [
      { header: 'كود الصنف', key: 'sku', width: 14 },
      { header: 'اسم الصنف والبيان', key: 'name', width: 32 },
      { header: 'الوحدة', key: 'unit', width: 10 },
      { header: 'الرصيد الفعلي', key: 'currentStock', width: 14 },
      { header: 'تكلفة الشراء (ج.م)', key: 'purchasePrice', width: 16 },
      { header: 'القيمة الإجمالية المقدرة (ج.م)', key: 'valuation', width: 22 },
    ],
  },
  low_stock: {
    title: 'تقرير النواقص والأصناف دون الحد الأدنى',
    category: 'alerts',
    columns: [
      { header: 'كود الصنف', key: 'sku', width: 14 },
      { header: 'اسم الصنف', key: 'name', width: 32 },
      { header: 'الوحدة', key: 'unit', width: 10 },
      { header: 'الرصيد الفعلي', key: 'currentStock', width: 14 },
      { header: 'الحد الأدنى', key: 'minStockLevel', width: 14 },
      { header: 'مقدار العجز', key: 'deficit', width: 14 },
      { header: 'الحالة', key: 'status', width: 16 },
    ],
  },
  out_of_stock: {
    title: 'تقرير الأصناف المنتهية تماماً (رصيد صفر)',
    category: 'alerts',
    columns: [
      { header: 'كود الصنف', key: 'sku', width: 14 },
      { header: 'اسم الصنف', key: 'name', width: 32 },
      { header: 'الوحدة', key: 'unit', width: 10 },
      { header: 'سعر البيع (ج.م)', key: 'sellingPrice', width: 14 },
      { header: 'الرصيد الفعلي', key: 'currentStock', width: 14 },
      { header: 'الحالة', key: 'status', width: 18 },
    ],
  },
  sales_invoices: {
    title: 'تقرير مبيعات الفواتير المعتمدة',
    category: 'sales',
    columns: [
      { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 18 },
      { header: 'التاريخ', key: 'invoiceDate', width: 14 },
      { header: 'العميل المكرم', key: 'customerName', width: 30 },
      { header: 'الإجمالي الأولي (ج.م)', key: 'grossAmount', width: 16 },
      { header: 'إجمالي الخصم (ج.م)', key: 'discountAmount', width: 16 },
      { header: 'الصافي النهائي (ج.م)', key: 'finalTotal', width: 18 },
      { header: 'الحالة', key: 'status', width: 14 },
    ],
  },
  discounts: {
    title: 'تقرير الخصومات الممنوحة (أصناف وفواتير)',
    category: 'sales',
    columns: [
      { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 18 },
      { header: 'التاريخ', key: 'invoiceDate', width: 14 },
      { header: 'العميل المكرم', key: 'customerName', width: 30 },
      { header: 'خصومات البنود (ج.م)', key: 'itemDiscounts', width: 16 },
      { header: 'خصم الفاتورة العام (ج.م)', key: 'invoiceDiscount', width: 18 },
      { header: 'إجمالي الخصم الممنوح (ج.م)', key: 'totalDiscount', width: 20 },
    ],
  },
  purchases: {
    title: 'تقرير مشتريات وتوريدات البضاعة الواردة',
    category: 'movements',
    columns: [
      { header: 'رقم الإذن', key: 'receiptNumber', width: 18 },
      { header: 'التاريخ', key: 'receiptDate', width: 14 },
      { header: 'المورد / جهة التوريد', key: 'supplierName', width: 30 },
      { header: 'فاتورة المورد', key: 'supplierInvoiceNumber', width: 18 },
      { header: 'إجمالي القيمة (ج.م)', key: 'totalAmount', width: 18 },
      { header: 'الحالة', key: 'status', width: 14 },
    ],
  },
  movements: {
    title: 'تقرير سجل حركات المخزون المعصوم',
    category: 'movements',
    columns: [
      { header: 'التوقيت', key: 'timestamp', width: 18 },
      { header: 'نوع الحركة', key: 'movementType', width: 14 },
      { header: 'رقم المستند', key: 'sourceDocNumber', width: 18 },
      { header: 'كود الصنف', key: 'sku', width: 14 },
      { header: 'اسم الصنف والبيان', key: 'productName', width: 30 },
      { header: 'وارد (+)', key: 'quantityIn', width: 12 },
      { header: 'صادر (-)', key: 'quantityOut', width: 12 },
      { header: 'الرصيد بعد', key: 'stockBalanceAfter', width: 14 },
    ],
  },
  daily_summary: {
    title: 'تقرير ملخص العمليات والتشغيل الشامل',
    category: 'movements',
    columns: [
      { header: 'المؤشر والبيان التشغيلي', key: 'indicator', width: 36 },
      { header: 'القيمة الإحصائية المسجلة', key: 'value', width: 28 },
      { header: 'الحالة', key: 'status', width: 16 },
    ],
  },
  customer_balances: {
    title: 'دليل مديونيات وحسابات العملاء',
    category: 'parties',
    columns: [
      { header: 'كود العميل', key: 'code', width: 14 },
      { header: 'اسم العميل / الجهة', key: 'name', width: 30 },
      { header: 'الهاتف', key: 'phone', width: 16 },
      { header: 'المدينة / العنوان', key: 'city', width: 22 },
      { header: 'الرصيد المدين (ج.م)', key: 'balance', width: 18 },
      { header: 'عدد الفواتير', key: 'invoicesCount', width: 14 },
      { header: 'الحالة', key: 'status', width: 12 },
    ],
  },
  supplier_balances: {
    title: 'دليل مستحقات وحسابات الموردين',
    category: 'parties',
    columns: [
      { header: 'كود المورد', key: 'code', width: 14 },
      { header: 'اسم المورد / الشركة', key: 'name', width: 30 },
      { header: 'الهاتف', key: 'phone', width: 16 },
      { header: 'المدينة / المركز', key: 'city', width: 22 },
      { header: 'الرصيد الدائن (ج.م)', key: 'balance', width: 18 },
      { header: 'عدد أذون التوريد', key: 'receiptsCount', width: 16 },
      { header: 'الحالة', key: 'status', width: 12 },
    ],
  },
};

export const mockReportService = {
  async generateReport(options: {
    reportType: ReportType;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<GeneratedReport> {
    const { reportType, dateFrom, dateTo } = options;
    const meta = REPORT_METADATA[reportType] || REPORT_METADATA.current_inventory;

    const receiptsPromise = dataService.isMock()
      ? dataService.getReceipts()
      : supabaseDataService.getReceipts();

    const [products, customers, suppliers, invoices, receipts, movements] =
      await Promise.all([
        dataService.getProducts(),
        dataService.getCustomers(),
        dataService.getSuppliers(),
        dataService.getInvoices(),
        receiptsPromise,
        dataService.getInventoryMovements(),
      ]);

    switch (reportType) {
      case 'current_inventory': {
        const { rows, metrics } = calculateCurrentInventoryReport(products);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'valuation': {
        const { rows, metrics } = calculateValuationReport(products);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'low_stock': {
        const { rows, metrics } = calculateLowStockReport(products);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'out_of_stock': {
        const { rows, metrics } = calculateOutOfStockReport(products);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'sales_invoices': {
        const { rows, metrics } = calculateSalesReport(invoices, customers, dateFrom, dateTo);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'discounts': {
        const { rows, metrics } = calculateDiscountsReport(invoices, customers, dateFrom, dateTo);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'purchases': {
        const { rows, metrics } = calculatePurchasesReport(receipts, suppliers, dateFrom, dateTo);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'movements': {
        const { rows, metrics } = calculateMovementsReport(movements, products, dateFrom, dateTo);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'daily_summary': {
        const { rows, metrics } = calculateDailySummary(products, invoices, movements);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'customer_balances': {
        const { rows, metrics } = calculateCustomerBalancesReport(customers);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      case 'supplier_balances': {
        const { rows, metrics } = calculateSupplierBalancesReport(suppliers);
        return {
          id: reportType,
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }

      default: {
        const { rows, metrics } = calculateCurrentInventoryReport(products);
        return {
          id: 'current_inventory',
          title: meta.title,
          category: meta.category,
          rows: rows as unknown as Record<string, unknown>[],
          metrics,
          columnDefs: meta.columns,
        };
      }
    }
  },
};

export const reportService = mockReportService;

