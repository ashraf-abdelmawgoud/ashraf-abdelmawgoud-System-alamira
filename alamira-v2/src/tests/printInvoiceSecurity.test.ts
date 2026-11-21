import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printInvoice } from '../features/invoices/print/printInvoice';

const invoiceNumbers = [
  'TEST-2026-001',
  'تجربة-١٢٣ & "A4" <رقم>',
  '</title><script>window.printInjection = true</script><img id="injected" src="x" onerror="window.printInjection = true">',
];

function createSyntheticSheet(): HTMLElement {
  const sheet = document.createElement('section');
  sheet.className = 'invoice-sheet';
  sheet.dir = 'rtl';
  sheet.innerHTML = '<img src="/logo.png" alt="شعار الأميرة"><p>عميل تجريبي</p><table><tbody><tr><td>صنف تجريبي</td><td>125.50</td></tr></tbody></table><strong>الإجمالي 125.50</strong>';
  return sheet;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe.each(['popup', 'iframe'] as const)('%s print title security', (mode) => {
  it.each(invoiceNumbers)('preserves invoice number as text: %s', async (invoiceNumber) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      mode === 'popup' ? 'Android' : 'Desktop'
    );
    const sheet = createSyntheticSheet();
    const originalSheet = sheet.outerHTML;
    const popupDocument = document.implementation.createHTMLDocument();
    const popupPrint = vi.fn();
    const popupFocus = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue({
      document: popupDocument,
      print: popupPrint,
      focus: popupFocus,
    } as unknown as Window);

    expect(printInvoice(sheet, { invoiceNumber })).toBe(true);

    const iframe = document.querySelector('iframe');
    const printDocument = mode === 'popup' ? popupDocument : iframe!.contentDocument!;
    const print = mode === 'popup'
      ? popupPrint
      : vi.spyOn(iframe!.contentWindow!, 'print').mockImplementation(() => {});
    if (mode === 'iframe') {
      vi.spyOn(iframe!.contentWindow!, 'focus').mockImplementation(() => {});
      expect(open).not.toHaveBeenCalled();
    } else {
      expect(open).toHaveBeenCalledWith('', '_blank');
      expect(iframe).toBeNull();
    }

    const expectedTitle = `فاتورة مبيعات - شركة الأميرة للتوريدات والتجارة العامة (${invoiceNumber})`;
    expect(printDocument.title).toBe(expectedTitle);
    expect(printDocument.querySelector('title')?.textContent).toBe(expectedTitle);
    expect(printDocument.querySelectorAll('title')).toHaveLength(1);
    expect(printDocument.querySelector('script, #injected, [onerror]')).toBeNull();
    expect(printDocument.documentElement.dir).toBe('rtl');
    expect(printDocument.documentElement.lang).toBe('ar');
    expect(printDocument.body.dir).toBe('rtl');
    expect(printDocument.querySelector('style')?.textContent).toContain('size: A4 portrait');
    expect(printDocument.querySelector('.invoice-sheet')?.outerHTML).toBe(originalSheet);
    expect(sheet.outerHTML).toBe(originalSheet);
    expect(Boolean(printDocument.querySelector('.mobile-print-btn'))).toBe(mode === 'popup');

    await vi.advanceTimersByTimeAsync(500);
    expect(print).toHaveBeenCalledTimes(1);
  });
});

it('preserves in-page printing when the mobile popup is blocked', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
  vi.spyOn(window, 'open').mockReturnValue(null);
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const originalTitle = document.title;

  expect(printInvoice(createSyntheticSheet(), { invoiceNumber: invoiceNumbers[2] })).toBe(true);
  expect(print).toHaveBeenCalledTimes(1);
  expect(document.title).toBe(originalTitle);
  expect(document.querySelector('#injected')).toBeNull();
});
