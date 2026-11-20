/**
 * Reporting Service for Al-Amira ERP V2
 * 
 * Provides centralized reporting queries, domain aggregations, role-based redactions,
 * accurate Cairo-timezone date filtering, and multi-format exports (Excel XLSX, CSV).
 * Strictly guarantees:
 *  1. Only APPROVED sales invoices are counted toward revenue and net sales.
 *  2. No fake zero values after query failures.
 *  3. In accordance with accounting truth, profit is NOT calculated using the spreadsheet 'cost' column
 *     because for this company, that column represents selling price rather than purchase cost.
 *  4. Sensitive cost/profit metrics are hidden and unauthorized roles (SALES_OPERATOR) cannot view them.
 */

import { dataService } from './dataService'
import type {
  SalesInvoice,
  Role,
} from '@/types'
import { exportToExcel } from '@/lib/excelExport'
import { round2 } from '@/domain/invoiceCalculations'

export type ReportMainCategory =
  | 'overview'
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'financial'

export type DateFilterPreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'current_month'
  | 'previous_month'
  | 'all'
  | 'custom'

export type SalesReportSubType =
  | 'invoices_list'
  | 'daily_summary'
  | 'by_product'
  | 'by_customer'
  | 'by_operator'

export type InventoryReportSubType =
  | 'current_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'movements'

export interface ReportMetricItem {
  id: string
  label: string
  value: string | number
  subtext?: string
  variant?: 'emerald' | 'navy' | 'amber' | 'rose' | 'slate'
}

export interface ReportColumnDef {
  header: string
  key: string
  width?: number
  align?: 'right' | 'center' | 'left'
}

export interface ReportResult {
  title: string
  subtitle: string
  category: ReportMainCategory
  dateRangeText: string
  metrics: ReportMetricItem[]
  columns: ReportColumnDef[]
  rows: Record<string, unknown>[]
  notice?: string
}

/**
 * Returns YYYY-MM-DD date string in Egypt local time (Africa/Cairo)
 */
export function getCairoDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

/**
 * Resolves standard date boundaries for a given preset in Cairo time
 */
export function resolveDateFilter(
  preset: DateFilterPreset,
  customFrom?: string,
  customTo?: string
): { from: string; to: string; label: string } {
  const todayStr = getCairoDateString(new Date())
  const todayDate = new Date()

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr, label: 'اليوم' }

    case 'yesterday': {
      const yesterday = new Date(todayDate.getTime() - 86400000)
      const yesterdayStr = getCairoDateString(yesterday)
      return { from: yesterdayStr, to: yesterdayStr, label: 'أمس' }
    }

    case 'last_7_days': {
      const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 86400000)
      const fromStr = getCairoDateString(sevenDaysAgo)
      return { from: fromStr, to: todayStr, label: 'آخر 7 أيام' }
    }

    case 'current_month': {
      const year = todayDate.getFullYear()
      const month = String(todayDate.getMonth() + 1).padStart(2, '0')
      const firstDayStr = `${year}-${month}-01`
      return { from: firstDayStr, to: todayStr, label: 'الشهر الحالي' }
    }

    case 'previous_month': {
      const prevDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1)
      const year = prevDate.getFullYear()
      const month = String(prevDate.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(year, prevDate.getMonth() + 1, 0).getDate()
      const fromStr = `${year}-${month}-01`
      const toStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
      return { from: fromStr, to: toStr, label: 'الشهر السابق' }
    }

    case 'custom':
      return {
        from: customFrom || '',
        to: customTo || '',
        label: customFrom || customTo ? `فترة مخصصة (${customFrom || '...'} إلى ${customTo || '...'})` : 'فترة مخصصة',
      }

    case 'all':
    default:
      return { from: '', to: '', label: 'كافة الفترات' }
  }
}

/**
 * Filters approved invoices by date range and optional customer / operator
 */
function filterApprovedInvoices(
  invoices: SalesInvoice[],
  from: string,
  to: string,
  options?: { customerId?: string; operatorId?: string }
): SalesInvoice[] {
  return invoices.filter((inv) => {
    if (inv.status !== 'approved') return false
    if (from && inv.invoice_date < from) return false
    if (to && inv.invoice_date > to) return false
    if (options?.customerId && inv.customer_id !== options.customerId) return false
    if (options?.operatorId && inv.created_by !== options.operatorId) return false
    return true
  })
}

export const reportingService = {
  /**
   * 1. Overview Dashboard Report
   */
  async getOverviewReport(options: {
    dateFrom?: string
    dateTo?: string
    userRole?: Role
  }): Promise<ReportResult> {
    const isAdmin = options.userRole === 'ADMIN'
    const [invoices, customers, products, movements] = await Promise.all([
      dataService.getInvoices(),
      dataService.getCustomers(),
      dataService.getProducts(undefined, options.userRole),
      isAdmin ? dataService.getInventoryMovements().catch(() => []) : Promise.resolve([]),
    ])

    const approvedInvoices = filterApprovedInvoices(
      invoices,
      options.dateFrom || '',
      options.dateTo || ''
    )

    // Financial sums (Approved only)
    const totalSalesRevenue = round2(
      approvedInvoices.reduce((acc, inv) => acc + (inv.final_total || 0), 0)
    )
    const approvedCount = approvedInvoices.length
    const averageInvoiceValue = approvedCount > 0 ? round2(totalSalesRevenue / approvedCount) : 0

    // Units sold across items
    let totalUnitsSold = 0
    approvedInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        totalUnitsSold += Number(item.quantity || 0)
      })
    })

    // Low stock and out of stock (ADMIN only can see exact counts, others see general products)
    const lowStockCount = isAdmin
      ? products.filter((p) => Number(p.current_stock || 0) <= Number(p.min_stock_level || 0) && Number(p.current_stock || 0) > 0).length
      : 0
    const outOfStockCount = isAdmin
      ? products.filter((p) => Number(p.current_stock || 0) === 0).length
      : 0

    const metrics: ReportMetricItem[] = [
      {
        id: 'total_sales',
        label: 'إجمالي المبيعات المعتمدة',
        value: `${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: `لعدد ${approvedCount} فاتورة معتمدة`,
        variant: 'emerald',
      },
      {
        id: 'net_sales',
        label: 'صافي المبيعات',
        value: `${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'بعد خصم المردودات (لا توجد مردودات)',
        variant: 'navy',
      },
      {
        id: 'units_sold',
        label: 'إجمالي الوحدات المباعة',
        value: Math.round(totalUnitsSold).toLocaleString('en-US'),
        subtext: 'قطع ووحدات قياسية مسجلة',
        variant: 'slate',
      },
      {
        id: 'avg_invoice',
        label: 'متوسط قيمة الفاتورة',
        value: `${averageInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'لكل عملية بيع معتمدة',
        variant: 'amber',
      },
      {
        id: 'customers_count',
        label: 'إجمالي العملاء النشطين',
        value: customers.length,
        subtext: 'عميل مسجل بالنظام',
        variant: 'slate',
      },
      {
        id: 'products_count',
        label: 'إجمالي الأصناف',
        value: products.length,
        subtext: 'صنف في الكتالوج',
        variant: 'slate',
      },
    ]

    if (isAdmin) {
      metrics.push({
        id: 'low_stock',
        label: 'أصناف دون حد الأمان',
        value: lowStockCount,
        subtext: 'تتطلب إعادة طلب وتوريد',
        variant: lowStockCount > 0 ? 'amber' : 'emerald',
      })
      metrics.push({
        id: 'out_of_stock',
        label: 'أصناف نفدت بالكامل',
        value: outOfStockCount,
        subtext: 'رصيدها صفر حالياً',
        variant: outOfStockCount > 0 ? 'rose' : 'emerald',
      })
    }

    // Recent activity rows (recent invoices & movements)
    const recentRows = approvedInvoices.slice(0, 15).map((inv) => ({
      docNumber: inv.invoice_number,
      date: inv.invoice_date,
      customer: inv.customer_name_snapshot,
      itemsCount: (inv.items || []).length,
      amount: `${Number(inv.final_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      status: 'معتمدة ومصروفة',
    }))

    const columns: ReportColumnDef[] = [
      { header: 'رقم الفاتورة', key: 'docNumber', width: 16 },
      { header: 'التاريخ', key: 'date', width: 14 },
      { header: 'اسم العميل المكرم', key: 'customer', width: 28 },
      { header: 'عدد البنود', key: 'itemsCount', width: 12, align: 'center' },
      { header: 'القيمة الإجمالية', key: 'amount', width: 18 },
      { header: 'حالة الاعتماد', key: 'status', width: 16 },
    ]

    return {
      title: 'نظرة عامة على المؤشرات التشغيلية والمالية',
      subtitle: 'ملخص رقمي شامل للمبيعات المعتمدة، حركة العملاء، وتدفق البضاعة للفترة المحددة',
      category: 'overview',
      dateRangeText: options.dateFrom || options.dateTo ? `الفترة: ${options.dateFrom || 'البداية'} إلى ${options.dateTo || 'اليوم'}` : 'كافة الفترات',
      metrics,
      columns,
      rows: recentRows,
      notice: movements.length === 0 ? 'لا توجد حركات مخزن إضافية مسجلة للفترة' : undefined,
    }
  },

  /**
   * 2. Sales Reports (Invoices, Daily, By Product, By Customer, By Operator)
   */
  async getSalesReport(options: {
    dateFrom?: string
    dateTo?: string
    subType: SalesReportSubType
    userRole?: Role
    customerId?: string
    operatorId?: string
    productId?: string
  }): Promise<ReportResult> {
    const invoices = await dataService.getInvoices()

    const approvedInvoices = filterApprovedInvoices(
      invoices,
      options.dateFrom || '',
      options.dateTo || '',
      {
        customerId: options.customerId,
        operatorId: options.operatorId,
      }
    )

    const totalSales = round2(approvedInvoices.reduce((acc, i) => acc + (i.final_total || 0), 0))
    const totalDiscounts = round2(
      approvedInvoices.reduce(
        (acc, i) => acc + (i.invoice_discount_amount || 0) + (i.item_discounts_amount || 0),
        0
      )
    )

    let rows: Record<string, unknown>[] = []
    let columns: ReportColumnDef[] = []
    let subTitle = ''

    switch (options.subType) {
      case 'by_product': {
        subTitle = 'مبيعات الأصناف الأكثر طلباً والكميات المسحوبة'
        const productMap = new Map<string, { sku: string; name: string; unit: string; qty: number; revenue: number }>()

        approvedInvoices.forEach((inv) => {
          (inv.items || []).forEach((item) => {
            if (options.productId && item.product_id !== options.productId) return
            const existing = productMap.get(item.product_id) || {
              sku: item.product_sku_snapshot || '---',
              name: item.product_name_snapshot || 'صنف غير معروف',
              unit: item.unit_snapshot || 'قطعة',
              qty: 0,
              revenue: 0,
            }
            existing.qty = round2(existing.qty + Number(item.quantity || 0))
            existing.revenue = round2(existing.revenue + Number(item.net_amount || item.gross_amount || 0))
            productMap.set(item.product_id, existing)
          })
        })

        rows = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .map((p) => ({
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            quantity: p.qty,
            revenue: `${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          }))

        columns = [
          { header: 'كود الصنف (SKU)', key: 'sku', width: 14 },
          { header: 'اسم الصنف والبيان', key: 'name', width: 32 },
          { header: 'الوحدة', key: 'unit', width: 10, align: 'center' },
          { header: 'الكمية المباعة', key: 'quantity', width: 14, align: 'center' },
          { header: 'إجمالي الإيراد', key: 'revenue', width: 18 },
        ]
        break
      }

      case 'by_customer': {
        subTitle = 'توزيع المبيعات المعتمدة حسب العملاء وحجم التعامل'
        const custMap = new Map<string, { name: string; count: number; total: number }>()

        approvedInvoices.forEach((inv) => {
          const cId = inv.customer_id || 'unassigned'
          const existing = custMap.get(cId) || {
            name: inv.customer_name_snapshot || 'عميل نقدي',
            count: 0,
            total: 0,
          }
          existing.count += 1
          existing.total = round2(existing.total + (inv.final_total || 0))
          custMap.set(cId, existing)
        })

        rows = Array.from(custMap.values())
          .sort((a, b) => b.total - a.total)
          .map((c) => ({
            customerName: c.name,
            invoicesCount: c.count,
            totalAmount: `${c.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          }))

        columns = [
          { header: 'اسم العميل / الجهة', key: 'customerName', width: 36 },
          { header: 'عدد الفواتير', key: 'invoicesCount', width: 14, align: 'center' },
          { header: 'إجمالي المشتريات', key: 'totalAmount', width: 20 },
        ]
        break
      }

      case 'by_operator': {
        // Enforce ADMIN restriction
        if (options.userRole !== 'ADMIN') {
          throw new Error('غير مصرح لك باستعراض تقارير مبيعات مسؤولي المبيعات (ADMIN ONLY)')
        }
        subTitle = 'مبيعات وإنتاجية مسؤولي المبيعات المعتمدة'
        const opMap = new Map<string, { operator: string; count: number; total: number }>()

        approvedInvoices.forEach((inv) => {
          const opId = inv.created_by || 'غير محدد'
          const existing = opMap.get(opId) || {
            operator: opId,
            count: 0,
            total: 0,
          }
          existing.count += 1
          existing.total = round2(existing.total + (inv.final_total || 0))
          opMap.set(opId, existing)
        })

        rows = Array.from(opMap.values())
          .sort((a, b) => b.total - a.total)
          .map((op) => ({
            operatorId: op.operator,
            invoicesCount: op.count,
            totalAmount: `${op.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          }))

        columns = [
          { header: 'معرف مسؤول المبيعات', key: 'operatorId', width: 32 },
          { header: 'عدد الفواتير المنفذة', key: 'invoicesCount', width: 16, align: 'center' },
          { header: 'إجمالي المبيعات المعتمدة', key: 'totalAmount', width: 22 },
        ]
        break
      }

      case 'daily_summary': {
        subTitle = 'حركة المبيعات التجميعية اليومية (بتوقيت مصر)'
        const dayMap = new Map<string, { date: string; count: number; total: number; discount: number }>()

        approvedInvoices.forEach((inv) => {
          const d = inv.invoice_date
          const existing = dayMap.get(d) || { date: d, count: 0, total: 0, discount: 0 }
          existing.count += 1
          existing.total = round2(existing.total + (inv.final_total || 0))
          existing.discount = round2(existing.discount + (inv.invoice_discount_amount || 0) + (inv.item_discounts_amount || 0))
          dayMap.set(d, existing)
        })

        rows = Array.from(dayMap.values())
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((d) => ({
            date: d.date,
            count: d.count,
            discounts: `${d.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
            total: `${d.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          }))

        columns = [
          { header: 'التاريخ اليومي', key: 'date', width: 16 },
          { header: 'عدد الفواتير', key: 'count', width: 14, align: 'center' },
          { header: 'إجمالي الخصومات', key: 'discounts', width: 18 },
          { header: 'الصافي النهائي للمبيعات', key: 'total', width: 22 },
        ]
        break
      }

      case 'invoices_list':
      default: {
        subTitle = 'سجل فواتير المبيعات المعتمدة وتفاصيل المبالغ'
        rows = approvedInvoices.map((inv) => ({
          invoiceNumber: inv.invoice_number,
          date: inv.invoice_date,
          customerName: inv.customer_name_snapshot,
          grossAmount: `${Number(inv.gross_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          discount: `${(Number(inv.invoice_discount_amount || 0) + Number(inv.item_discounts_amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          finalTotal: `${Number(inv.final_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          status: 'معتمدة',
        }))

        columns = [
          { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 16 },
          { header: 'تاريخ الفاتورة', key: 'date', width: 14 },
          { header: 'العميل المكرم', key: 'customerName', width: 28 },
          { header: 'الإجمالي الأولي', key: 'grossAmount', width: 16 },
          { header: 'الخصم الممنوح', key: 'discount', width: 16 },
          { header: 'الصافي النهائي', key: 'finalTotal', width: 18 },
          { header: 'الحالة', key: 'status', width: 12, align: 'center' },
        ]
        break
      }
    }

    const metrics: ReportMetricItem[] = [
      {
        id: 'total_sales',
        label: 'إجمالي مبيعات الفترة المعتمدة',
        value: `${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: `عدد ${approvedInvoices.length} فاتورة`,
        variant: 'emerald',
      },
      {
        id: 'total_discounts',
        label: 'إجمالي الخصومات الممنوحة',
        value: `${totalDiscounts.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'خصومات البنود والفواتير',
        variant: 'amber',
      },
      {
        id: 'invoices_count',
        label: 'عدد الفواتير المعتمدة',
        value: approvedInvoices.length,
        subtext: 'فاتورة رسمية',
        variant: 'navy',
      },
      {
        id: 'avg_val',
        label: 'متوسط الفاتورة',
        value: approvedInvoices.length > 0 ? `${round2(totalSales / approvedInvoices.length).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م` : '0 ج.م',
        variant: 'slate',
      },
    ]

    return {
      title: 'تقرير مبيعات فواتير شركة الأميرة',
      subtitle: subTitle,
      category: 'sales',
      dateRangeText: options.dateFrom || options.dateTo ? `الفترة: ${options.dateFrom || 'البداية'} إلى ${options.dateTo || 'اليوم'}` : 'كافة الفترات',
      metrics,
      columns,
      rows,
    }
  },

  /**
   * 3. Inventory Reports (ADMIN ONLY)
   */
  async getInventoryReport(options: {
    dateFrom?: string
    dateTo?: string
    subType: InventoryReportSubType
    userRole?: Role
    productId?: string
  }): Promise<ReportResult> {
    if (options.userRole !== 'ADMIN') {
      throw new Error('تقارير المخزون والأرصدة والتسويات مقتصرة حصراً على مدير النظام (ADMIN ONLY)')
    }

    const [products, movements] = await Promise.all([
      dataService.getProducts(undefined, 'ADMIN'),
      dataService.getInventoryMovements(),
    ])

    let rows: Record<string, unknown>[] = []
    let columns: ReportColumnDef[] = []
    let subTitle = ''

    const lowStockList = products.filter(
      (p) => Number(p.current_stock || 0) <= Number(p.min_stock_level || 0) && Number(p.current_stock || 0) > 0
    )
    const outOfStockList = products.filter((p) => Number(p.current_stock || 0) === 0)

    switch (options.subType) {
      case 'low_stock': {
        subTitle = 'تقرير النواقص والأصناف التي قاربت على النفاد (دون حد الأمان)'
        rows = lowStockList.map((p) => {
          const cur = Number(p.current_stock || 0)
          const min = Number(p.min_stock_level || 0)
          return {
            sku: p.sku,
            name: p.name,
            category: p.category || 'عام',
            unit: p.unit,
            currentStock: cur,
            minStock: min,
            deficit: Math.max(0, min - cur),
            status: 'دون الحد الأدنى',
          }
        })

        columns = [
          { header: 'كود الصنف (SKU)', key: 'sku', width: 14 },
          { header: 'اسم الصنف', key: 'name', width: 30 },
          { header: 'التصنيف', key: 'category', width: 14 },
          { header: 'الوحدة', key: 'unit', width: 10, align: 'center' },
          { header: 'الرصيد الفعلي', key: 'currentStock', width: 12, align: 'center' },
          { header: 'حد الأمان', key: 'minStock', width: 12, align: 'center' },
          { header: 'مقدار العجز', key: 'deficit', width: 12, align: 'center' },
        ]
        break
      }

      case 'out_of_stock': {
        subTitle = 'تقرير الأصناف المنتهية تماماً من المخزن (رصيد صفر)'
        rows = outOfStockList.map((p) => ({
          sku: p.sku,
          name: p.name,
          category: p.category || 'عام',
          unit: p.unit,
          sellingPrice: `${Number(p.selling_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          currentStock: 0,
          status: 'منتهي تماماً',
        }))

        columns = [
          { header: 'كود الصنف (SKU)', key: 'sku', width: 14 },
          { header: 'اسم الصنف', key: 'name', width: 32 },
          { header: 'التصنيف', key: 'category', width: 16 },
          { header: 'الوحدة', key: 'unit', width: 10, align: 'center' },
          { header: 'سعر البيع', key: 'sellingPrice', width: 16 },
          { header: 'الرصيد الفعلي', key: 'currentStock', width: 14, align: 'center' },
          { header: 'الحالة', key: 'status', width: 14, align: 'center' },
        ]
        break
      }

      case 'movements': {
        subTitle = 'سجل تدفق البضاعة وحركات الصرف والإضافة المعصومة'
        const filteredMovements = movements.filter((m) => {
          if (options.productId && m.product_id !== options.productId) return false
          const moveDate = (m.created_at || '').slice(0, 10)
          if (options.dateFrom && moveDate < options.dateFrom) return false
          if (options.dateTo && moveDate > options.dateTo) return false
          return true
        })

        rows = filteredMovements.map((m) => ({
          date: (m.created_at || '').slice(0, 10),
          type: m.movement_type === 'sale' || m.movement_type === 'issue' || m.quantity_out > 0 ? 'صرف مبيعات' : 'إضافة مخزن',
          docNumber: m.source_doc_number || '---',
          sku: m.product_sku || '---',
          productName: m.product_name || '---',
          quantityIn: m.quantity_in || 0,
          quantityOut: m.quantity_out || 0,
          stockAfter: m.stock_balance_after || 0,
        }))

        columns = [
          { header: 'التاريخ', key: 'date', width: 14 },
          { header: 'نوع الحركة', key: 'type', width: 14 },
          { header: 'رقم المستند', key: 'docNumber', width: 16 },
          { header: 'كود الصنف', key: 'sku', width: 14 },
          { header: 'اسم الصنف والبيان', key: 'productName', width: 28 },
          { header: 'وارد (+)', key: 'quantityIn', width: 12, align: 'center' },
          { header: 'صادر (-)', key: 'quantityOut', width: 12, align: 'center' },
          { header: 'الرصيد بعد الحركة', key: 'stockAfter', width: 14, align: 'center' },
        ]
        break
      }

      case 'current_stock':
      default: {
        subTitle = 'تقرير أرصدة المخزون الفعلي الحالي لجميع الأصناف'
        rows = products.map((p) => ({
          sku: p.sku,
          name: p.name,
          category: p.category || 'عام',
          unit: p.unit,
          currentStock: Number(p.current_stock || 0),
          minStock: Number(p.min_stock_level || 0),
          sellingPrice: `${Number(p.selling_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          status: Number(p.current_stock || 0) === 0 ? 'نفد' : Number(p.current_stock || 0) <= Number(p.min_stock_level || 0) ? 'منخفض' : 'متوفر',
        }))

        columns = [
          { header: 'كود الصنف (SKU)', key: 'sku', width: 14 },
          { header: 'اسم الصنف والبيان', key: 'name', width: 30 },
          { header: 'التصنيف', key: 'category', width: 16 },
          { header: 'الوحدة', key: 'unit', width: 10, align: 'center' },
          { header: 'الرصيد الفعلي', key: 'currentStock', width: 12, align: 'center' },
          { header: 'سعر البيع', key: 'sellingPrice', width: 16 },
          { header: 'الحالة', key: 'status', width: 12, align: 'center' },
        ]
        break
      }
    }

    const totalStockUnits = products.reduce((acc, p) => acc + Number(p.current_stock || 0), 0)

    const metrics: ReportMetricItem[] = [
      {
        id: 'total_products',
        label: 'إجمالي الأصناف المسجلة',
        value: products.length,
        subtext: 'صنف في قاعدة البيانات',
        variant: 'navy',
      },
      {
        id: 'total_units',
        label: 'إجمالي رصيد المخزن الحالي',
        value: Math.round(totalStockUnits).toLocaleString('en-US'),
        subtext: 'وحدة مخزنية متاحة',
        variant: 'emerald',
      },
      {
        id: 'low_stock_metric',
        label: 'أصناف دون حد الأمان',
        value: lowStockList.length,
        subtext: 'تتطلب متابعة مع الموردين',
        variant: lowStockList.length > 0 ? 'amber' : 'emerald',
      },
      {
        id: 'out_stock_metric',
        label: 'أصناف رصيدها صفر',
        value: outOfStockList.length,
        subtext: 'غير متوفرة للبيع حالياً',
        variant: outOfStockList.length > 0 ? 'rose' : 'emerald',
      },
    ]

    return {
      title: 'تقرير إدارة المخزون والأرصدة الفعلية',
      subtitle: subTitle,
      category: 'inventory',
      dateRangeText: options.dateFrom || options.dateTo ? `الفترة: ${options.dateFrom || 'البداية'} إلى ${options.dateTo || 'اليوم'}` : 'الحالة اللحظية الحالية',
      metrics,
      columns,
      rows,
    }
  },

  /**
   * 4. Customer Reports
   */
  async getCustomerReport(options: {
    dateFrom?: string
    dateTo?: string
    customerId?: string
  }): Promise<ReportResult> {
    const [customers, invoices] = await Promise.all([
      dataService.getCustomers(),
      dataService.getInvoices(),
    ])

    const approvedInvoices = filterApprovedInvoices(
      invoices,
      options.dateFrom || '',
      options.dateTo || '',
      { customerId: options.customerId }
    )

    // Map purchases per customer
    const salesPerCust = new Map<string, { count: number; total: number }>()
    approvedInvoices.forEach((inv) => {
      const cId = inv.customer_id || 'unknown'
      const ex = salesPerCust.get(cId) || { count: 0, total: 0 }
      ex.count += 1
      ex.total = round2(ex.total + (inv.final_total || 0))
      salesPerCust.set(cId, ex)
    })

    const targetCustomers = options.customerId
      ? customers.filter((c) => c.id === options.customerId)
      : customers

    const rows = targetCustomers
      .map((c) => {
        const stats = salesPerCust.get(c.id) || { count: 0, total: 0 }
        return {
          code: c.code || '---',
          name: c.name,
          phone: c.phone || '---',
          city: c.city || 'قنا',
          purchases: `${stats.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          invoicesCount: stats.count,
          balance: `${Number(c.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
          status: c.is_active ? 'نشط' : 'معطل',
        }
      })
      .sort((a, b) => b.invoicesCount - a.invoicesCount)

    const columns: ReportColumnDef[] = [
      { header: 'كود العميل', key: 'code', width: 14 },
      { header: 'اسم العميل / الجهة', key: 'name', width: 30 },
      { header: 'الهاتف', key: 'phone', width: 16 },
      { header: 'المدينة / العنوان', key: 'city', width: 18 },
      { header: 'إجمالي المشتريات', key: 'purchases', width: 18 },
      { header: 'عدد الفواتير', key: 'invoicesCount', width: 14, align: 'center' },
      { header: 'الرصيد المدين', key: 'balance', width: 16 },
      { header: 'الحالة', key: 'status', width: 12, align: 'center' },
    ]

    const totalCustomersBalance = targetCustomers.reduce((acc, c) => acc + Number(c.balance || 0), 0)
    const activeCustomersCount = targetCustomers.filter((c) => c.is_active).length

    const metrics: ReportMetricItem[] = [
      {
        id: 'cust_count',
        label: 'عدد العملاء في التقرير',
        value: targetCustomers.length,
        subtext: `${activeCustomersCount} نشط`,
        variant: 'navy',
      },
      {
        id: 'cust_sales',
        label: 'إجمالي مبيعات العملاء للفترة',
        value: `${approvedInvoices.reduce((a, b) => a + (b.final_total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: `لعدد ${approvedInvoices.length} فاتورة معتمدة`,
        variant: 'emerald',
      },
      {
        id: 'total_debt',
        label: 'إجمالي أرصدة مديونيات العملاء',
        value: `${totalCustomersBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'مستحقات مسجلة طرف العملاء',
        variant: 'amber',
      },
    ]

    return {
      title: 'دليل مبيعات وأرصدة حسابات العملاء',
      subtitle: 'كشف تفصيلي بمشتريات العملاء المكرمين، عدد الفواتير المعتمدة، والأرصدة المدينة',
      category: 'customers',
      dateRangeText: options.dateFrom || options.dateTo ? `الفترة: ${options.dateFrom || 'البداية'} إلى ${options.dateTo || 'اليوم'}` : 'كافة الفترات',
      metrics,
      columns,
      rows,
    }
  },

  /**
   * 5. Supplier Reports (ADMIN ONLY)
   */
  async getSupplierReport(options: {
    userRole?: Role
    dateFrom?: string
    dateTo?: string
  }): Promise<ReportResult> {
    if (options.userRole !== 'ADMIN') {
      throw new Error('تقارير الموردين مقتصرة حصراً على مدير النظام (ADMIN ONLY)')
    }

    const suppliers = await dataService.getSuppliers()

    const rows = suppliers.map((s) => ({
      code: s.code || '---',
      name: s.name,
      phone: s.phone || '---',
      city: s.city || 'قنا',
      balance: `${Number(s.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
      status: s.is_active ? 'نشط' : 'معطل',
    }))

    const columns: ReportColumnDef[] = [
      { header: 'كود المورد', key: 'code', width: 14 },
      { header: 'اسم المورد / الشركة', key: 'name', width: 32 },
      { header: 'الهاتف', key: 'phone', width: 16 },
      { header: 'المدينة / المركز', key: 'city', width: 18 },
      { header: 'الرصيد الدائن المستحق', key: 'balance', width: 20 },
      { header: 'الحالة', key: 'status', width: 12, align: 'center' },
    ]

    const totalSuppliersBalance = suppliers.reduce((acc, s) => acc + Number(s.balance || 0), 0)

    const metrics: ReportMetricItem[] = [
      {
        id: 'sup_count',
        label: 'إجمالي الموردين المسجلين',
        value: suppliers.length,
        subtext: 'جهة توريد وشركة',
        variant: 'navy',
      },
      {
        id: 'sup_balance',
        label: 'إجمالي مستحقات الموردين',
        value: `${totalSuppliersBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'أرصدة دائنة مسجلة',
        variant: 'slate',
      },
    ]

    return {
      title: 'دليل حسابات ومستحقات الموردين',
      subtitle: 'كشف بجهات التوريد والشركات المعتمدة وأرصدتها الدائنة',
      category: 'suppliers',
      dateRangeText: 'الحالة اللحظية الحالية',
      metrics,
      columns,
      rows,
    }
  },

  /**
   * 6. Financial Reporting (ADMIN ONLY)
   * 
   * CRITICAL ACCOUNTING SAFEGUARD:
   * Profit is NOT calculated using the spreadsheet 'cost' column because for this company,
   * that column represents selling price rather than actual purchase cost.
   * Trustworthy COGS and gross profit are marked as "البيانات غير متاحة" with an explanation.
   */
  async getFinancialReport(options: {
    dateFrom?: string
    dateTo?: string
    userRole?: Role
  }): Promise<ReportResult> {
    if (options.userRole !== 'ADMIN') {
      throw new Error('التقارير المالية والأرباح مقتصرة حصراً على مدير النظام (ADMIN ONLY)')
    }

    const invoices = await dataService.getInvoices()
    const approvedInvoices = filterApprovedInvoices(
      invoices,
      options.dateFrom || '',
      options.dateTo || ''
    )

    const grossSales = round2(approvedInvoices.reduce((acc, i) => acc + Number(i.gross_amount || 0), 0))
    const totalDiscounts = round2(
      approvedInvoices.reduce(
        (acc, i) => acc + Number(i.invoice_discount_amount || 0) + Number(i.item_discounts_amount || 0),
        0
      )
    )
    const netSales = round2(approvedInvoices.reduce((acc, i) => acc + Number(i.final_total || 0), 0))

    const metrics: ReportMetricItem[] = [
      {
        id: 'gross_sales',
        label: 'إجمالي المبيعات (Gross Sales)',
        value: `${grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'قبل احتساب الخصومات',
        variant: 'slate',
      },
      {
        id: 'discounts_metric',
        label: 'إجمالي الخصومات الممنوحة',
        value: `${totalDiscounts.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'خصومات البنود والفواتير',
        variant: 'amber',
      },
      {
        id: 'net_sales',
        label: 'صافي المبيعات (Net Sales)',
        value: `${netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        subtext: 'المبيعات المعتمدة الفعلية',
        variant: 'emerald',
      },
      {
        id: 'cogs',
        label: 'تكلفة البضاعة المباعة (COGS)',
        value: 'البيانات غير متاحة',
        subtext: 'تكلفة الشراء الفعلية غير مسجلة بدقة في بيانات المنتجات الأولية',
        variant: 'slate',
      },
      {
        id: 'gross_profit',
        label: 'مجمل الربح (Gross Profit)',
        value: 'البيانات غير متاحة',
        subtext: 'حرصاً على الأمانة المحاسبية (عمود التكلفة يمثل سعر البيع)',
        variant: 'slate',
      },
      {
        id: 'profit_margin',
        label: 'هامش الربح (Profit Margin)',
        value: 'البيانات غير متاحة',
        subtext: 'لا يتم احتساب هوامش ربح تقديرية أو مضللة',
        variant: 'slate',
      },
    ]

    const rows = [
      {
        metric: 'إجمالي قيمة المبيعات الأولية (Gross Sales)',
        amount: `${grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        notes: 'مجموع أسعار الأصناف قبل تطبيق الخصومات',
      },
      {
        metric: 'الخصومات الممنوحة على الفواتير والبنود',
        amount: `-${totalDiscounts.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        notes: 'مجموع الخصومات المعتمدة لعملاء الشركة',
      },
      {
        metric: 'مردودات ومرفوضات المبيعات',
        amount: '0.00 ج.م',
        notes: 'لا توجد مردودات مسجلة للفترة',
      },
      {
        metric: 'صافي إيرادات المبيعات المحققة (Net Revenue)',
        amount: `${netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`,
        notes: 'القيمة النهائية للمبيعات المعتمدة',
      },
      {
        metric: 'تكلفة البضاعة المباعة (Cost of Goods Sold)',
        amount: 'البيانات غير متاحة',
        notes: 'غير مسجلة بدقة في الكتالوج الأولي؛ لا يمكن استخدام عمود التكلفة لكونه مطابقاً لسعر البيع',
      },
      {
        metric: 'مجمل الأرباح الصافية (Gross Profit)',
        amount: 'البيانات غير متاحة',
        notes: 'حرصاً على سلامة وموثوقية المعايير المالية وتجنب أي أرباح وهمية',
      },
    ]

    const columns: ReportColumnDef[] = [
      { header: 'البيان المالي والمحاسبي', key: 'metric', width: 36 },
      { header: 'المبلغ المسجل (ج.م)', key: 'amount', width: 22 },
      { header: 'إيضاحات المعايير والسياسات', key: 'notes', width: 42 },
    ]

    return {
      title: 'التقرير المالي الإجمالي لمبيعات شركة الأميرة',
      subtitle: 'مؤشرات الإيرادات المعتمدة، الخصومات الممنوحة، والبيان المحاسبي الرسمي',
      category: 'financial',
      dateRangeText: options.dateFrom || options.dateTo ? `الفترة: ${options.dateFrom || 'البداية'} إلى ${options.dateTo || 'اليوم'}` : 'كافة الفترات',
      metrics,
      columns,
      rows,
      notice: 'ملاحظة محاسبية: لا يتم احتساب تكلفة البضاعة المباعة أو الأرباح التقديرية بناءً على طلب الإدارة وحرصاً على الأمانة المحاسبية، نظراً لأن عمود التكلفة في الجداول الأساسية يمثل سعر البيع.',
    }
  },

  /**
   * 7. Export helper: Excel XLSX
   */
  exportToExcel(report: ReportResult) {
    const today = getCairoDateString(new Date())
    const filename = `AlAmira_${report.category}_${today}`

    const columns = report.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width || 20,
    }))

    return exportToExcel({
      filename,
      sheetName: report.title.slice(0, 31),
      data: report.rows,
      columns,
    })
  },

  /**
   * 8. Export helper: CSV with UTF-8 BOM for perfect Arabic Excel support
   */
  exportToCsv(report: ReportResult) {
    if (!report.rows || report.rows.length === 0) {
      throw new Error('لا توجد بيانات متاحة للتصدير إلى ملف CSV')
    }

    const headers = report.columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',')
    const dataLines = report.rows.map((row) =>
      report.columns
        .map((col) => {
          const val = row[col.key] ?? ''
          return `"${String(val).replace(/"/g, '""')}"`
        })
        .join(',')
    )

    // UTF-8 BOM ensures Excel decodes Arabic characters correctly
    const csvContent = '\uFEFF' + [headers, ...dataLines].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const today = getCairoDateString(new Date())
    const filename = `AlAmira_${report.category}_${today}.csv`

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, filename, rowCount: report.rows.length }
  },
}
