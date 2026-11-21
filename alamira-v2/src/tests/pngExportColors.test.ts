import { afterEach, describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { exportInvoicePng } from '../features/invoices/print/exportInvoicePng';

vi.mock('html2canvas', () => ({ default: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
  document.querySelectorAll('iframe').forEach((frame) => frame.remove());
});

describe('PNG render color compatibility', () => {
  it.each([true, false])('converts clone colors with extensible declarations set to %s', async (extensible) => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const clone = iframe.contentDocument!;
    const cloneSheet = clone.createElement('div');
    cloneSheet.className = 'invoice-sheet';
    clone.body.appendChild(cloneSheet);
    const style = Object.create({
      color: 'oklch(0% 0 0)',
      backgroundImage: 'linear-gradient(oklch(0% 0 0), oklch(100% 0 0))',
      borderTopColor: 'oklch(0% 0 0 / 50%)',
      direction: 'rtl',
    }) as CSSStyleDeclaration;
    if (!extensible) Object.preventExtensions(style);
    vi.spyOn(clone.defaultView!, 'getComputedStyle').mockReturnValue(style);
    let renderedStyle: CSSStyleDeclaration | undefined;
    vi.mocked(html2canvas).mockImplementationOnce(async (_element, options) => {
      await options?.onclone?.(clone, cloneSheet);
      renderedStyle = clone.defaultView!.getComputedStyle(cloneSheet);
      // Finish before download; the assertions concern the renderer's style input.
      const canvas = document.createElement('canvas');
      canvas.width = 0;
      return canvas;
    });

    const source = document.createElement('div');
    await exportInvoicePng(source, 'SYNTHETIC');

    expect(renderedStyle?.color).toBe('rgb(0, 0, 0)');
    expect(renderedStyle?.backgroundImage).toBe('linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))');
    expect(renderedStyle?.borderTopColor).toBe('rgba(0, 0, 0, 0.5)');
    expect(renderedStyle?.direction).toBe('rtl');
    expect(renderedStyle === style).toBe(extensible);
  });
});
