import type { SalesInvoice, Customer } from '../../../types';
import { round2 } from '../../../domain/invoiceCalculations';
import { tafqeetArabic } from '@/utils/tafqeet';

export interface InvoicePrintItemModel {
  index: number;
  sku: string;
  name: string;
  unit: string;
  quantityFormatted: string;
  quantityNumber: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
}

export interface InvoicePrintBranchInfo {
  name: string;
  address: string;
  phones: string[];
}

export interface InvoicePrintCompanyModel {
  name: string;
  subtitle: string;
  address: string;
  logoUrl: string;
  branches: {
    qena: InvoicePrintBranchInfo;
    hurghada: InvoicePrintBranchInfo;
  };
}

export interface InvoicePrintModel {
  company: InvoicePrintCompanyModel;
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    paymentTermLabel: string;
    status: SalesInvoice['status'];
    statusLabel: string;
    documentTypeLabel: string;
    creatorLabel: string;
    notes: string | null;
  };
  customer: {
    name: string;
    phone: string | null;
    address: string | null;
  };
  items: InvoicePrintItemModel[];
  hasItemDiscounts: boolean;
  totals: {
    grossAmount: number;
    itemDiscountsAmount: number;
    subtotal: number;
    invoiceDiscountAmount: number;
    additionalCharges: number;
    finalTotal: number;
    tafqeetText: string;
  };
}

export const OFFICIAL_COMPANY_INFO: InvoicePrintCompanyModel = {
  name: 'الأميرة للتوريدات والتجارة العامة',
  subtitle: 'توريدات عمومية وتجارة - استيراد وتصدير وتوكيلات',
  address: 'قنا',
  logoUrl: '/logo.png',
  branches: {
    qena: {
      name: 'فرع قنا',
      address: 'قنا',
      phones: ['01008949310', '01001239995'],
    },
    hurghada: {
      name: 'فرع الغردقة',
      address: 'الغردقة - شيراتون',
      phones: ['01001239995', '01020680007'],
    },
  },
};

export function mapInvoiceToPrintModel(
  invoice: SalesInvoice,
  customer?: Customer | null
): InvoicePrintModel {
  const items: InvoicePrintItemModel[] = (invoice.items || []).map((it, idx) => ({
    index: idx + 1,
    sku: it.product_sku_snapshot || '--',
    name: it.product_name_snapshot || 'صنف غير محدد',
    unit: it.unit_snapshot || 'قطعة',
    quantityFormatted: formatQuantity(it.quantity),
    quantityNumber: it.quantity,
    unitPrice: round2(it.unit_price),
    grossAmount: round2(it.gross_amount),
    discountAmount: round2(it.discount_amount),
    netAmount: round2(it.net_amount),
  }));

  const hasItemDiscounts = items.some((it) => it.discountAmount > 0);

  const statusLabel =
    invoice.status === 'approved'
      ? 'معتمدة وخصمت من المخزون'
      : invoice.status === 'cancelled'
        ? 'ملغاة وتم استرجاع المخزون'
        : 'مسودة فاتورة';

  const paymentTermLabel = invoice.payment_terms === 'credit' ? 'آجل' : 'نقداً';

  const customerName =
    customer?.name || invoice.customer_name_snapshot || 'عميل نقدي';
  const customerPhone = customer?.phone || null;
  const customerAddress = customer?.address || null;

  const grossAmount = round2(invoice.gross_amount);
  const itemDiscountsAmount = round2(invoice.item_discounts_amount);
  const subtotal = round2(invoice.subtotal);
  const invoiceDiscountAmount = round2(invoice.invoice_discount_amount);
  const additionalCharges = round2(invoice.additional_charges);
  const finalTotal = round2(invoice.final_total);

  const tafqeetText = tafqeetArabic(finalTotal);

  return {
    company: OFFICIAL_COMPANY_INFO,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      paymentTermLabel,
      status: invoice.status,
      statusLabel,
      documentTypeLabel: 'بيان الأسعار',
      creatorLabel: 'المسؤول التجاري المختص',
      notes: invoice.notes && invoice.notes.trim() ? invoice.notes.trim() : null,
    },
    customer: {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
    },
    items,
    hasItemDiscounts,
    totals: {
      grossAmount,
      itemDiscountsAmount,
      subtotal,
      invoiceDiscountAmount,
      additionalCharges,
      finalTotal,
      tafqeetText,
    },
  };
}

function formatQuantity(qty: number): string {
  const rounded = round2(qty);
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toString();
}
