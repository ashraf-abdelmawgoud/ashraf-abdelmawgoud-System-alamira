/**
 * High-Resolution Invoice PNG Export Utility
 * Uses html2canvas to capture the exact rendered invoice sheet at 2x retina scale.
 * Preserves Arabic RTL typography, navy-and-gold styling, and full document bounds.
 */

import html2canvas from 'html2canvas';

export interface PngExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
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

  try {
    // Ensure document fonts have completed loading before rasterization
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

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
  }
}
