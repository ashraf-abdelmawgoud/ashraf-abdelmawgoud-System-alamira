/**
 * High-Resolution Invoice PNG Export Utility
 * Uses html2canvas to capture the exact rendered invoice sheet at 2x retina scale.
 * Preserves Arabic RTL typography, navy-and-gold styling, and full document bounds.
 * Transparently converts Tailwind v4 oklch() colors to sRGB for html2canvas compatibility.
 */

import html2canvas from 'html2canvas';

export interface PngExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  const r = +4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S;
  const g = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S;
  const b = -0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S;

  const gamma = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
  const clamp = (x: number) => Math.min(255, Math.max(0, Math.round(gamma(x) * 255)));

  if (a < 1) {
    return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${a})`;
  }
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

function convertOklchStringToRgb(str: string | null | undefined): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str || '';
  return str.replace(
    /oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+|none)(?:\s*\/\s*([\d.%]+))?\s*\)/gi,
    (_, lStr, cStr, hStr, aStr) => {
      let l = parseFloat(lStr);
      if (lStr.endsWith('%')) l = l / 100;
      let c = parseFloat(cStr);
      if (cStr.endsWith('%')) c = c / 100;
      const h = hStr === 'none' ? 0 : parseFloat(hStr) || 0;
      let a = 1;
      if (aStr) {
        a = parseFloat(aStr);
        if (aStr.endsWith('%')) a = a / 100;
      }
      return oklchToRgb(l, c, h, a);
    }
  );
}

export async function exportInvoicePng(
  element: HTMLElement | null,
  invoiceNumber: string
): Promise<PngExportResult> {
  if (!element) {
    return {
      success: false,
      error: 'تعذر العثور على عنصر الفاتورة لتصدير الصورة',
    };
  }

  const origWindowGCS = window.getComputedStyle;

  const wrapWindowGCS = (targetWindow: Window) => {
    const orig = targetWindow.getComputedStyle;
    targetWindow.getComputedStyle = function (el: Element, pseudo?: string | null) {
      const style = orig.call(targetWindow, el, pseudo);
      return new Proxy(style, {
        get(target, prop) {
          const val = (target as unknown as Record<string, unknown>)[prop as string];
          if (typeof val === 'function') {
            if (prop === 'getPropertyValue') {
              return (p: string) => convertOklchStringToRgb(val.call(target, p));
            }
            return val.bind(target);
          }
          if (typeof val === 'string') {
            return convertOklchStringToRgb(val);
          }
          return val;
        },
      });
    };
  };

  try {
    // Ensure document fonts have completed loading before rasterization
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Intercept computed styles to convert modern CSS oklch() to sRGB for html2canvas
    wrapWindowGCS(window);

    // High resolution retina canvas rendering (scale: 2)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        if (clonedDoc.defaultView) {
          wrapWindowGCS(clonedDoc.defaultView);
        }
      },
    });

    const safeNumber = invoiceNumber ? invoiceNumber.replace(/[/\\?%*:|"<>]/g, '-') : 'مبيعات';
    const fileName = `فاتورة_الأميرة_${safeNumber}.png`;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return {
      success: true,
      fileName,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Invoice PNG export error:', err);
    return {
      success: false,
      error: `فشل تصدير الفاتورة كصورة: ${errorMsg}`,
    };
  } finally {
    window.getComputedStyle = origWindowGCS;
  }
}
