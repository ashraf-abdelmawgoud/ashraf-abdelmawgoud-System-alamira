import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { DashboardMetrics } from './DashboardMetrics'
import { SalesTrendChart } from './SalesTrendChart'
import { RecentInvoicesCard } from './RecentInvoicesCard'
import { RecentMovementsCard } from './RecentMovementsCard'
import { LowStockAlertsCard } from './LowStockAlertsCard'
import { OperatorTodaySalesCard } from './OperatorTodaySalesCard'
import { dataService } from '@/services/dataService'
import { DashboardSummary, Product, SalesInvoice, Invoice } from '@/types'
import { LoadingState } from '@/components/ui'
import { useAuth } from '@/auth'
import { isInvoiceOwner } from '@/auth/rbac'

export const DashboardView: React.FC = () => {
  const { currentUser } = useAuth()
  const isSalesOperator = currentUser.role === 'SALES_OPERATOR'

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true)
    else setLoading(true)

    try {
      const [sum, prods, invs] = await Promise.all([
        dataService.getDashboardSummary(),
        dataService.getProducts(undefined, currentUser.role),
        dataService.getInvoices(),
      ])
      setSummary(sum)
      setProducts(prods)
      setInvoices(invs)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [currentUser.role])

  useEffect(() => {
    loadData()
  }, [loadData])

  // For SALES_OPERATOR: Filter invoices owned by operator
  const operatorInvoices = useMemo(() => {
    return invoices.filter((inv) => isInvoiceOwner(currentUser, inv))
  }, [invoices, currentUser])

  const operatorRecentInvoices: Invoice[] = useMemo(() => {
    return operatorInvoices.slice(0, 6).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      date: inv.created_at || inv.invoice_date,
      customerId: inv.customer_id || '',
      customerName: inv.customer_name_snapshot || 'عميل',
      status: inv.status,
      itemsCount: inv.items?.length || 0,
      subtotal: inv.subtotal,
      discount: (inv.invoice_discount_amount || 0) + (inv.item_discounts_amount || 0),
      tax: 0,
      total: inv.final_total,
      paidAmount: inv.final_total,
      remainingAmount: 0,
      notes: inv.notes,
    }))
  }, [operatorInvoices])

  if (loading || !summary) {
    return <LoadingState message="جاري تجهيز لوحة التحكم والمؤشرات..." />
  }

  // SALES_OPERATOR DASHBOARD — EXACTLY THREE SECTIONS
  if (isSalesOperator) {
    return (
      <div className="space-y-5 sm:space-y-6">
        {/* Page Heading & Discreet Refresh Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-[#11243A] tracking-tight">
              لوحة تحكم مسؤول المبيعات
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              متابعة حركة المبيعات المعتمدة وسجل العمليات وحركات المخزن
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-[#11243A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-50 transition-colors self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
          >
            <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث المؤشرات'}</span>
          </button>
        </div>

        {/* Section A & Section B Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          {/* Section B: Today's Sales (Chart Column "اليوم" with Qena timezone) */}
          <div className="lg:col-span-5 flex flex-col">
            <OperatorTodaySalesCard invoices={invoices} currentUser={currentUser} />
          </div>

          {/* Section A: Sales Invoice Activity */}
          <div className="lg:col-span-7 flex flex-col">
            <RecentInvoicesCard invoices={operatorRecentInvoices} />
          </div>
        </div>

        {/* Section C: Recent Inventory Movements (No stock balance, no purchase costs, no /inventory link) */}
        <div>
          <RecentMovementsCard
            movements={summary.recentMovements}
            showInventoryLink={false}
          />
        </div>
      </div>
    )
  }

  // ADMIN DASHBOARD — PRESERVED COMPLETE
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Level 1: Page Heading & Discreet Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[#11243A] tracking-tight">
            نظرة عامة على النشاط التجاري
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            متابعة حركة المبيعات والمخزون والتوريدات لفرع قنا والوقف
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold text-[#11243A] bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-50 transition-colors self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
        >
          <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث المؤشرات'}</span>
        </button>
      </div>

      {/* Level 2: Primary KPI Metrics (4 Cards) */}
      <DashboardMetrics summary={summary} />

      {/* Level 3: Analytics - Sales Trend Chart with Daily / Weekly / Monthly Switch */}
      <SalesTrendChart
        trends={summary.salesTrends}
        invoices={invoices}
        defaultMode="weekly"
      />

      {/* Level 4: Secondary Information (Operational Tables & Stock Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <RecentInvoicesCard invoices={summary.recentInvoices} />
        <RecentMovementsCard movements={summary.recentMovements} />
      </div>

      {/* Stock Alerts Section */}
      <div>
        <LowStockAlertsCard products={products} />
      </div>
    </div>
  )
}
