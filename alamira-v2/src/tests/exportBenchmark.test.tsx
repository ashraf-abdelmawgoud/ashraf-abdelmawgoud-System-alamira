import { describe, it, expect, vi } from 'vitest';
import type { SalesInvoice } from '../types';
import { mapInvoiceToPrintModel } from '../features/invoices/print/invoicePrintMapper';
import { exportInvoicePng } from '../features/invoices/print/exportInvoicePng';

// Mock URL.createObjectURL and URL.revokeObjectURL for JSDOM
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-uuid');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

// Mock html2canvas for unit tests
vi.mock('html2canvas', () => {
  return {
    default: vi.fn().mockImplementation((_el, options) => {
      if (options?.onclone) {
        options.onclone(document);
      }
      return Promise.resolve({
        width: 1588,
        height: 2246,
        toDataURL: () => 'data:image/png;base64,fake',
        toBlob: (cb: (b: Blob) => void) => cb(new Blob(['fake'], { type: 'image/png' })),
      });
    }),
  };
});

const sampleInvoice: SalesInvoice = {
  id: 'inv-bench-01',
  invoice_number: 'INV-BENCH-01',
  invoice_date: '2026-11-20',
  customer_id: 'cust-01',
  customer_name_snapshot: 'شركة الأميرة للتوريدات',
  payment_terms: 'cash',
  status: 'approved',
  gross_amount: 540000,
  item_discounts_amount: 5000,
  subtotal: 535000,
  invoice_discount_type: 'fixed',
  invoice_discount_value: 0,
  invoice_discount_amount: 0,
  additional_charges: 0,
  final_total: 535000,
  created_at: '2026-11-20T10:00:00Z',
  items: [
    {
      id: 'item-1',
      invoice_id: 'inv-bench-01',
      product_id: 'prod-1',
      product_name_snapshot: 'أسمنت بورتلاندي فاخر ممتاز',
      product_sku_snapshot: 'CEM-01',
      unit_snapshot: 'طن',
      quantity: 50,
      unit_price: 2400,
      discount_type: 'none',
      discount_value: 0,
      discount_amount: 0,
      gross_amount: 120000,
      net_amount: 120000,
    },
    {
      id: 'item-2',
      invoice_id: 'inv-bench-01',
      product_id: 'prod-2',
      product_name_snapshot: 'حديد تسليح 12 مم عالي المقاومة',
      product_sku_snapshot: 'STL-01',
      unit_snapshot: 'طن',
      quantity: 10,
      unit_price: 42000,
      discount_type: 'none',
      discount_value: 0,
      discount_amount: 0,
      gross_amount: 420000,
      net_amount: 420000,
    },
  ],
};

describe('PNG Export Performance Profiling & Microbenchmarks', () => {
  it('measures invoice print model mapping time', () => {
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      mapInvoiceToPrintModel(sampleInvoice);
    }
    const duration = performance.now() - t0;
    const perCall = duration / 100;
    console.log(`[Benchmark] mapInvoiceToPrintModel per call: ${perCall.toFixed(3)}ms`);
    expect(perCall).toBeLessThan(5); // Must be under 5ms
  });

  it('measures CSS style injection vs DOM traversal for letter-spacing normalization', () => {
    // Benchmark Approach A: querySelectorAll + inline style mutation on 200 elements
    const containerA = document.createElement('div');
    containerA.className = 'invoice-sheet';
    for (let i = 0; i < 200; i++) {
      const el = document.createElement('div');
      el.textContent = `عنصر تجريبي رقم ${i}`;
      containerA.appendChild(el);
    }
    document.body.appendChild(containerA);

    const t0A = performance.now();
    const allTextA = containerA.querySelectorAll('*');
    allTextA.forEach((el) => {
      (el as HTMLElement).style.letterSpacing = 'normal';
    });
    const durationA = performance.now() - t0A;

    // Benchmark Approach B: single <style> tag injection
    const containerB = document.createElement('div');
    containerB.className = 'invoice-sheet';
    for (let i = 0; i < 200; i++) {
      const el = document.createElement('div');
      el.textContent = `عنصر تجريبي رقم ${i}`;
      containerB.appendChild(el);
    }
    document.body.appendChild(containerB);

    const t0B = performance.now();
    const styleTag = document.createElement('style');
    styleTag.textContent = '.invoice-sheet, .invoice-sheet * { letter-spacing: normal !important; }';
    document.head.appendChild(styleTag);
    const durationB = performance.now() - t0B;

    console.log(`[Benchmark] Loop & mutate 200 elements: ${durationA.toFixed(3)}ms`);
    console.log(`[Benchmark] Single <style> injection: ${durationB.toFixed(3)}ms`);

    expect(durationB).toBeLessThanOrEqual(durationA + 1); // Style injection is significantly faster or equal

    document.body.removeChild(containerA);
    document.body.removeChild(containerB);
    document.head.removeChild(styleTag);
  });

  it('measures DOM tree pruning with ignoreElements', () => {
    // Simulate full ERP DOM tree: 1000 background elements + invoice modal with 100 elements
    const root = document.createElement('div');
    root.id = 'root';

    // 1. Heavy background app tree
    const appLayout = document.createElement('div');
    appLayout.className = 'app-layout';
    for (let i = 0; i < 500; i++) {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `<span>صنف ${i}</span><span>100</span><span>200</span><button>تعديل</button>`;
      appLayout.appendChild(row);
    }
    root.appendChild(appLayout);

    // 2. Modal with invoice sheet
    const modal = document.createElement('div');
    modal.className = 'invoice-print-modal-backdrop';
    const invoiceSheet = document.createElement('div');
    invoiceSheet.className = 'invoice-sheet';
    invoiceSheet.innerHTML = '<h1>فاتورة رسمية</h1>';
    modal.appendChild(invoiceSheet);
    root.appendChild(modal);

    document.body.appendChild(root);

    // Measure how many elements are traversed WITHOUT ignoreElements
    let unprunedCount = 0;
    const traverseUnpruned = (el: Element) => {
      unprunedCount++;
      for (let i = 0; i < el.children.length; i++) {
        traverseUnpruned(el.children[i]);
      }
    };
    traverseUnpruned(root);

    // Measure how many elements are traversed WITH ignoreElements logic
    let prunedCount = 0;
    const ignoreElements = (el: Element): boolean => {
      if (el !== invoiceSheet && !el.contains(invoiceSheet) && !invoiceSheet.contains(el)) {
        if (el.parentElement === root || el.parentElement === document.body) {
          return true; // Ignore heavy sibling subtrees!
        }
      }
      return false;
    };

    const traversePruned = (el: Element) => {
      if (ignoreElements(el)) return;
      prunedCount++;
      for (let i = 0; i < el.children.length; i++) {
        traversePruned(el.children[i]);
      }
    };
    traversePruned(root);

    console.log(`[Benchmark] Unpruned DOM nodes cloned: ${unprunedCount}`);
    console.log(`[Benchmark] Pruned DOM nodes cloned: ${prunedCount}`);
    console.log(`[Benchmark] Pruning efficiency: ${(((unprunedCount - prunedCount) / unprunedCount) * 100).toFixed(1)}% reduction`);

    expect(prunedCount).toBeLessThan(unprunedCount * 0.1); // More than 90% reduction!

    document.body.removeChild(root);
  });

  it('measures exportInvoicePng execution and verifies granular performance metrics', async () => {
    const dummySheet = document.createElement('div');
    dummySheet.className = 'invoice-sheet';
    dummySheet.innerHTML = '<h2>فاتورة قياس الأداء</h2>';
    document.body.appendChild(dummySheet);

    try {
      const result = await exportInvoicePng(dummySheet, 'BENCH-001');
      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      if (result.metrics) {
        expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
        expect(result.metrics.html2canvasMs).toBeGreaterThanOrEqual(0);
        expect(result.metrics.canvasWidth).toBe(1588);
        expect(result.metrics.canvasHeight).toBe(2246);
        console.log('[Benchmark Metrics]', JSON.stringify(result.metrics));
      }
    } finally {
      document.body.removeChild(dummySheet);
    }
  });
});
