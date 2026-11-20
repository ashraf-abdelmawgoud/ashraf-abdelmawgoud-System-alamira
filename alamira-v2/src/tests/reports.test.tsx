import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  Product,
  Customer,
  Supplier,
  SalesInvoice,
  StockReceipt,
  InventoryMovementLog,
} from '../types';
import {
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
} from '../domain/reportCalculations';
import { exportToExcel } from '../lib/excelExport';
import { mockReportService } from '../services/mockReportService';
import { ReportsView } from '../features/reports/ReportsView';

describe('Phase 4 — Reports & Analytics Domain & Excel Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleProducts: Product[] = [
    {
      id: 'p1',
      sku: 'SKU-001',
      code: 'SKU-001',
      name: 'كابل سويدي 4 مم',
      category: 'كابلات وأسلاك',
      unit: 'لفة',
      allows_decimal_quantity: false,
      purchase_price: 1000,
      costPrice: 1000,
      selling_price: 1200,
      sellingPrice: 1200,
      current_stock: 20,
      currentStock: 20,
      min_stock_level: 5,
      minStockLevel: 5,
      isLowStock: false,
      is_active: true,
    },
    {
      id: 'p2',
      sku: 'SKU-002',
      code: 'SKU-002',
      name: 'مفتاح أوتوماتيك 16A',
      category: 'قواطع ولوحات',
      unit: 'قطعة',
      allows_decimal_quantity: false,
      purchase_price: 150,
      costPrice: 150,
      selling_price: 200,
      sellingPrice: 200,
      current_stock: 3, // Low stock: <= 5
      currentStock: 3,
      min_stock_level: 5,
      minStockLevel: 5,
      isLowStock: true,
      is_active: true,
    },
    {
      id: 'p3',
      sku: 'SKU-003',
      code: 'SKU-003',
      name: 'ماسورة بلاستيك 3/4',
      category: 'مواسير وتغذية',
      unit: 'متر',
      allows_decimal_quantity: true,
      purchase_price: 20,
      costPrice: 20,
      selling_price: 28,
      sellingPrice: 28,
      current_stock: 0, // Out of stock
      currentStock: 0,
      min_stock_level: 10,
      minStockLevel: 10,
      isLowStock: true,
      is_active: true,
    },
    {
      id: 'p4',
      sku: 'SKU-004',
      code: 'SKU-004',
      name: 'دهان جوتن فينوماستيك',
      category: 'دهانات وتشطيب',
      unit: 'بستلة',
      allows_decimal_quantity: true,
      purchase_price: 1500,
      costPrice: 1500,
      selling_price: 1850,
      sellingPrice: 1850,
      current_stock: 10.5, // Decimal stock
      currentStock: 10.5,
      min_stock_level: 2,
      minStockLevel: 2,
      isLowStock: false,
      is_active: true,
    },
  ];

  const sampleInvoices: SalesInvoice[] = [
    {
      id: 'inv-1',
      invoice_number: 'INV-20261117-001',
      invoice_date: '2026-11-17',
      customer_id: 'cust-1',
      customer_name_snapshot: 'شركة النور للمقاولات',
      gross_amount: 5000,
      item_discounts_amount: 200,
      subtotal: 4800,
      invoice_discount_type: 'fixed',
      invoice_discount_value: 100,
      invoice_discount_amount: 100,
      additional_charges: 50,
      final_total: 4750,
      status: 'approved',
      items: [],
    },
    {
      id: 'inv-2',
      invoice_number: 'INV-20261117-002',
      invoice_date: '2026-11-17',
      customer_id: 'cust-2',
      customer_name_snapshot: 'مكتب الإخلاص الهندسي',
      gross_amount: 3000,
      item_discounts_amount: 0,
      subtotal: 3000,
      invoice_discount_type: 'none',
      invoice_discount_value: 0,
      invoice_discount_amount: 0,
      additional_charges: 0,
      final_total: 3000,
      status: 'draft', // DRAFT: Must be excluded from approved sales!
      items: [],
    },
    {
      id: 'inv-3',
      invoice_number: 'INV-20261116-001',
      invoice_date: '2026-11-16',
      customer_id: 'cust-1',
      customer_name_snapshot: 'شركة النور للمقاولات',
      gross_amount: 8000,
      item_discounts_amount: 0,
      subtotal: 8000,
      invoice_discount_type: 'none',
      invoice_discount_value: 0,
      invoice_discount_amount: 0,
      additional_charges: 0,
      final_total: 8000,
      status: 'cancelled', // CANCELLED: Must be excluded from approved sales!
      items: [],
    },
  ];

  const sampleCustomers: Customer[] = [
    {
      id: 'cust-1',
      code: 'CUST-001',
      name: 'شركة النور للمقاولات',
      phone: '01012345678',
      address: 'قنا - شارع الجمهورية',
      city: 'قنا',
      balance: 14750,
      is_active: true,
      invoices_count: 5,
    },
    {
      id: 'cust-2',
      code: 'CUST-002',
      name: 'مكتب الإخلاص الهندسي',
      phone: '01123456789',
      address: 'الأقصر - العوامية',
      city: 'الأقصر',
      balance: 0,
      is_active: true,
      invoices_count: 2,
    },
  ];

  const sampleSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      code: 'SUP-001',
      name: 'شركة السويدي إلكتريك',
      phone: '0223456789',
      address: 'القاهرة - التجمع',
      city: 'القاهرة',
      balance: 50000,
      is_active: true,
      receipts_count: 8,
    },
  ];

  const sampleReceipts: StockReceipt[] = [
    {
      id: 'rec-1',
      receipt_number: 'REC-20261117-001',
      receipt_date: '2026-11-17',
      supplier_id: 'sup-1',
      total_amount: 25000,
      status: 'approved',
      created_at: '2026-11-17T08:00:00Z',
      items: [],
    },
  ];

  const sampleMovements: InventoryMovementLog[] = [
    {
      id: 'mov-1',
      product_id: 'p1',
      movement_type: 'sale',
      source_doc_type: 'sales_invoice',
      source_doc_id: 'inv-1',
      source_doc_number: 'INV-20261117-001',
      quantity_in: 0,
      quantity_out: 5,
      stock_balance_after: 20,
      unit_cost_or_price: 1200,
      created_at: '2026-11-17T11:00:00Z',
    },
  ];

  describe('1. Financial Sales Reporting Rules', () => {
    it('strictly recognizes approved invoices and excludes draft and cancelled invoices', () => {
      const { rows, metrics } = calculateSalesReport(sampleInvoices, sampleCustomers);

      // Only 1 approved invoice out of 3
      expect(rows).toHaveLength(1);
      expect(rows[0].invoiceNumber).toBe('INV-20261117-001');
      expect(rows[0].finalTotal).toBe(4750);
      expect(rows[0].discountAmount).toBe(300); // 200 item + 100 invoice

      const countMetric = metrics.find((m) => m.id === 'sales-inv-count');
      expect(countMetric?.value).toBe('1 فاتورة');

      const netMetric = metrics.find((m) => m.id === 'sales-tot-net');
      expect(netMetric?.value).toContain('4,750.00 ج.م');
    });

    it('respects date boundaries accurately', () => {
      // Filter for 2026-11-16 (should find 0 approved, since the invoice on the 16th is cancelled)
      const res16 = calculateSalesReport(sampleInvoices, sampleCustomers, '2026-11-16', '2026-11-16');
      expect(res16.rows).toHaveLength(0);

      // Filter for 2026-11-17 (should find the 1 approved invoice)
      const res17 = calculateSalesReport(sampleInvoices, sampleCustomers, '2026-11-17', '2026-11-17');
      expect(res17.rows).toHaveLength(1);
    });

    it('calculates discounts breakdown correctly', () => {
      const { rows, metrics } = calculateDiscountsReport(sampleInvoices, sampleCustomers);
      expect(rows).toHaveLength(1);
      expect(rows[0].itemDiscounts).toBe(200);
      expect(rows[0].invoiceDiscount).toBe(100);
      expect(rows[0].totalDiscount).toBe(300);

      const totalDiscMetric = metrics.find((m) => m.id === 'disc-total-sum');
      expect(totalDiscMetric?.value).toContain('300.00 ج.م');
    });
  });

  describe('2. Inventory & Stock Valuation Reporting Rules', () => {
    it('calculates inventory stock and estimated cost correctly', () => {
      const { rows, metrics } = calculateCurrentInventoryReport(sampleProducts);
      expect(rows).toHaveLength(4);

      // Check decimal stock row (p4)
      const p4Row = rows.find((r) => r.sku === 'SKU-004');
      expect(p4Row?.currentStock).toBe(10.5);
      expect(p4Row?.totalCost).toBe(15750); // 10.5 * 1500

      // Check total cost metric: (20*1000) + (3*150) + (0*20) + (10.5*1500) = 20000 + 450 + 0 + 15750 = 36200
      const costMetric = metrics.find((m) => m.id === 'total-cost');
      expect(costMetric?.value).toContain('36,200.00 ج.م');
    });

    it('calculates inventory valuation correctly at purchase price', () => {
      const { rows, metrics } = calculateValuationReport(sampleProducts);
      expect(rows).toHaveLength(4);

      const valMetric = metrics.find((m) => m.id === 'total-val');
      expect(valMetric?.value).toContain('36,200.00 ج.م');
    });

    it('identifies low stock items where stock is between 0 and min_stock_level', () => {
      const { rows, metrics } = calculateLowStockReport(sampleProducts);
      // p2 has stock 3 <= 5
      expect(rows).toHaveLength(1);
      expect(rows[0].sku).toBe('SKU-002');
      expect(rows[0].currentStock).toBe(3);
      expect(rows[0].deficit).toBe(2); // 5 - 3

      const alertMetric = metrics.find((m) => m.id === 'low-stock-count');
      expect(alertMetric?.value).toBe('1 صنف');
    });

    it('identifies out of stock items where stock is 0 or negative', () => {
      const { rows, metrics } = calculateOutOfStockReport(sampleProducts);
      // p3 has stock 0
      expect(rows).toHaveLength(1);
      expect(rows[0].sku).toBe('SKU-003');
      expect(rows[0].currentStock).toBe(0);

      const outMetric = metrics.find((m) => m.id === 'out-stock-count');
      expect(outMetric?.value).toBe('1 صنف');
    });
  });

  describe('3. Customer and Supplier Reporting Rules', () => {
    it('aggregates customer balances and receivables', () => {
      const { rows, metrics } = calculateCustomerBalancesReport(sampleCustomers);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('شركة النور للمقاولات');
      expect(rows[0].balance).toBe(14750);

      const recMetric = metrics.find((m) => m.id === 'cust-receivables');
      expect(recMetric?.value).toContain('14,750.00 ج.م');
    });

    it('aggregates supplier balances and payables', () => {
      const { rows, metrics } = calculateSupplierBalancesReport(sampleSuppliers);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('شركة السويدي إلكتريك');
      expect(rows[0].balance).toBe(50000);

      const payMetric = metrics.find((m) => m.id === 'sup-payables');
      expect(payMetric?.value).toContain('50,000.00 ج.م');
    });

    it('calculates purchases report from stock receipts', () => {
      const { rows, metrics } = calculatePurchasesReport(sampleReceipts, sampleSuppliers);
      expect(rows).toHaveLength(1);
      expect(rows[0].receiptNumber).toBe('REC-20261117-001');
      expect(rows[0].supplierName).toBe('شركة السويدي إلكتريك');
      expect(rows[0].totalAmount).toBe(25000);

      const sumMetric = metrics.find((m) => m.id === 'purch-total');
      expect(sumMetric?.value).toContain('25,000.00 ج.م');
    });

    it('calculates inventory movements log report', () => {
      const { rows, metrics } = calculateMovementsReport(sampleMovements, sampleProducts);
      expect(rows).toHaveLength(1);
      expect(rows[0].productName).toBe('كابل سويدي 4 مم');
      expect(rows[0].quantityOut).toBe(5);

      const countMetric = metrics.find((m) => m.id === 'mov-count');
      expect(countMetric?.value).toBe('1 حركة معتمدة');
    });
  });

  describe('4. Executive Daily Summary Calculation', () => {
    it('computes executive KPIs accurately across entities', () => {
      const { rows } = calculateDailySummary(sampleProducts, sampleInvoices, sampleMovements);
      expect(rows.length).toBeGreaterThan(5);

      const activeRow = rows.find((r) => r.indicator.includes('النشطة'));
      expect(activeRow?.value).toBe('4 صنف');

      const approvedInvRow = rows.find((r) => r.indicator.includes('فواتير المبيعات المعتمدة'));
      expect(approvedInvRow?.value).toBe('1 فاتورة');

      const salesValRow = rows.find((r) => r.indicator.includes('قيمة المبيعات'));
      expect(salesValRow?.value).toContain('4,750.00 ج.م');
    });
  });

  describe('5. Professional Excel Export Engine (XLSX)', () => {
    it('exports data rows into a valid workbook with sanitized formula protection', () => {
      const testData = [
        {
          'اسم العميل': 'شركة الصعيد',
          'الرصيد': 5000,
          'ملاحظات': '=SUM(1,2)', // Formula injection attempt!
        },
      ];

      const result = exportToExcel({
        filename: 'test_report.xlsx',
        sheetName: 'المبيعات',
        data: testData,
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test_report.xlsx');
      expect(result.rowCount).toBe(1);
    });

    it('handles empty data gracefully without throwing', () => {
      const result = exportToExcel({
        filename: 'empty.xlsx',
        data: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('لا توجد بيانات متاحة للتصدير');
    });
  });

  describe('6. Mock Report Service & React UI Integration', () => {
    it('generates report asynchronously through mockReportService', async () => {
      const report = await mockReportService.generateReport({
        reportType: 'current_inventory',
      });

      expect(report.id).toBe('current_inventory');
      expect(report.title).toContain('المخزون');
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.metrics.length).toBeGreaterThan(0);
    });

    it('renders ReportsView UI, allows switching categories, and resets filters', async () => {
      render(<ReportsView />);

      // Verify header and navigation tabs exist
      await waitFor(() => {
        expect(screen.getByText('التقارير العامة والمؤشرات')).toBeInTheDocument();
      });

      expect(screen.getByText('نظرة عامة')).toBeInTheDocument();
      expect(screen.getByText('تقارير المبيعات')).toBeInTheDocument();

      // Click on Sales category pill
      fireEvent.click(screen.getByText('تقارير المبيعات'));

      await waitFor(() => {
        expect(screen.getByText('تصدير التقرير (Excel)')).toBeInTheDocument();
      });

      // Click on reset button
      const resetBtn = screen.getByTitle('إعادة تعيين المرشحات');
      fireEvent.click(resetBtn);
    });

    it('renders ReportsView in real data mode without post-cutover placeholders or banners', async () => {
      render(<ReportsView />);

      await waitFor(() => {
        expect(screen.getByText('التقارير العامة والمؤشرات')).toBeInTheDocument();
      });

      // Verify no technical post-cutover placeholders or banners are displayed
      expect(screen.queryByText(/Post-Cutover/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/قيد الربط المباشر/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Live Backend/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/متصل بـ Supabase/i)).not.toBeInTheDocument();
    });

    it('reportingService enforces approved-only invoices and Cairo timezone date filters', async () => {
      const { reportingService, resolveDateFilter } = await import('../services/reportingService');
      const resolved = resolveDateFilter('today');
      expect(resolved.label).toBe('اليوم');
      expect(resolved.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const overview = await reportingService.getOverviewReport({ userRole: 'ADMIN' });
      expect(overview.category).toBe('overview');
      expect(overview.metrics.length).toBeGreaterThan(0);
      expect(overview.columns.length).toBeGreaterThan(0);
    });

    it('reportingService financial report strictly marks profit and COGS as unavailable without calculating false profits', async () => {
      const { reportingService } = await import('../services/reportingService');
      const financial = await reportingService.getFinancialReport({ userRole: 'ADMIN' });
      expect(financial.category).toBe('financial');

      const cogsMetric = financial.metrics.find((m) => m.id === 'cogs');
      const profitMetric = financial.metrics.find((m) => m.id === 'gross_profit');
      const marginMetric = financial.metrics.find((m) => m.id === 'profit_margin');

      expect(cogsMetric?.value).toBe('البيانات غير متاحة');
      expect(profitMetric?.value).toBe('البيانات غير متاحة');
      expect(marginMetric?.value).toBe('البيانات غير متاحة');
      expect(financial.notice).toContain('لا يتم احتساب تكلفة البضاعة المباعة أو الأرباح التقديرية');
    });

    it('reportingService enforces RBAC and rejects non-admin access to financial and inventory reports', async () => {
      const { reportingService } = await import('../services/reportingService');

      await expect(
        reportingService.getFinancialReport({ userRole: 'SALES_OPERATOR' })
      ).rejects.toThrow(/ADMIN ONLY/i);

      await expect(
        reportingService.getInventoryReport({
          userRole: 'SALES_OPERATOR',
          subType: 'current_stock',
        })
      ).rejects.toThrow(/ADMIN ONLY/i);
    });
  });
});
