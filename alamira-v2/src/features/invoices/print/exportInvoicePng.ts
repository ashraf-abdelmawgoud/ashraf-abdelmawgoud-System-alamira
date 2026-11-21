/**
 * High-Resolution Invoice PNG Export Utility (Desktop & Mobile Compatible)
 * 
 * - Desktop:
 *   Retina-quality 2x canvas rasterization and direct file download via Blob URL.
 * 
 * - Mobile Phones & PWAs:
 *   Uses the same 2x canvas scale as desktop.
 *   Uses canvas.toBlob() with real image/png Blobs (avoiding Android Chrome's block on data: URLs).
 *   Requests a direct Blob URL download and returns the Blob and URL references.
 */

import html2canvas from 'html2canvas';

export interface PngExportMetrics {
  totalDurationMs: number;
  fontReadinessMs: number;
  domPreparationMs: number;
  html2canvasMs: number;
  oncloneMs: number;
  blobConversionMs: number;
  downloadInitiationMs: number;
  canvasWidth?: number;
  canvasHeight?: number;
  tapStartedAt: number;
  tapToFeedbackCommitMs: number | null;
  tapToFeedbackPaintOpportunityMs: number | null;
  tapToDownloadRequestMs: number | null;
  tapToExportEndMs: number;
  imageReadinessMs: number | null;
  imageCount: number;
  pendingImages: number;
  failedImages: number;
  fontWaitOutcome: 'skipped' | 'ready' | 'timeout' | 'error';
  // Includes library cloning and clone font/image waits before its public hook.
  beforeOncloneMs: number | null;
  // Includes parsing, resource waits and rasterization after the public hook.
  afterOncloneMs: number | null;
  encodingPath: 'none' | 'toBlob' | 'dataURL-fallback';
  outcome: 'failure' | 'download-requested';
  stage: 'target' | 'fonts' | 'preparation' | 'render' | 'encode' | 'download';
}

export interface PngExportInteraction {
  tapStartedAt: number;
  feedbackCommittedAt?: number;
  feedbackPaintOpportunityAt?: number;
}

export interface PngExportResult {
  success: boolean;
  fileName?: string;
  blob?: Blob;
  blobUrl?: string;
  dataUrl?: string;
  method?: 'download';
  error?: string;
  metrics?: PngExportMetrics;
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

// Color-bearing declarations read by html2canvas 1.4.1 while parsing the clone.
const rendererColorProperties = [
  'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor', 'boxShadow', 'color', 'listStyleImage',
  'textDecorationColor', 'textShadow', 'webkitTextStrokeColor',
] as const;

export async function exportInvoicePng(
  element: HTMLElement | null,
  invoiceNumber: string,
  interaction?: PngExportInteraction
): Promise<PngExportResult> {
  const t0 = performance.now();
  let fontReadinessMs = 0;
  let domPreparationMs = 0;
  let html2canvasMs = 0;
  let oncloneMs = 0;
  let blobConversionMs = 0;
  let downloadInitiationMs = 0;
  let stageStartedAt = t0;
  let cloneEndedAt: number | undefined;
  const imageListenerCleanup: Array<() => void> = [];
  const metrics: PngExportMetrics = {
    totalDurationMs: 0, fontReadinessMs: 0, domPreparationMs: 0,
    html2canvasMs: 0, oncloneMs: 0, blobConversionMs: 0, downloadInitiationMs: 0,
    tapStartedAt: interaction?.tapStartedAt ?? t0,
    tapToFeedbackCommitMs: null, tapToFeedbackPaintOpportunityMs: null,
    tapToDownloadRequestMs: null, tapToExportEndMs: 0,
    imageReadinessMs: null, imageCount: 0, pendingImages: 0, failedImages: 0,
    fontWaitOutcome: 'skipped', beforeOncloneMs: null, afterOncloneMs: null,
    encodingPath: 'none', outcome: 'failure', stage: 'target',
  };

  const origWindowGCS = window.getComputedStyle;
  let renderDocument: Document | undefined;

  const wrapWindowGCS = (targetWindow: Window) => {
    const orig = targetWindow.getComputedStyle;
    targetWindow.getComputedStyle = function (el: Element, pseudo?: string | null) {
      const style = orig.call(targetWindow, el, pseudo);
      // Keep ordinary property reads native during the renderer's CSS parsing.
      // Cloning and pseudo-elements retain generic normalization for copied styles.
      if (el.ownerDocument === renderDocument && !pseudo) {
        try {
          for (const property of rendererColorProperties) {
            const value = style[property];
            if (value?.includes('oklch')) {
              Object.defineProperty(style, property, {
                configurable: true,
                value: convertOklchStringToRgb(value),
              });
            }
          }
          return style;
        } catch {
          // Keep the existing proxy path on browsers with non-extensible declarations.
        }
      }
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
    if (!element) {
      return {
        success: false,
        metrics,
        error: 'تعذر العثور على عنصر الفاتورة لتصدير الصورة',
      };
    }
    // Observe existing image loads without introducing an extra readiness wait.
    const images = Array.from(element.querySelectorAll('img'));
    metrics.imageCount = images.length;
    metrics.pendingImages = images.filter((image) => !image.complete).length;
    metrics.failedImages = images.filter((image) => image.complete && image.naturalWidth === 0).length;
    if (metrics.pendingImages === 0) metrics.imageReadinessMs = 0;
    for (const image of images.filter((image) => !image.complete)) {
      const settled = () => {
        image.removeEventListener('load', settled);
        image.removeEventListener('error', settled);
        metrics.pendingImages--;
        if (image.naturalWidth === 0) metrics.failedImages++;
        if (metrics.pendingImages === 0) metrics.imageReadinessMs = performance.now() - t0;
      };
      image.addEventListener('load', settled);
      image.addEventListener('error', settled);
      imageListenerCleanup.push(() => {
        image.removeEventListener('load', settled);
        image.removeEventListener('error', settled);
      });
    }
    // 1. FAST FONT READINESS: Skip waiting if fonts are already loaded in memory
    const tFontStart = performance.now();
    metrics.stage = 'fonts';
    stageStartedAt = tFontStart;
    if (document.fonts && document.fonts.status !== 'loaded' && document.fonts.ready) {
      let fontTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        metrics.fontWaitOutcome = await Promise.race([
          document.fonts.ready.then(() => 'ready' as const),
          new Promise<'timeout'>((resolve) => { fontTimer = setTimeout(() => resolve('timeout'), 800); }),
        ]);
      } catch (fontErr) {
        metrics.fontWaitOutcome = 'error';
        console.warn('Font readiness check skipped or timed out:', fontErr);
      } finally {
        clearTimeout(fontTimer);
      }
    }
    fontReadinessMs = performance.now() - tFontStart;

    // 2. DOM PREPARATION: Wrap live window to protect html2canvas from modern OKLCH colors during DOM cloning
    const tDomPrepStart = performance.now();
    metrics.stage = 'preparation';
    stageStartedAt = tDomPrepStart;
    wrapWindowGCS(window);
    const renderScale = 2; // Universal 2x retina scale for pixel-perfect clarity
    domPreparationMs = performance.now() - tDomPrepStart;

    // 3. ROBUST HTML2CANVAS RASTERIZATION:
    // - Only ignore explicitly flagged toolbar elements (preserves 100% of invoice, fonts, images, and styles)
    // - imageTimeout 5000ms prevents infinite hangs on slow assets
    const tH2CStart = performance.now();
    metrics.stage = 'render';
    stageStartedAt = tH2CStart;
    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 5000,
      ignoreElements: (node: Element) => {
        // Safely ignore print-hidden preview toolbar buttons
        if (node.classList?.contains('no-print') || node.classList?.contains('invoice-print-modal-actions')) {
          return true;
        }
        return false;
      },
      onclone: (clonedDoc: Document) => {
        const tOncloneStart = performance.now();
        metrics.beforeOncloneMs = tOncloneStart - tH2CStart;
        if (clonedDoc !== document) renderDocument = clonedDoc;
        if (clonedDoc.defaultView) {
          wrapWindowGCS(clonedDoc.defaultView);
        }

        // CRITICAL ROOT-CAUSE REPAIR FOR MOBILE CHROME ANDROID:
        // Reset preview modal scaling containers so responsive scale transforms never distort the A4 invoice
        const clonedSheet = clonedDoc.querySelector('.invoice-sheet') as HTMLElement | null;
        if (clonedSheet) {
          let ancestor = clonedSheet.parentElement;
          while (ancestor && ancestor !== clonedDoc.body) {
            if (
              ancestor.classList.contains('invoice-print-modal-inner-scale') ||
              ancestor.classList.contains('invoice-print-modal-scale-wrapper')
            ) {
              ancestor.style.transform = 'none';
              ancestor.style.position = 'static';
              ancestor.style.left = 'auto';
              ancestor.style.top = 'auto';
              ancestor.style.margin = '0 auto';
              ancestor.style.padding = '0';
              ancestor.style.width = '794px';
              ancestor.style.minWidth = '794px';
              ancestor.style.maxWidth = '794px';
              ancestor.style.height = 'auto';
              ancestor.style.minHeight = '0';
              ancestor.style.overflow = 'visible';
            }
            ancestor = ancestor.parentElement;
          }

          clonedSheet.style.transform = 'none';
          clonedSheet.style.position = 'relative';
          clonedSheet.style.left = 'auto';
          clonedSheet.style.top = 'auto';
          clonedSheet.style.margin = '0 auto';
          clonedSheet.style.width = '794px';
          clonedSheet.style.minWidth = '794px';
          clonedSheet.style.maxWidth = '794px';
          clonedSheet.style.boxShadow = 'none';
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

        oncloneMs = performance.now() - tOncloneStart;
        cloneEndedAt = performance.now();
      },
    });
    html2canvasMs = performance.now() - tH2CStart;
    if (cloneEndedAt !== undefined) metrics.afterOncloneMs = performance.now() - cloneEndedAt;
    metrics.canvasWidth = canvas?.width;
    metrics.canvasHeight = canvas?.height;

    // VALIDATION: Ensure canvas was rendered with valid non-zero dimensions
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return {
        success: false,
        metrics,
        error: 'تعذر تصيير صورة الفاتورة (أبعاد الصورة غير صالحة).',
      };
    }

    const safeNumber = invoiceNumber ? invoiceNumber.replace(/[/\\?%*:|"<>]/g, '-') : 'مبيعات';
    const fileName = `فاتورة_الأميرة_${safeNumber}.png`;

    // 4. CANVAS-TO-BLOB CONVERSION
    const tBlobStart = performance.now();
    metrics.stage = 'encode';
    stageStartedAt = tBlobStart;
    let blob: Blob | null = null;
    if (typeof canvas.toBlob === 'function') {
      metrics.encodingPath = 'toBlob';
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
    }

    // Fallback: convert dataURL to Blob if toBlob is not natively supported
    if (!blob && typeof canvas.toDataURL === 'function') {
      metrics.encodingPath = 'dataURL-fallback';
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
    blobConversionMs = performance.now() - tBlobStart;

    // VALIDATION: Ensure blob is non-empty before initiating download
    if (!blob || blob.size === 0) {
      return {
        success: false,
        metrics,
        error: 'تعذر إنشاء ملف صورة الفاتورة. يرجى المحاولة مرة أخرى.',
      };
    }

    // 5. DIRECT BLOB DOWNLOAD (Desktop & Mobile)
    // One Tap → Generate PNG → Direct Browser Download
    const tDownloadStart = performance.now();
    metrics.stage = 'download';
    stageStartedAt = tDownloadStart;
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = fileName;
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    link.rel = 'noopener';
    // Position invisibly in layout tree rather than display: none to guarantee click activation
    link.style.position = 'fixed';
    link.style.top = '-9999px';
    link.style.left = '-9999px';
    link.style.opacity = '0';
    document.body.appendChild(link);

    try {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      link.dispatchEvent(clickEvent);
    } catch {
      link.click();
    }
    downloadInitiationMs = performance.now() - tDownloadStart;
    metrics.tapToDownloadRequestMs = performance.now() - metrics.tapStartedAt;
    metrics.outcome = 'download-requested';

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
      metrics,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Invoice PNG export error:', err);
    return {
      success: false,
      metrics,
      error: `فشل تصدير الفاتورة كصورة: ${errorMsg}`,
    };
  } finally {
    // Restore original window.getComputedStyle cleanly
    window.getComputedStyle = origWindowGCS;
    imageListenerCleanup.forEach((removeListeners) => removeListeners());
    const endedAt = performance.now();
    // Preserve elapsed time for the stage that threw before its normal end marker.
    if (metrics.outcome === 'failure') {
      const elapsed = endedAt - stageStartedAt;
      if (metrics.stage === 'render') html2canvasMs = elapsed;
      if (metrics.stage === 'encode') blobConversionMs = elapsed;
      if (metrics.stage === 'download') downloadInitiationMs = elapsed;
    }
    Object.assign(metrics, {
      totalDurationMs: endedAt - t0,
      tapToExportEndMs: endedAt - metrics.tapStartedAt,
      fontReadinessMs, domPreparationMs, html2canvasMs, oncloneMs,
      blobConversionMs, downloadInitiationMs,
      tapToFeedbackCommitMs: interaction?.feedbackCommittedAt === undefined
        ? null : interaction.feedbackCommittedAt - metrics.tapStartedAt,
      tapToFeedbackPaintOpportunityMs: interaction?.feedbackPaintOpportunityAt === undefined
        ? null : interaction.feedbackPaintOpportunityAt - metrics.tapStartedAt,
    });
    console.info('[ExportInvoicePng Performance]', JSON.stringify(metrics));
  }
}
