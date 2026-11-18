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
          <title>طباعة فاتورة مبيعات - شركة الأميرة</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm 10mm 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .invoice-sheet {
              box-shadow: none !important;
              width: 100% !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
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

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        console.error('Iframe print error:', printErr);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);

    return true;
  } catch (err) {
    console.error('Invoice print exception:', err);
    window.print();
    return true;
  }
}
