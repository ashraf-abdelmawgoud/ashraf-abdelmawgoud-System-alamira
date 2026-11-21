import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { exportInvoicePng } from '../features/invoices/print/exportInvoicePng';
import { InvoicePrintPreview } from '../features/invoices/print/InvoicePrintPreview';
import type { SalesInvoice } from '../types';

vi.mock('html2canvas', () => ({ default: vi.fn() }));
vi.mock('../services/dataService', () => ({ dataService: { logInvoiceExportPng: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 'synthetic-user' } }) }));
vi.mock('../features/invoices/print/invoicePrintMapper', () => ({ mapInvoiceToPrintModel: () => ({}) }));
vi.mock('../features/invoices/print/InvoicePrintTemplate', () => ({
  InvoicePrintTemplate: React.forwardRef<HTMLDivElement>((_props, ref) => (
    <div ref={ref} className="invoice-sheet" dir="rtl">فاتورة تجريبية 125.50</div>
  )),
}));

let now: number;
let info: ReturnType<typeof vi.spyOn>;
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
const originalCreateUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function canvas(blob: Blob | null = new Blob(['synthetic-png'], { type: 'image/png' })) {
  return {
    width: 1588, height: 2246,
    toBlob: vi.fn((callback: BlobCallback) => { now += 7; callback(blob); }),
    toDataURL: vi.fn(() => 'data:image/png;base64,dGVzdA=='),
  } as unknown as HTMLCanvasElement;
}

function sheet() {
  const element = document.createElement('div');
  element.className = 'invoice-sheet';
  element.textContent = 'فاتورة تجريبية 125.50';
  return element;
}

beforeEach(() => {
  vi.useFakeTimers();
  now = 100;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(now), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loaded' } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:synthetic') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'dispatchEvent').mockReturnValue(true);
  vi.mocked(html2canvas).mockReset();
  vi.mocked(html2canvas).mockImplementation(async (element, options) => {
    now += 20;
    const clone = document.implementation.createHTMLDocument();
    clone.body.appendChild(element.cloneNode(true));
    await options?.onclone?.(clone, clone.body.firstElementChild as HTMLElement);
    now += 30;
    return canvas();
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
  else Reflect.deleteProperty(document, 'fonts');
  if (originalCreateUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateUrl);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (originalRevokeUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeUrl);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
  document.body.replaceChildren();
});

describe('PNG export diagnostics', () => {
  it('captures overflowing long-invoice content beyond the A4 sheet box', async () => {
    const element = sheet();
    Object.defineProperty(element, 'scrollHeight', { value: 4629 });
    Object.defineProperty(element, 'offsetHeight', { value: 1123 });
    const result = await exportInvoicePng(element, 'SYNTHETIC-LONG');
    expect(result.success).toBe(true);
    expect(vi.mocked(html2canvas).mock.calls[0][1]).toMatchObject({ height: 4629, scale: 2 });
  });

  it('reports missing-target failures without invoking the renderer', async () => {
    const result = await exportInvoicePng(null, 'SYNTHETIC');
    expect(result.success).toBe(false);
    expect(result.metrics).toMatchObject({ stage: 'target', outcome: 'failure', tapToDownloadRequestMs: null });
    expect(html2canvas).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('records stage boundaries and preserves scale, encoding and delayed download cleanup', async () => {
    const originalStyle = window.getComputedStyle;
    const result = await exportInvoicePng(sheet(), 'SYNTHETIC', {
      tapStartedAt: 90, feedbackCommittedAt: 95, feedbackPaintOpportunityAt: 99,
    });
    expect(result.success).toBe(true);
    expect(result.metrics).toMatchObject({
      beforeOncloneMs: 20, afterOncloneMs: 30, html2canvasMs: 50,
      blobConversionMs: 7, totalDurationMs: 57,
      tapToFeedbackCommitMs: 5, tapToFeedbackPaintOpportunityMs: 9,
      tapToDownloadRequestMs: 67, tapToExportEndMs: 67,
      imageReadinessMs: 0, encodingPath: 'toBlob', outcome: 'download-requested',
      canvasWidth: 1588, canvasHeight: 2246,
    });
    expect(vi.mocked(html2canvas).mock.calls[0][1]).toMatchObject({ scale: 2, imageTimeout: 5000, useCORS: true });
    expect(window.getComputedStyle).toBe(originalStyle);
    expect(document.querySelector('a[download]')).not.toBeNull();
    expect(info.mock.calls[0][1]).not.toContain('SYNTHETIC');
    await vi.advanceTimersByTimeAsync(119999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('observes image readiness without awaiting images and removes observation listeners', async () => {
    const element = sheet();
    const image = document.createElement('img');
    Object.defineProperty(image, 'complete', { value: false });
    Object.defineProperty(image, 'naturalWidth', { value: 100 });
    element.appendChild(image);
    const remove = vi.spyOn(image, 'removeEventListener');
    vi.mocked(html2canvas).mockImplementationOnce(async () => {
      now += 12;
      image.dispatchEvent(new Event('load'));
      return canvas();
    });
    const result = await exportInvoicePng(element, 'SYNTHETIC');
    expect(result.metrics).toMatchObject({ imageCount: 1, imageReadinessMs: 12, pendingImages: 0, failedImages: 0 });
    expect(remove).toHaveBeenCalledWith('load', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('records renderer failure and restores the style hook and pending image listeners', async () => {
    const element = sheet();
    const image = document.createElement('img');
    Object.defineProperty(image, 'complete', { value: false });
    element.appendChild(image);
    const remove = vi.spyOn(image, 'removeEventListener');
    const originalStyle = window.getComputedStyle;
    vi.mocked(html2canvas).mockImplementationOnce(async () => { now += 15; throw new Error('synthetic failure'); });
    const result = await exportInvoicePng(element, 'SYNTHETIC');
    expect(result.success).toBe(false);
    expect(result.metrics).toMatchObject({ outcome: 'failure', stage: 'render', html2canvasMs: 15, imageReadinessMs: null, pendingImages: 1 });
    expect(window.getComputedStyle).toBe(originalStyle);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('identifies synchronous encoding fallback and empty output failures', async () => {
    vi.mocked(html2canvas).mockResolvedValueOnce(canvas(null));
    const fallback = await exportInvoicePng(sheet(), 'SYNTHETIC');
    expect(fallback.metrics?.encodingPath).toBe('dataURL-fallback');
    expect(fallback.success).toBe(true);
    vi.mocked(html2canvas).mockResolvedValueOnce(canvas(new Blob([])));
    const failed = await exportInvoicePng(sheet(), 'SYNTHETIC');
    expect(failed.success).toBe(false);
    expect(failed.metrics).toMatchObject({ stage: 'encode', outcome: 'failure', tapToDownloadRequestMs: null });
  });

  it('records font timeout without extending the existing 800ms limit', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loading', ready: new Promise(() => {}) } });
    const pending = exportInvoicePng(sheet(), 'SYNTHETIC');
    await vi.advanceTimersByTimeAsync(799);
    expect(html2canvas).not.toHaveBeenCalled();
    now += 800;
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).metrics).toMatchObject({ fontWaitOutcome: 'timeout', fontReadinessMs: 800 });
  });

  it('clears the font timer when readiness wins and reports encoding exceptions', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: {
      status: 'loading', ready: Promise.resolve(),
    } });
    const output = canvas();
    vi.mocked(output.toBlob).mockImplementation(() => { now += 9; throw new Error('synthetic encoding error'); });
    vi.mocked(html2canvas).mockResolvedValueOnce(output);
    const result = await exportInvoicePng(sheet(), 'SYNTHETIC');
    expect(result.success).toBe(false);
    expect(result.metrics).toMatchObject({ fontWaitOutcome: 'ready', stage: 'encode', blobConversionMs: 9 });
    expect(vi.getTimerCount()).toBe(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('allows one export for repeated taps, measures feedback, and allows retry after failure', async () => {
    let rejectRender!: (reason: Error) => void;
    vi.mocked(html2canvas).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRender = reject; }));
    const notify = vi.fn();
    // The mapper and template are isolated above; no accounts or API calls are involved.
    const invoice = { id: 'synthetic', invoice_number: 'SYNTHETIC' } as SalesInvoice;
    const view = render(<InvoicePrintPreview invoice={invoice} isOpen onClose={vi.fn()} onNotification={notify} />);
    const button = screen.getByRole('button', { name: /تصدير صورة PNG/ });
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(html2canvas).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /جاري تجهيز الصورة/ })).toBeDisabled();
    now += 32;
    await act(async () => { await vi.advanceTimersByTimeAsync(32); });
    expect(info.mock.calls.some(([tag]) => tag === '[InvoicePng Feedback]')).toBe(true);
    await act(async () => { rejectRender(new Error('synthetic failure')); });
    expect(notify).toHaveBeenLastCalledWith(expect.any(String), 'error');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /تصدير صورة PNG/ })); });
    expect(html2canvas).toHaveBeenCalledTimes(2);
    view.unmount();
    await vi.advanceTimersByTimeAsync(120000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
