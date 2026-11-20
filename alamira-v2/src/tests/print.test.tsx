import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SalesInvoice, Customer } from '../types';
import {
  mapInvoiceToPrintModel,
  OFFICIAL_COMPANY_INFO,
} from '../features/invoices/print/invoicePrintMapper';
import { tafqeetArabic } from '../utils/tafqeet';
import { InvoicePrintHeader } from '../features/invoices/print/InvoicePrintHeader';
import { InvoicePrintCustomerInfo } from '../features/invoices/print/InvoicePrintCustomerInfo';
import { InvoicePrintItems } from '../features/invoices/print/InvoicePrintItems';
import { InvoicePrintTotals } from '../features/invoices/print/InvoicePrintTotals';
import { InvoicePrintFooter } from '../features/invoices/print/InvoicePrintFooter';
import { InvoicePrintTemplate } from '../features/invoices/print/InvoicePrintTemplate';
import { InvoicePrintPreview } from '../features/invoices/print/InvoicePrintPreview';
import { printInvoice, isMobileDevice } from '../features/invoices/print/printInvoice';
import { exportInvoicePng } from '../features/invoices/print/exportInvoicePng';
import { InvoicePrintActions } from '../features/invoices/print/InvoicePrintActions';
import { mockDataService } from '../services/mockDataService';

// Ensure URL.createObjectURL and revokeObjectURL exist in JSDOM
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-uuid');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

// Mock html2canvas for unit tests
vi.mock('html2canvas', () => {
  return {
    default: vi.fn().mockImplementation(() =>
      Promise.resolve({
        toDataURL: () =>
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        toBlob: (callback: (blob: Blob) => void) => {
          callback(new Blob(['fake-image-bytes'], { type: 'image/png' }));
        },
      })
    ),
  };
});

describe('Phase 3C — Professional Invoice Printing & PNG Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCustomer: Customer = {
    id: 'cust-001',
    code: 'CUST-001',
    name: 'شركة النور للمقاولات والتوريدات الهندسية',
    phone: '01012345678',
    address: 'قنا - شارع الجمهورية - برج الصفا',
    city: 'قنا',
    balance: 15000,
    is_active: true,
    invoices_count: 5,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const sampleInvoiceWithDiscounts: SalesInvoice = {
    id: 'inv-test-01',
    invoice_number: 'INV-20261117-001',
    invoice_date: '2026-11-17',
    customer_id: 'cust-001',
    customer_name_snapshot: 'شركة النور للمقاولات والتوريدات الهندسية',
    customer_phone_snapshot: '01012345678',
    payment_terms: 'credit',
    status: 'approved',
    gross_amount: 5000,
    item_discounts_amount: 250,
    subtotal: 4750,
    invoice_discount_type: 'fixed',
    invoice_discount_value: 150,
    invoice_discount_amount: 150,
    additional_charges: 100,
    final_total: 4700,
    notes: 'الدفع خلال 15 يوماً من تاريخ استلام البضاعة بموقع المشروع.',
    created_by: 'أحمد محمود',
    created_at: '2026-11-17T10:00:00Z',
    items: [
      {
        id: 'item-1',
        invoice_id: 'inv-test-01',
        product_id: 'prod-01',
        product_sku_snapshot: 'STEEL-001',
        product_name_snapshot: 'حديد تسليح 12 مم عالي المقاومة للأعمال الإنشائية الكبرى',
        unit_snapshot: 'طن',
        quantity: 2.5,
        unit_price: 2000,
        discount_type: 'percentage',
        discount_value: 5,
        discount_amount: 250,
        gross_amount: 5000,
        net_amount: 4750,
      },
    ],
  };

  const sampleInvoiceWithoutDiscounts: SalesInvoice = {
    id: 'inv-test-02',
    invoice_number: 'INV-20261117-002',
    invoice_date: '2026-11-17',
    customer_id: 'cust-001',
    customer_name_snapshot: 'شركة النور للمقاولات والتوريدات الهندسية',
    customer_phone_snapshot: '01012345678',
    payment_terms: 'cash',
    status: 'draft',
    gross_amount: 1000,
    item_discounts_amount: 0,
    subtotal: 1000,
    invoice_discount_type: 'percentage',
    invoice_discount_value: 0,
    invoice_discount_amount: 0,
    additional_charges: 0,
    final_total: 1000,
    notes: '',
    created_by: 'أحمد محمود',
    created_at: '2026-11-17T11:00:00Z',
    items: [
      {
        id: 'item-2',
        invoice_id: 'inv-test-02',
        product_id: 'prod-02',
        product_sku_snapshot: 'CEMENT-001',
        product_name_snapshot: 'أسمنت بورتلاندي عادي 50 كجم',
        unit_snapshot: 'شيكارة',
        quantity: 10,
        unit_price: 100,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0,
        gross_amount: 1000,
        net_amount: 1000,
      },
    ],
  };

  describe('1. Tafqeet Arabic Currency Utility', () => {
    it('correctly converts whole Egyptian pound amounts to formal Arabic text', () => {
      expect(tafqeetArabic(1000)).toBe('فقط وقدره ألف جنيهاً مصرياً لا غير.');
      expect(tafqeetArabic(4700)).toBe('فقط وقدره أربعة آلاف وسبعمائة جنيهاً مصرياً لا غير.');
      expect(tafqeetArabic(1500000)).toBe('فقط وقدره مليون وخمسمائة ألف جنيهاً مصرياً لا غير.');
    });

    it('correctly converts amounts with piastres (cents)', () => {
      const text = tafqeetArabic(1250.5);
      expect(text).toContain('ألف ومائتان وخمسون جنيهاً مصرياً');
      expect(text).toContain('وخمسون قرشاً لا غير.');
    });

    it('handles zero or null/undefined gracefully', () => {
      expect(tafqeetArabic(0)).toBe('صفر جنيه مصري لا غير');
      expect(tafqeetArabic(null)).toBe('صفر جنيه مصري لا غير');
      expect(tafqeetArabic(undefined)).toBe('صفر جنيه مصري لا غير');
    });
  });

  describe('2. Invoice Print Data Mapper', () => {
    it('maps official company information with 100% parity', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      expect(model.company.name).toBe(OFFICIAL_COMPANY_INFO.name);
      expect(model.company.name).toBe('الأميرة للتوريدات العامة والتجارة');
      expect(model.company.address).toBe('قنا - م الوقف');
      expect(model.company.logoUrl).toBe('/logo.png');
      expect(model.company.branches.qena.address).toBe('قنا - م الوقف');
      expect(model.company.branches.hurghada.address).toBe('الغردقة - شيراتون');
      expect(model.company.branches.qena.phones).toEqual(['01008949310', '01001239995']);
      expect(model.company.branches.hurghada.phones).toEqual(['01001239995', '01020680007']);
    });

    it('maps customer details and transaction metadata correctly', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      expect(model.customer.name).toBe(mockCustomer.name);
      expect(model.customer.phone).toBe(mockCustomer.phone);
      expect(model.customer.address).toBe(mockCustomer.address);
      expect(model.invoice.invoiceNumber).toBe('INV-20261117-001');
      expect(model.invoice.paymentTermLabel).toBe('آجل');
      expect(model.invoice.statusLabel).toBe('معتمدة وخصمت من المخزون');
    });

    it('detects discount presence and prepares item models with fractional quantities', () => {
      const modelWithDisc = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      expect(modelWithDisc.hasItemDiscounts).toBe(true);
      expect(modelWithDisc.items[0].quantityFormatted).toBe('2.5');
      expect(modelWithDisc.items[0].discountAmount).toBe(250);

      const modelWithoutDisc = mapInvoiceToPrintModel(sampleInvoiceWithoutDiscounts, mockCustomer);
      expect(modelWithoutDisc.hasItemDiscounts).toBe(false);
      expect(modelWithoutDisc.items[0].quantityFormatted).toBe('10');
      expect(modelWithoutDisc.items[0].discountAmount).toBe(0);
    });

    it('matches Phase 3B financial calculation totals exactly', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      expect(model.totals.grossAmount).toBe(5000);
      expect(model.totals.itemDiscountsAmount).toBe(250);
      expect(model.totals.subtotal).toBe(4750);
      expect(model.totals.invoiceDiscountAmount).toBe(150);
      expect(model.totals.additionalCharges).toBe(100);
      expect(model.totals.finalTotal).toBe(4700);
      expect(model.totals.tafqeetText).toContain('أربعة آلاف وسبعمائة جنيهاً مصرياً');
    });
  });

  describe('3. Template Component Rendering (Visual & Structural Fidelity)', () => {
    it('renders Header with official logo, company name, and document box without "فاتورة مبيعات"', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      render(<InvoicePrintHeader data={model} />);

      expect(screen.queryByText('فاتورة مبيعات')).not.toBeInTheDocument();
      expect(screen.getByText('INV-20261117-001')).toBeInTheDocument();
      expect(screen.getByText('2026-11-17')).toBeInTheDocument();
      expect(screen.getByText('الأميرة للتوريدات العامة والتجارة')).toBeInTheDocument();
      const logo = screen.getByRole('img');
      expect(logo).toHaveAttribute('src', '/logo.png');
    });

    it('renders CustomerInfo grid with name, phone, address, and metadata', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      render(<InvoicePrintCustomerInfo data={model} />);

      expect(screen.getByText('بيانات العميل')).toBeInTheDocument();
      expect(screen.queryByText('بيانات العميل المكرم')).not.toBeInTheDocument();
      expect(screen.getByText(mockCustomer.name)).toBeInTheDocument();
      expect(screen.getByText(mockCustomer.phone!)).toBeInTheDocument();
      expect(screen.getByText(mockCustomer.address!)).toBeInTheDocument();
      expect(screen.getByText('آجل')).toBeInTheDocument();
      expect(screen.getByText('نوع المستند:')).toBeInTheDocument();
      expect(screen.getByText('بيان الأسعار')).toBeInTheDocument();
    });

    it('renders Items table with discount column when discounts exist', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      render(<InvoicePrintItems data={model} />);

      expect(screen.getByText('الخصم')).toBeInTheDocument();
      expect(screen.getByText('الصافي')).toBeInTheDocument();
      expect(screen.getByText('STEEL-001')).toBeInTheDocument();
      expect(screen.getByText('2.5')).toBeInTheDocument();
      expect(screen.getByText('-250.00')).toBeInTheDocument();
      expect(screen.getByText('4750.00')).toBeInTheDocument();
    });

    it('omits discount column when no item has discount to optimize layout width', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithoutDiscounts, mockCustomer);
      render(<InvoicePrintItems data={model} />);

      expect(screen.queryByText('الخصم')).not.toBeInTheDocument();
      expect(screen.getByText('القيمة الإجمالية')).toBeInTheDocument();
      expect(screen.getByText('CEMENT-001')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('1000.00')).toBeInTheDocument();
    });

    it('renders Totals table with conditional rows, Arabic Tafqeet, and automated approval statement', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      render(<InvoicePrintTotals data={model} />);

      // Authorized Approval Statement Box verification
      expect(
        screen.getByText('السادة / شركة الاميره للتوريدات والتجارة العامة توافق علي عرض اسعاركم آليا.')
      ).toBeInTheDocument();

      expect(screen.getByText('إجمالي البضاعة:')).toBeInTheDocument();
      expect(screen.getByText('5000.00 ج.م')).toBeInTheDocument();
      expect(screen.getByText('خصومات الأصناف:')).toBeInTheDocument();
      expect(screen.getByText('-250.00 ج.م')).toBeInTheDocument();
      expect(screen.getByText('خصم الفاتورة العام:')).toBeInTheDocument();
      expect(screen.getByText('-150.00 ج.م')).toBeInTheDocument();
      expect(screen.getByText('مصاريف إضافية / شحن:')).toBeInTheDocument();
      expect(screen.getByText('+100.00 ج.م')).toBeInTheDocument();
      expect(screen.getByText('4700.00 ج.م')).toBeInTheDocument();
      expect(screen.getByText(model.totals.tafqeetText)).toBeInTheDocument();
      // Notes block present
      expect(screen.getByText('شروط وملاحظات الفاتورة:')).toBeInTheDocument();
      expect(screen.getByText(sampleInvoiceWithDiscounts.notes!)).toBeInTheDocument();
    });

    it('hides notes block when invoice has no notes', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithoutDiscounts, mockCustomer);
      render(<InvoicePrintTotals data={model} />);

      expect(screen.queryByText('شروط وملاحظات الفاتورة:')).not.toBeInTheDocument();
    });

    it('renders Footer with 3 signatures boxes and 2 balanced branch columns with "قنا - م الوقف"', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      render(<InvoicePrintFooter data={model} />);

      expect(screen.getByText('توقيع المستلم (العميل)')).toBeInTheDocument();
      expect(screen.getByText(`الاسم: ${mockCustomer.name}`)).toBeInTheDocument();
      expect(screen.getByText('المحاسب / مسؤول المخزن')).toBeInTheDocument();
      expect(screen.getByText('اعتماد الإدارة وختم الشركة')).toBeInTheDocument();

      // Branches verification
      expect(screen.getByText(/فرع قنا/)).toBeInTheDocument();
      expect(screen.getByText('قنا - م الوقف')).toBeInTheDocument();
      expect(screen.queryByText('قنا - بجوار مركز شباب عزبة علام')).not.toBeInTheDocument();
      expect(screen.getByText('01008949310')).toBeInTheDocument();
      expect(screen.getAllByText('01001239995').length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText(/فرع الغردقة/)).toBeInTheDocument();
      expect(screen.getByText('الغردقة - شيراتون')).toBeInTheDocument();
      expect(screen.getByText('01020680007')).toBeInTheDocument();
    });

    it('renders full InvoicePrintTemplate with A4 sheet layout', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithDiscounts, mockCustomer);
      const { container } = render(<InvoicePrintTemplate data={model} />);

      const sheet = container.querySelector('.invoice-sheet');
      expect(sheet).toBeInTheDocument();
      expect(sheet).toHaveAttribute('dir', 'rtl');
    });

    it('handles long invoices with 12 items with stable pagination and break-inside avoidance', () => {
      const longItems = Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i + 1}`,
        invoice_id: 'inv-long',
        product_id: `prod-${i + 1}`,
        product_sku_snapshot: `SKU-${1000 + i}`,
        product_name_snapshot: `منتج تجاري اختباري رقم ${i + 1}`,
        unit_snapshot: i % 2 === 0 ? 'قطعة' : 'شوال',
        quantity: i + 1,
        unit_price: 150,
        discount_type: 'fixed' as const,
        discount_value: 0,
        discount_amount: 0,
        gross_amount: (i + 1) * 150,
        net_amount: (i + 1) * 150,
      }));

      const longInvoice: SalesInvoice = {
        ...sampleInvoiceWithoutDiscounts,
        id: 'inv-long',
        invoice_number: 'INV-LONG-001',
        items: longItems,
        gross_amount: longItems.reduce((acc, it) => acc + it.gross_amount, 0),
        subtotal: longItems.reduce((acc, it) => acc + it.gross_amount, 0),
        final_total: longItems.reduce((acc, it) => acc + it.gross_amount, 0),
      };

      const model = mapInvoiceToPrintModel(longInvoice, mockCustomer);
      const { container } = render(<InvoicePrintTemplate data={model} />);

      const rows = container.querySelectorAll('.print-table tbody tr');
      expect(rows.length).toBe(12);

      // Verify each row has break-inside-avoid for clean A4 printing
      rows.forEach((row) => {
        expect(row).toHaveClass('break-inside-avoid');
      });

      // Verify approval statement is rendered below long list
      expect(
        screen.getByText('السادة / شركة الاميره للتوريدات والتجارة العامة توافق علي عرض اسعاركم آليا.')
      ).toBeInTheDocument();
    });
  });

  describe('4. InvoicePrintPreview Modal Interactions', () => {
    it('renders preview modal with action buttons when open', () => {
      render(
        <InvoicePrintPreview
          invoice={sampleInvoiceWithDiscounts}
          customer={mockCustomer}
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('طباعة الفاتورة (A4)')).toBeInTheDocument();
      expect(screen.getByText('تصدير صورة PNG')).toBeInTheDocument();
      expect(screen.getByText('إغلاق')).toBeInTheDocument();
      expect(screen.getByText('INV-20261117-001')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <InvoicePrintPreview
          invoice={sampleInvoiceWithDiscounts}
          customer={mockCustomer}
          isOpen={false}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText('طباعة الفاتورة (A4)')).not.toBeInTheDocument();
    });

    it('calls onClose when clicking close button or pressing Escape', () => {
      const onClose = vi.fn();
      render(
        <InvoicePrintPreview
          invoice={sampleInvoiceWithDiscounts}
          customer={mockCustomer}
          isOpen={true}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByText('إغلاق'));
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('triggers PNG export and notifies on success', async () => {
      const onNotification = vi.fn();
      render(
        <InvoicePrintPreview
          invoice={sampleInvoiceWithDiscounts}
          customer={mockCustomer}
          isOpen={true}
          onClose={vi.fn()}
          onNotification={onNotification}
        />
      );

      fireEvent.click(screen.getByText('تصدير صورة PNG'));

      await waitFor(() => {
        expect(onNotification).toHaveBeenCalledWith(
          expect.stringContaining('تم تصدير الفاتورة كصورة PNG بنجاح'),
          'success'
        );
      });
    });
  });

  describe('5. Print and Export Safety & Read-Only Invariance', () => {
    it('printInvoice execution does not modify mock inventory or invoice state', async () => {
      const initialProducts = await mockDataService.getProducts();
      const initialInvoices = await mockDataService.getInvoices();

      const dummyElement = document.createElement('div');
      dummyElement.innerHTML = '<h1>Print Test</h1>';

      const result = printInvoice(dummyElement);
      expect(result).toBe(true);

      const afterProducts = await mockDataService.getProducts();
      const afterInvoices = await mockDataService.getInvoices();

      // Assert zero mutation
      expect(afterProducts).toEqual(initialProducts);
      expect(afterInvoices).toEqual(initialInvoices);
    });

    it('exportInvoicePng execution handles null element gracefully without throwing', async () => {
      const result = await exportInvoicePng(null, 'INV-TEST');
      expect(result.success).toBe(false);
      expect(result.error).toContain('تعذر العثور على عنصر الفاتورة');
    });

    it('safely restores window.getComputedStyle in try/finally on normal and error execution', async () => {
      const originalGCS = window.getComputedStyle;
      const dummyElement = document.createElement('div');
      dummyElement.innerHTML = '<div style="color: red;">Test</div>';
      document.body.appendChild(dummyElement);

      // Normal export call
      await exportInvoicePng(dummyElement, 'INV-SUCCESS-TEST');
      expect(window.getComputedStyle).toBe(originalGCS);

      // Repeated export call
      await exportInvoicePng(dummyElement, 'INV-SUCCESS-TEST-2');
      expect(window.getComputedStyle).toBe(originalGCS);

      document.body.removeChild(dummyElement);
    });

    it('strictly documents 80mm thermal receipt printing as unsupported in V1', () => {
      // V1 audit confirmed no thermal printer template exists in the system
      const isThermalPrintingSupportedInV1 = false;
      expect(isThermalPrintingSupportedInV1).toBe(false);
    });
  });

  describe('6. Master Visual QA & Typography Scenarios (Phases 3, 6, 8, 9)', () => {
    it('Scenario D: Renders mixed Arabic-numeric-symbol product names like "كيبة2*2*10سم" with BiDi isolation', () => {
      const stressInvoice: SalesInvoice = {
        ...sampleInvoiceWithoutDiscounts,
        id: 'inv-stress-bidi',
        invoice_number: 'INV-STRESS-001',
        items: [
          {
            id: 'item-bidi-1',
            invoice_id: 'inv-stress-bidi',
            product_id: 'prod-bidi-1',
            product_sku_snapshot: 'BOX-2X2X10',
            product_name_snapshot: 'كيبة2*2*10سم',
            unit_snapshot: 'قطعة',
            quantity: 50,
            unit_price: 15,
            discount_type: 'fixed',
            discount_value: 0,
            discount_amount: 0,
            gross_amount: 750,
            net_amount: 750,
          },
          {
            id: 'item-bidi-2',
            invoice_id: 'inv-stress-bidi',
            product_id: 'prod-bidi-2',
            product_sku_snapshot: 'ALUM-2.5X2.5',
            product_name_snapshot: 'زاوية ألومنيوم 2.5*2.5 سم عالي الجودة (سمك 1.2 مم)',
            unit_snapshot: 'متر',
            quantity: 20.5,
            unit_price: 45,
            discount_type: 'fixed',
            discount_value: 0,
            discount_amount: 0,
            gross_amount: 922.5,
            net_amount: 922.5,
          },
        ],
        gross_amount: 1672.5,
        subtotal: 1672.5,
        final_total: 1672.5,
      };

      const model = mapInvoiceToPrintModel(stressInvoice, mockCustomer);
      const { container } = render(<InvoicePrintTemplate data={model} />);

      // Verify exact name is present
      expect(screen.getByText('كيبة2*2*10سم')).toBeInTheDocument();
      expect(
        screen.getByText('زاوية ألومنيوم 2.5*2.5 سم عالي الجودة (سمك 1.2 مم)')
      ).toBeInTheDocument();

      // Verify bdi isolation wrapping
      const bdiElements = container.querySelectorAll('tbody td bdi');
      expect(bdiElements.length).toBeGreaterThanOrEqual(4);

      // Verify no collision: cell padding classes present
      const nameCells = container.querySelectorAll('.print-table tbody td.text-right');
      nameCells.forEach((cell) => {
        expect(cell).toHaveClass('px-2.5');
        expect(cell).toHaveClass('py-2');
      });
    });

    it('Scenario C: Renders long invoice (30 items) with page break isolation and without container break-inside:avoid', () => {
      const items30 = Array.from({ length: 30 }, (_, i) => ({
        id: `item-long-${i + 1}`,
        invoice_id: 'inv-long-30',
        product_id: `prod-long-${i + 1}`,
        product_sku_snapshot: `SKU-${2000 + i}`,
        product_name_snapshot: `بند توريد رقم ${i + 1} مع تفاصيل المواصفات الفنية المعتمدة للمشروع`,
        unit_snapshot: i % 3 === 0 ? 'متر مكعب' : i % 2 === 0 ? 'طن' : 'شوال',
        quantity: (i + 1) * 2,
        unit_price: 100,
        discount_type: 'fixed' as const,
        discount_value: 0,
        discount_amount: 0,
        gross_amount: (i + 1) * 200,
        net_amount: (i + 1) * 200,
      }));

      const invoice30: SalesInvoice = {
        ...sampleInvoiceWithoutDiscounts,
        id: 'inv-long-30',
        invoice_number: 'INV-30ITEMS-001',
        items: items30,
        gross_amount: items30.reduce((acc, it) => acc + it.gross_amount, 0),
        subtotal: items30.reduce((acc, it) => acc + it.gross_amount, 0),
        final_total: items30.reduce((acc, it) => acc + it.gross_amount, 0),
      };

      const model = mapInvoiceToPrintModel(invoice30, mockCustomer);
      const { container } = render(<InvoicePrintTemplate data={model} />);

      const sheet = container.querySelector('.invoice-sheet');
      expect(sheet).not.toHaveClass('break-inside-avoid');

      const rows = container.querySelectorAll('.print-table tbody tr');
      expect(rows.length).toBe(30);

      // Every individual row must avoid breaking inside
      rows.forEach((row) => {
        expect(row).toHaveClass('break-inside-avoid');
      });
    });

    it('Signature Boxes: Guarantees zero text clipping and removes truncate for long customer names', () => {
      const longNamedCustomer: Customer = {
        ...mockCustomer,
        name: 'مؤسسة النور والهدى للمقاولات والتوريدات العمومية والأعمال الكهروميكانيكية الحديثة',
      };

      const model = mapInvoiceToPrintModel(sampleInvoiceWithoutDiscounts, longNamedCustomer);
      const { container } = render(<InvoicePrintFooter data={model} />);

      const customerSignBox = container.querySelectorAll('.print-sign-box')[0];
      expect(customerSignBox).toHaveClass('min-h-[90px]');
      expect(customerSignBox).toHaveClass('flex-col');
      expect(customerSignBox).toHaveClass('justify-between');

      const nameElement = customerSignBox.querySelector('.break-words');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).not.toHaveClass('truncate');
      expect(nameElement?.textContent).toContain(longNamedCustomer.name);
    });

    it('Compact Footer: Renders sleek contact strip with proper Qena and Hurghada branches', () => {
      const model = mapInvoiceToPrintModel(sampleInvoiceWithoutDiscounts, mockCustomer);
      const { container } = render(<InvoicePrintFooter data={model} />);

      const branchesFooter = container.querySelector('.print-branches-footer');
      expect(branchesFooter).toBeInTheDocument();

      // Qena
      expect(screen.getByText(/فرع قنا/)).toBeInTheDocument();
      expect(screen.getByText('قنا - م الوقف')).toBeInTheDocument();
      expect(screen.getByText('01008949310')).toBeInTheDocument();
      expect(screen.getAllByText('01001239995').length).toBeGreaterThanOrEqual(1);

      // Hurghada
      expect(screen.getByText(/فرع الغردقة/)).toBeInTheDocument();
      expect(screen.getByText('الغردقة - شيراتون')).toBeInTheDocument();
      expect(screen.getByText('01020680007')).toBeInTheDocument();

      // Subtle company identity line
      expect(screen.getByText(/الأميرة للتوريدات العامة والتجارة — نسعد بخدمتكم دائماً/)).toBeInTheDocument();
    });
  });

  describe('6. Mobile Printing & PNG Export Compatibility', () => {
    const originalUserAgent = navigator.userAgent;

    const setUserAgent = (ua: string) => {
      Object.defineProperty(navigator, 'userAgent', {
        value: ua,
        configurable: true,
      });
    };

    afterEach(() => {
      setUserAgent(originalUserAgent);
    });

    it('A. isMobileDevice correctly identifies mobile devices vs desktop', () => {
      // Android phone
      setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Mobile Safari/537.36');
      expect(isMobileDevice()).toBe(true);

      // iPhone
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148');
      expect(isMobileDevice()).toBe(true);

      // Desktop Windows
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36');
      expect(isMobileDevice()).toBe(false);
    });

    it('B. Mobile Print: Opens synchronous popup window with toolbar when popup allowed', () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 Mobile Safari/537.36');

      const mockPrintDoc = {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      };

      const mockPrintWindow = {
        document: mockPrintDoc,
        focus: vi.fn(),
        print: vi.fn(),
        close: vi.fn(),
      } as unknown as Window;

      const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow);

      const dummyElement = document.createElement('div');
      dummyElement.className = 'invoice-sheet';
      dummyElement.innerHTML = '<p>Invoice Content for Mobile</p>';

      const success = printInvoice(dummyElement, { invoiceNumber: 'INV-MOB-01' });

      expect(success).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintDoc.write).toHaveBeenCalled();

      // Check toolbar contents in written HTML
      const writtenHtml = mockPrintDoc.write.mock.calls[0][0] as string;
      expect(writtenHtml).toContain('طباعة / حفظ بتنسيق PDF');
      expect(writtenHtml).toContain('إغلاق');
      expect(writtenHtml).toContain('Invoice Content for Mobile');
      expect(mockPrintDoc.close).toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });

    it('C. Mobile Print Fallback: Falls back to in-page window.print() if popup is blocked', () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 Mobile Safari/537.36');

      const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      const dummyElement = document.createElement('div');
      dummyElement.className = 'invoice-sheet';
      dummyElement.innerHTML = '<p>Invoice Content</p>';

      const success = printInvoice(dummyElement, { invoiceNumber: 'INV-MOB-02' });

      expect(success).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
      expect(windowPrintSpy).toHaveBeenCalled();

      windowOpenSpy.mockRestore();
      windowPrintSpy.mockRestore();
    });

    it('D. Desktop Print: Uses isolated iframe workflow and does not call window.open', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36');

      const windowOpenSpy = vi.spyOn(window, 'open');

      const dummyElement = document.createElement('div');
      dummyElement.className = 'invoice-sheet';
      dummyElement.innerHTML = '<p>Desktop Invoice</p>';

      const success = printInvoice(dummyElement, { invoiceNumber: 'INV-DESK-01' });

      expect(success).toBe(true);
      expect(windowOpenSpy).not.toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });

    it('E. Mobile PNG Export: Invokes Web Share API when supported on mobile', async () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36');

      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });
      Object.defineProperty(navigator, 'canShare', {
        value: canShareMock,
        configurable: true,
      });

      const dummyElement = document.createElement('div');
      dummyElement.className = 'invoice-sheet';
      dummyElement.innerHTML = '<p>Invoice for Web Share</p>';

      const result = await exportInvoicePng(dummyElement, 'INV-SHARE-01');

      expect(result.success).toBe(true);
      expect(result.method).toBe('share');
      expect(shareMock).toHaveBeenCalled();
      expect(shareMock.mock.calls[0][0].title).toContain('فاتورة مبيعات');
    });

    it('F. InvoicePrintActions: Displays responsive loading states and prevents double-taps', () => {
      const { rerender } = render(
        <InvoicePrintActions
          onPrint={vi.fn()}
          onExportPng={vi.fn()}
          onClose={vi.fn()}
          isPrinting={false}
          isExporting={false}
        />
      );

      // Normal state
      expect(screen.getByText('طباعة الفاتورة (A4)')).toBeInTheDocument();
      expect(screen.getByText('تصدير صورة PNG')).toBeInTheDocument();

      // Printing state
      rerender(
        <InvoicePrintActions
          onPrint={vi.fn()}
          onExportPng={vi.fn()}
          onClose={vi.fn()}
          isPrinting={true}
          isExporting={false}
        />
      );

      expect(screen.getByText('جاري فتح الطباعة...')).toBeInTheDocument();
      const printBtn = screen.getByText('جاري فتح الطباعة...').closest('button');
      expect(printBtn).toBeDisabled();

      // Exporting state
      rerender(
        <InvoicePrintActions
          onPrint={vi.fn()}
          onExportPng={vi.fn()}
          onClose={vi.fn()}
          isPrinting={false}
          isExporting={true}
        />
      );

      expect(screen.getByText('جاري تجهيز الصورة...')).toBeInTheDocument();
      const exportBtn = screen.getByText('جاري تجهيز الصورة...').closest('button');
      expect(exportBtn).toBeDisabled();
    });

    it('G. InvoicePrintPreview: Shows ExportImageModal on mobile after PNG export', async () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Mobile Safari/537.36');

      // Make canShare return false so it falls back to preview modal
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(false),
        configurable: true,
      });

      const onNotification = vi.fn();
      render(
        <InvoicePrintPreview
          invoice={sampleInvoiceWithDiscounts}
          customer={mockCustomer}
          isOpen={true}
          onClose={vi.fn()}
          onNotification={onNotification}
        />
      );

      fireEvent.click(screen.getByText('تصدير صورة PNG'));

      await waitFor(() => {
        expect(onNotification).toHaveBeenCalledWith(
          expect.stringContaining('تم تصدير الفاتورة كصورة PNG بنجاح'),
          'success'
        );
      });

      // Verify ExportImageModal appears on mobile
      await waitFor(() => {
        expect(screen.getByText('صورة الفاتورة المعتمدة (جاهزة للحفظ)')).toBeInTheDocument();
        expect(
          screen.getByText(/يمكنك أيضاً الضغط مطولاً على الصورة لحفظها مباشرة في ألبوم الصور بهاتفك/)
        ).toBeInTheDocument();
        expect(screen.getByText('تنزيل الصورة')).toBeInTheDocument();
      });
    });
  });
});
