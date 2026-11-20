/**
 * Print Invoice Utility (Desktop & Mobile Compatible)
 * 
 * - Mobile Phones / PWAs / Tablets:
 *   Android Chrome and mobile WebViews do NOT support iframe.contentWindow.print().
 *   On mobile, we either open a dedicated clean print window synchronously on user gesture
 *   with an accessible "طباعة / حفظ بتنسيق PDF" action bar, or trigger window.print() directly
 *   on the top-level window where the Android Print Spooler / AirPrint dialog is fully supported.
 * 
 * - Desktop Browsers:
 *   Desktop Chrome, Edge, Safari, and Firefox support isolated iframe printing seamlessly
 *   without displacing screen UI or opening unnecessary tabs.
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
  );
}

export interface PrintInvoiceOptions {
  invoiceNumber?: string;
  forceInPagePrint?: boolean;
}

export function printInvoice(
  element: HTMLElement | null,
  options?: PrintInvoiceOptions
): boolean {
  if (!element) {
    console.error('Invoice print failed: target element not found');
    return false;
  }

  const isMobile = isMobileDevice();

  // Collect all head stylesheets and style tags for standalone document rendering
  const styles = typeof document !== 'undefined'
    ? Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n')
    : '';

  const buildPrintDocumentHtml = (title: string, showToolbar: boolean) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          * {
            letter-spacing: normal !important;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Cairo', 'Segoe UI', Tahoma, system-ui, -apple-system, sans-serif !important;
            direction: rtl !important;
            text-align: right !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-sheet {
            box-shadow: none !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 auto !important;
            letter-spacing: normal !important;
          }
          tr, .print-card-box, .print-doc-badge, .print-bottom-container, .print-footer-container, .print-sign-box, .print-approval-statement-box {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
          .mobile-print-header {
            position: sticky;
            top: 0;
            z-index: 9999;
            background: #11243A;
            color: #ffffff;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25);
            font-family: 'Cairo', sans-serif;
          }
          .mobile-print-btn {
            background: #c59b27;
            color: #11243A;
            font-weight: 800;
            padding: 9px 18px;
            border-radius: 8px;
            border: none;
            font-size: 13.5px;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          .mobile-close-btn {
            background: rgba(255,255,255,0.12);
            color: #ffffff;
            font-weight: 600;
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.25);
            font-size: 12px;
            cursor: pointer;
          }
        </style>
        ${styles}
      </head>
      <body dir="rtl">
        ${
          showToolbar
            ? `
          <div class="mobile-print-header no-print">
            <button class="mobile-print-btn" onclick="window.print()">
              🖨️ طباعة / حفظ بتنسيق PDF
            </button>
            <button class="mobile-close-btn" onclick="window.close()">
              إغلاق النافذة
            </button>
          </div>
          <div style="padding: 10px 0;">
            ${element.outerHTML}
          </div>
        `
            : element.outerHTML
        }
      </body>
    </html>
  `;

  const docTitle = `فاتورة مبيعات - شركة الأميرة للتوريدات والتجارة العامة (${options?.invoiceNumber || ''})`;

  // ==========================================
  // MOBILE WORKFLOW (Android / iOS / Tablets / PWAs)
  // ==========================================
  if (isMobile && !options?.forceInPagePrint) {
    try {
      // Must be called synchronously to avoid popup blockers
      const printWindow = window.open('', '_blank');

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(buildPrintDocumentHtml(docTitle, true));
        printWindow.document.close();

        const triggerMobilePrint = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (e) {
            console.warn('Auto print invocation in new window failed, toolbar button available:', e);
          }
        };

        if (printWindow.document.fonts && printWindow.document.fonts.ready) {
          printWindow.document.fonts.ready
            .then(() => setTimeout(triggerMobilePrint, 250))
            .catch(() => setTimeout(triggerMobilePrint, 400));
        } else {
          setTimeout(triggerMobilePrint, 400);
        }

        return true;
      }
    } catch (popupErr) {
      console.warn('Could not open mobile print window, falling back to in-page print:', popupErr);
    }

    // Fallback: If popup is blocked or in standalone PWA, print directly from the current window
    try {
      window.print();
      return true;
    } catch (inPageErr) {
      console.error('In-page window.print failed on mobile:', inPageErr);
      return false;
    }
  }

  // ==========================================
  // DESKTOP WORKFLOW (Isolated Iframe Execution)
  // ==========================================
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      // Direct window fallback
      window.print();
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      return true;
    }

    frameDoc.open();
    frameDoc.write(buildPrintDocumentHtml(docTitle, false));
    frameDoc.close();

    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };

    const triggerDesktopPrint = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.addEventListener('afterprint', cleanup);
        }
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        console.error('Iframe print error on desktop:', printErr);
        window.print();
        cleanup();
      } finally {
        setTimeout(cleanup, 120000);
      }
    };

    if (frameDoc.fonts && frameDoc.fonts.ready) {
      frameDoc.fonts.ready
        .then(() => setTimeout(triggerDesktopPrint, 150))
        .catch(() => setTimeout(triggerDesktopPrint, 350));
    } else {
      setTimeout(triggerDesktopPrint, 350);
    }

    return true;
  } catch (err) {
    console.error('Desktop print exception, executing window.print fallback:', err);
    try {
      window.print();
      return true;
    } catch (finalErr) {
      console.error('All print options failed:', finalErr);
      return false;
    }
  }
}
