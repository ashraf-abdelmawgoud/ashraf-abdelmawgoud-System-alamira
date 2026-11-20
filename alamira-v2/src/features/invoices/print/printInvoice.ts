/**
 * Print Invoice Utility
 * Handles browser print execution using an isolated iframe to guarantee crisp A4 page rendering
 * without displacing screen UI or depending on transient modal state.
 */

export function printInvoice(element: HTMLElement | null): boolean {
  if (!element) {
    console.error('Invoice print failed: target element not found');
    return false;
  }

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
      // Fallback to window.print if iframe document is unavailable
      window.print();
      document.body.removeChild(iframe);
      return true;
    }

    // Collect all head stylesheets and style tags
    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((el) => el.outerHTML)
      .join('\n');

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>طباعة بيان أسعار - شركة الأميرة للتوريدات والتجارة العامة</title>
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
              margin: 0 !important;
              letter-spacing: normal !important;
            }
            tr, .print-card-box, .print-doc-badge, .print-bottom-container, .print-footer-container, .print-sign-box, .print-approval-statement-box {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            thead {
              display: table-header-group !important;
            }
          </style>
          ${styles}
        </head>
        <body dir="rtl">
          ${element.outerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };

    const triggerPrint = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.addEventListener('afterprint', cleanup);
        }
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        console.error('Iframe print error:', printErr);
        window.print();
        cleanup();
      } finally {
        // Safe fallback cleanup if afterprint does not fire within 2 minutes
        setTimeout(cleanup, 120000);
      }
    };

    if (frameDoc.fonts && frameDoc.fonts.ready) {
      frameDoc.fonts.ready
        .then(() => {
          setTimeout(triggerPrint, 150);
        })
        .catch(() => {
          setTimeout(triggerPrint, 350);
        });
    } else {
      setTimeout(triggerPrint, 400);
    }

    return true;
  } catch (err) {
    console.error('Invoice print exception:', err);
    window.print();
    return true;
  }
}
