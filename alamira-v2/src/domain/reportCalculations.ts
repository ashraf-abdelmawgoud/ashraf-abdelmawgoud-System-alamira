/**
 * Domain Report Calculations Engine for Al-Amira ERP V2
 * Pure calculation and aggregation functions.
 * Strictly adheres to verified V1 financial and inventory accounting rules.
 */

import type {
  Product,
  Customer,
  Supplier,
  SalesInvoice,
  StockReceipt,
  InventoryMovementLog,
} from '../types';
import { round2 } from './invoiceCalculations';

export type ReportType =
  | 'current_inventory'
  | 'valuation'
  | 'low_stock'
  | 'out_of_stock'
  | 'sales_invoices'
  | 'discounts'
  | 'purchases'
  | 'movements'
  | 'daily_summary'
  | 'customer_balances'
  | 'supplier_balances';

export type ReportCategory = 'all' | 'sales' | 'stock' | 'alerts' | 'movements' | 'parties';

export interface ReportMetric {
  id: string;
  label: string;
  value: string | number;
  highlightColor?: 'emerald' | 'amber' | 'rose' | 'navy' | 'blue';
}

export interface InventoryReportRow extends Record<string, unknown> {
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  purchasePrice: number;
  sellingPrice: number;
  totalCost: number;
}

export interface ValuationReportRow extends Record<string, unknown> {
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
  purchasePrice: number;
  valuation: number;
}

export interface LowStockReportRow extends Record<string, unknown> {
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  deficit: number;
  status: string;
}

export interface OutOfStockReportRow extends Record<string, unknown> {
  sku: string;
  name: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  status: string;
}

export interface SalesReportRow extends Record<string, unknown> {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  grossAmount: number;
  discountAmount: number;
  finalTotal: number;
  status: string;
}

export interface DiscountsReportRow extends Record<string, unknown> {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  itemDiscounts: number;
  invoiceDiscount: number;
  totalDiscount: number;
}

export interface PurchasesReportRow extends Record<string, unknown> {
  receiptNumber: string;
  receiptDate: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  totalAmount: number;
  status: string;
}

export interface MovementsReportRow extends Record<string, unknown> {
  timestamp: string;
  movementType: string;
  sourceDocNumber: string;
  sku: string;
  productName: string;
  quantityIn: number;
  quantityOut: number;
  stockBalanceAfter: number;
}

export interface DailySummaryRow extends Record<string, unknown> {
  indicator: string;
  value: string;
  status: string;
}

export interface CustomerBalanceRow extends Record<string, unknown> {
  code: string;
  name: string;
  phone: string;
  city: string;
  balance: number;
  invoicesCount: number;
  status: string;
}

export interface SupplierBalanceRow extends Record<string, unknown> {
  code: string;
  name: string;
  phone: string;
  city: string;
  balance: number;
  receiptsCount: number;
  status: string;
}

/**
 * 1. Current Inventory Report Calculation
 */
export function calculateCurrentInventoryReport(
  products: Product[]
): { rows: InventoryReportRow[]; metrics: ReportMetric[] } {
  let totalUnits = 0;
  let totalCost = 0;

  const rows: InventoryReportRow[] = products.map((p) => {
    const stock = Number(p.current_stock || 0);
    const buyPrice = Number(p.purchase_price || 0);
    const sellPrice = Number(p.selling_price || 0);
    const cost = round2(stock * buyPrice);

    totalUnits += stock;
    totalCost += cost;

    return {
      sku: p.sku,
      name: p.name,
      category: p.category || '--',
      unit: p.unit || '--',
      currentStock: stock,
      purchasePrice: buyPrice,
      sellingPrice: sellPrice,
      totalCost: cost,
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'total-prods',
      label: 'إجمالي الأصناف المسجلة',
      value: `${products.length} صنف`,
      highlightColor: 'navy',
    },
    {
      id: 'total-units',
      label: 'إجمالي كميات المخزون',
      value: `${round2(totalUnits)} وحدة`,
      highlightColor: 'emerald',
    },
    {
      id: 'total-cost',
      label: 'إجمالي قيمة التكلفة التقديرية',
      value: `${round2(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'navy',
    },
  ];

  return { rows, metrics };
}

/**
 * 2. Inventory Valuation Report Calculation (at Purchase Cost)
 */
export function calculateValuationReport(
  products: Product[]
): { rows: ValuationReportRow[]; metrics: ReportMetric[] } {
  let totalVal = 0;
  let totalUnits = 0;

  const rows: ValuationReportRow[] = products.map((p) => {
    const cur = Number(p.current_stock || 0);
    const price = Number(p.purchase_price || 0);
    const val = round2(cur * price);

    totalVal += val;
    totalUnits += cur;

    return {
      sku: p.sku,
      name: p.name,
      unit: p.unit || '--',
      currentStock: cur,
      purchasePrice: price,
      valuation: val,
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'val-units',
      label: 'إجمالي وحدات المخزن المقيمة',
      value: `${round2(totalUnits)} وحدة`,
      highlightColor: 'navy',
    },
    {
      id: 'total-val',
      label: 'إجمالي القيمة التقديرية للمخزون',
      value: `${round2(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'emerald',
    },
  ];

  return { rows, metrics };
}

/**
 * 3. Low Stock Alerts Report Calculation
 */
export function calculateLowStockReport(
  products: Product[]
): { rows: LowStockReportRow[]; metrics: ReportMetric[] } {
  const low = products.filter(
    (p) =>
      Number(p.current_stock || 0) > 0 &&
      Number(p.current_stock || 0) <= Number(p.min_stock_level || 5)
  );

  const rows: LowStockReportRow[] = low.map((p) => {
    const cur = Number(p.current_stock || 0);
    const min = Number(p.min_stock_level || 5);
    const deficit = Math.max(0, min - cur);

    return {
      sku: p.sku,
      name: p.name,
      unit: p.unit || '--',
      currentStock: cur,
      minStockLevel: min,
      deficit: round2(deficit),
      status: 'أوشك على النفاد',
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'low-stock-count',
      label: 'أصناف قاربت على النفاد (تتطلب توريد عاجل)',
      value: `${low.length} صنف`,
      highlightColor: 'amber',
    },
  ];

  return { rows, metrics };
}

/**
 * 4. Out of Stock Report Calculation (Zero Stock)
 */
export function calculateOutOfStockReport(
  products: Product[]
): { rows: OutOfStockReportRow[]; metrics: ReportMetric[] } {
  const out = products.filter((p) => Number(p.current_stock || 0) <= 0);

  const rows: OutOfStockReportRow[] = out.map((p) => ({
    sku: p.sku,
    name: p.name,
    unit: p.unit || '--',
    sellingPrice: Number(p.selling_price || 0),
    currentStock: 0,
    status: 'رصيد صفري / منتهي',
  }));

  const metrics: ReportMetric[] = [
    {
      id: 'out-stock-count',
      label: 'أصناف نفدت بالكامل من المخزن',
      value: `${out.length} صنف`,
      highlightColor: 'rose',
    },
  ];

  return { rows, metrics };
}

/**
 * 5. Approved Sales Invoices Report Calculation
 * Strictly recognizes approved invoices only!
 */
export function calculateSalesReport(
  invoices: SalesInvoice[],
  customers: Customer[],
  dateFrom?: string,
  dateTo?: string
): { rows: SalesReportRow[]; metrics: ReportMetric[] } {
  let list = invoices.filter((i) => i.status === 'approved');

  if (dateFrom) {
    list = list.filter((i) => i.invoice_date >= dateFrom);
  }
  if (dateTo) {
    list = list.filter((i) => i.invoice_date <= dateTo);
  }

  let totalGross = 0;
  let totalDiscounts = 0;
  let totalFinal = 0;

  const rows: SalesReportRow[] = list.map((i) => {
    const cust = customers.find((c) => c.id === i.customer_id);
    const custName = cust?.name || i.customer_name_snapshot || '--';
    const gross = Number(i.gross_amount || 0);
    const disc = round2(
      Number(i.item_discounts_amount || 0) + Number(i.invoice_discount_amount || 0)
    );
    const finalTot = Number(i.final_total || 0);

    totalGross += gross;
    totalDiscounts += disc;
    totalFinal += finalTot;

    return {
      invoiceNumber: i.invoice_number,
      invoiceDate: i.invoice_date,
      customerName: custName,
      grossAmount: gross,
      discountAmount: disc,
      finalTotal: finalTot,
      status: 'معتمدة',
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'sales-inv-count',
      label: 'عدد الفواتير المعتمدة',
      value: `${list.length} فاتورة`,
      highlightColor: 'navy',
    },
    {
      id: 'sales-tot-gross',
      label: 'إجمالي البضاعة قبل الخصم',
      value: `${round2(totalGross).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'navy',
    },
    {
      id: 'sales-tot-disc',
      label: 'إجمالي الخصومات الممنوحة',
      value: `${round2(totalDiscounts).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'rose',
    },
    {
      id: 'sales-tot-net',
      label: 'إجمالي المبيعات المحصلة',
      value: `${round2(totalFinal).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'emerald',
    },
  ];

  return { rows, metrics };
}

/**
 * 6. Discounts Breakdown Report Calculation
 */
export function calculateDiscountsReport(
  invoices: SalesInvoice[],
  customers: Customer[],
  dateFrom?: string,
  dateTo?: string
): { rows: DiscountsReportRow[]; metrics: ReportMetric[] } {
  let list = invoices.filter(
    (i) =>
      i.status === 'approved' &&
      (Number(i.item_discounts_amount || 0) > 0 || Number(i.invoice_discount_amount || 0) > 0)
  );

  if (dateFrom) list = list.filter((i) => i.invoice_date >= dateFrom);
  if (dateTo) list = list.filter((i) => i.invoice_date <= dateTo);

  let sumItemDisc = 0;
  let sumInvDisc = 0;
  let sumTotalDisc = 0;

  const rows: DiscountsReportRow[] = list.map((i) => {
    const cust = customers.find((c) => c.id === i.customer_id);
    const custName = cust?.name || i.customer_name_snapshot || '--';
    const itmD = Number(i.item_discounts_amount || 0);
    const invD = Number(i.invoice_discount_amount || 0);
    const totD = round2(itmD + invD);

    sumItemDisc += itmD;
    sumInvDisc += invD;
    sumTotalDisc += totD;

    return {
      invoiceNumber: i.invoice_number,
      invoiceDate: i.invoice_date,
      customerName: custName,
      itemDiscounts: itmD,
      invoiceDiscount: invD,
      totalDiscount: totD,
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'disc-item-sum',
      label: 'خصومات البنود المباشرة',
      value: `${round2(sumItemDisc).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'rose',
    },
    {
      id: 'disc-inv-sum',
      label: 'خصومات الفواتير العامة',
      value: `${round2(sumInvDisc).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'rose',
    },
    {
      id: 'disc-total-sum',
      label: 'إجمالي الخصومات المقدمة للعملاء',
      value: `${round2(sumTotalDisc).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'rose',
    },
  ];

  return { rows, metrics };
}

/**
 * 7. Purchases & Stock Receipts Report Calculation
 */
export function calculatePurchasesReport(
  receipts: StockReceipt[],
  suppliers: Supplier[],
  dateFrom?: string,
  dateTo?: string
): { rows: PurchasesReportRow[]; metrics: ReportMetric[] } {
  let list = receipts || [];
  if (dateFrom) list = list.filter((r) => r.receipt_date >= dateFrom);
  if (dateTo) list = list.filter((r) => r.receipt_date <= dateTo);

  let totalPurchases = 0;

  const rows: PurchasesReportRow[] = list.map((r) => {
    const sup = suppliers.find((s) => s.id === r.supplier_id);
    const supName = sup?.name || '--';
    const tot = Number(r.total_amount || 0);
    totalPurchases += tot;

    return {
      receiptNumber: r.receipt_number,
      receiptDate: r.receipt_date,
      supplierName: supName,
      supplierInvoiceNumber: r.supplier_invoice_number || '--',
      totalAmount: tot,
      status: r.status === 'approved' ? 'معتمد' : r.status,
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'purch-count',
      label: 'عدد أذون التوريد',
      value: `${list.length} إذن`,
      highlightColor: 'navy',
    },
    {
      id: 'purch-total',
      label: 'إجمالي قيمة التوريدات',
      value: `${round2(totalPurchases).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'navy',
    },
  ];

  return { rows, metrics };
}

/**
 * 8. Stock Movements Audit Trail Report Calculation
 */
export function calculateMovementsReport(
  movements: InventoryMovementLog[],
  products: Product[],
  dateFrom?: string,
  dateTo?: string
): { rows: MovementsReportRow[]; metrics: ReportMetric[] } {
  let list = movements || [];
  if (dateFrom) {
    list = list.filter((m) => m.created_at && m.created_at.slice(0, 10) >= dateFrom);
  }
  if (dateTo) {
    list = list.filter((m) => m.created_at && m.created_at.slice(0, 10) <= dateTo);
  }

  const typeTranslations: Record<string, string> = {
    receipt: 'إضافة وارد',
    sale: 'بيع صادر',
    issue: 'صرف صادر',
    adjustment: 'تسوية',
    reversal: 'إرجاع',
  };

  const rows: MovementsReportRow[] = list.map((m) => {
    const prod = products.find((p) => p.id === m.product_id);
    return {
      timestamp: m.created_at ? m.created_at.slice(0, 16).replace('T', ' ') : '--',
      movementType: typeTranslations[m.movement_type] || m.movement_type,
      sourceDocNumber: m.source_doc_number,
      sku: prod?.sku || m.product_sku || '--',
      productName: prod?.name || m.product_name || '--',
      quantityIn: Number(m.quantity_in || 0),
      quantityOut: Number(m.quantity_out || 0),
      stockBalanceAfter: Number(m.stock_balance_after || 0),
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'mov-count',
      label: 'إجمالي حركات المخزون المسجلة',
      value: `${list.length} حركة معتمدة`,
      highlightColor: 'navy',
    },
  ];

  return { rows, metrics };
}

/**
 * 9. Daily Comprehensive Executive Summary Calculation
 */
export function calculateDailySummary(
  products: Product[],
  invoices: SalesInvoice[],
  movements: InventoryMovementLog[]
): { rows: DailySummaryRow[]; metrics: ReportMetric[] } {
  const activeProds = products.filter((p) => p.is_active !== false);
  const totalUnits = products.reduce((s, p) => s + Number(p.current_stock || 0), 0);
  const totalVal = products.reduce(
    (s, p) => s + Number(p.current_stock || 0) * Number(p.purchase_price || 0),
    0
  );
  const approvedInvs = invoices.filter((i) => i.status === 'approved');
  const totalSales = approvedInvs.reduce((s, i) => s + Number(i.final_total || 0), 0);
  const lowStockCount = products.filter(
    (p) =>
      Number(p.current_stock || 0) > 0 &&
      Number(p.current_stock || 0) <= Number(p.min_stock_level || 5)
  ).length;

  const rows: DailySummaryRow[] = [
    {
      indicator: 'إجمالي الأصناف النشطة المسجلة',
      value: `${activeProds.length} صنف`,
      status: 'نشط',
    },
    {
      indicator: 'إجمالي وحدات البضاعة المتاحة بالمخزن',
      value: `${round2(totalUnits)} وحدة`,
      status: 'مخزون فعلي',
    },
    {
      indicator: 'القيمة الإجمالية التقديرية للمخزون',
      value: `${round2(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      status: 'تقييم تكلفة',
    },
    {
      indicator: 'عدد فواتير المبيعات المعتمدة',
      value: `${approvedInvs.length} فاتورة`,
      status: 'معتمد',
    },
    {
      indicator: 'إجمالي قيمة المبيعات المعتمدة المحصلة',
      value: `${round2(totalSales).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      status: 'إيراد فعلي',
    },
    {
      indicator: 'تنبيهات الأصناف دون الحد الأدنى',
      value: `${lowStockCount} أصناف بحاجة لتوريد`,
      status: lowStockCount > 0 ? 'تنبيه عاجل' : 'آمن',
    },
    {
      indicator: 'إجمالي حركات الرقابة المخزنية المسجلة',
      value: `${movements.length} حركة معصومة`,
      status: 'مدقق وموثق',
    },
  ];

  const metrics: ReportMetric[] = [
    {
      id: 'summary-date',
      label: 'تقرير مؤشرات الأداء اللحظي',
      value: 'محدث تلقائياً من الذاكرة المحلية',
      highlightColor: 'emerald',
    },
  ];

  return { rows, metrics };
}

/**
 * 10. Customer Balances & Directory Summary
 */
export function calculateCustomerBalancesReport(
  customers: Customer[]
): { rows: CustomerBalanceRow[]; metrics: ReportMetric[] } {
  let totalReceivables = 0;

  const rows: CustomerBalanceRow[] = customers.map((c) => {
    const bal = Number(c.balance || 0);
    totalReceivables += bal;
    return {
      code: c.code || '--',
      name: c.name,
      phone: c.phone || '--',
      city: c.city || c.address || '--',
      balance: bal,
      invoicesCount: c.invoices_count || 0,
      status: c.is_active ? 'نشط' : 'معطل',
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'cust-count',
      label: 'إجمالي عدد العملاء',
      value: `${customers.length} عميل`,
      highlightColor: 'navy',
    },
    {
      id: 'cust-receivables',
      label: 'إجمالي مديونيات العملاء المستحقة',
      value: `${round2(totalReceivables).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'amber',
    },
  ];

  return { rows, metrics };
}

/**
 * 11. Supplier Balances & Directory Summary
 */
export function calculateSupplierBalancesReport(
  suppliers: Supplier[]
): { rows: SupplierBalanceRow[]; metrics: ReportMetric[] } {
  let totalPayables = 0;

  const rows: SupplierBalanceRow[] = suppliers.map((s) => {
    const bal = Number(s.balance || 0);
    totalPayables += bal;
    return {
      code: s.code || '--',
      name: s.name,
      phone: s.phone || '--',
      city: s.city || s.address || '--',
      balance: bal,
      receiptsCount: s.receipts_count || 0,
      status: s.is_active ? 'نشط' : 'معطل',
    };
  });

  const metrics: ReportMetric[] = [
    {
      id: 'sup-count',
      label: 'إجمالي عدد الموردين',
      value: `${suppliers.length} مورد`,
      highlightColor: 'navy',
    },
    {
      id: 'sup-payables',
      label: 'إجمالي مستحقات الموردين المطلوبة',
      value: `${round2(totalPayables).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      highlightColor: 'rose',
    },
  ];

  return { rows, metrics };
}
