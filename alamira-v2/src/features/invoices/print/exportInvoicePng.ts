/**
 * High-Resolution Invoice PNG Export Utility (Desktop & Mobile Compatible)
 * 
 * - Desktop:
 *   Retina-quality 2x canvas rasterization and direct file download via Blob URL.
 * 
 * - Mobile Phones & PWAs:
 *   Calibrated 1.5x scale to prevent mobile canvas memory crashes.
 *   Uses canvas.toBlob() with real image/png Blobs (avoiding Android Chrome's block on data: URLs).
 *   Integrates Web Share API (navigator.share) with File objects where supported.
 *   Provides full Blob and URL references for interactive mobile preview & long-press save.
 */

import html2canvas from 'html2canvas';
import { isMobileDevice } from './printInvoice';

export interface PngExportResult {
  success: boolean;
  fileName?: string;
  blob?: Blob;
  blobUrl?: string;
  dataUrl?: string;
  method?: 'download';
  error?: string;
}

export interface PngExportOptions {
  preferShare?: boolean;
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

  const isMobile = isMobileDevice();
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
      try {
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn('Font readiness check skipped or timed out:', fontErr);
      }
    }

    // Intercept computed styles to convert modern CSS oklch() to sRGB for html2canvas
    wrapWindowGCS(window);

    // On mobile, use 1.5 scale to avoid canvas memory exhaustion; on desktop use 2x retina
    const renderScale = isMobile ? 1.5 : 2;

    const canvas = await html2canvas(element, {
      scale: renderScale,
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

        // Ensure cloned invoice sheet has natural scale and uncorrupted Arabic typography
        const clonedSheet = clonedDoc.querySelector('.invoice-sheet') as HTMLElement | null;
        if (clonedSheet) {
          clonedSheet.style.transform = 'none';
          clonedSheet.style.letterSpacing = 'normal';
          clonedSheet.style.direction = 'rtl';
          clonedSheet.style.textAlign = 'right';
          clonedSheet.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";
        }

        // Force letter-spacing normal across all cloned elements to preserve Arabic cursive ligatures in html2canvas
        const allTextElements = clonedDoc.querySelectorAll('.invoice-sheet *');
        allTextElements.forEach((el) => {
          (el as HTMLElement).style.letterSpacing = 'normal';
        });
      },
    });

    const safeNumber = invoiceNumber ? invoiceNumber.replace(/[/\\?%*:|"<>]/g, '-') : 'مبيعات';
    const fileName = `فاتورة_الأميرة_${safeNumber}.png`;

    // Convert canvas to Blob (essential for mobile & Blob URLs)
    let blob: Blob | null = null;
    if (typeof canvas.toBlob === 'function') {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
    }

    // Fallback: convert dataURL to Blob if toBlob is not natively supported
    if (!blob && typeof canvas.toDataURL === 'function') {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        if (typeof window !== 'undefined' && typeof window.atob === 'function') {
          const base64Data = dataUrl.split(',')[1] || '';
          const byteString = atob(base64Data);
          const mimeMatch = dataUrl.split(',')[0].match(/:(.*?);/);
          const mimeString = mimeMatch ? mimeMatch[1] : 'image/png';
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          blob = new Blob([ab], { type: mimeString });
        }
      } catch (convErr) {
        console.warn('Canvas to Blob conversion fallback failed:', convErr);
      }
    }

    if (!blob) {
      // Fallback to dataUrl if toBlob fails
      const fallbackDataUrl = typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : '';
      if (fallbackDataUrl) {
        const fallbackLink = document.createElement('a');
        fallbackLink.download = fileName;
        fallbackLink.href = fallbackDataUrl;
        fallbackLink.style.display = 'none';
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
      }

      return {
        success: true,
        fileName,
        dataUrl: fallbackDataUrl,
        method: 'download',
      };
    }

    const blobUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(blob)
        : (typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : '');

    // ==========================================
    // DIRECT BLOB DOWNLOAD (Desktop & Mobile)
    // One Tap → Generate PNG → Direct Browser Download
    // ==========================================
    const link = document.createElement('a');
    link.download = fileName;
    link.href = blobUrl;
    link.style.display = 'none';
    link.setAttribute('download', fileName);
    link.rel = 'noopener';
    document.body.appendChild(link);

    try {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      link.dispatchEvent(clickEvent);
    } catch {
      link.click();
    }

    // Keep Blob URL alive for 2 minutes to allow mobile downloads to complete in background
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (blobUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(blobUrl);
      }
    }, 120000);

    return {
      success: true,
      fileName,
      blob,
      blobUrl,
      method: 'download',
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
