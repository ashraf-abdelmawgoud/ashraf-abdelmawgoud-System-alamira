import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { DashboardMetrics } from './DashboardMetrics'
import { SalesTrendChart } from './SalesTrendChart'
import { RecentInvoicesCard } from './RecentInvoicesCard'
import { RecentMovementsCard } from './RecentMovementsCard'
import { LowStockAlertsCard } from './LowStockAlertsCard'
import { OperatorTodaySalesCard } from './OperatorTodaySalesCard'
import { dataService } from '@/services/dataService'
import { DashboardSummary, Product, SalesInvoice, Invoice } from '@/types'
import { LoadingState, Button } from '@/components/ui'
import { useAuth } from '@/auth'
import { isInvoiceOwner } from '@/auth/rbac'
import { AlertCircle } from 'lucide-react'

export const DashboardView: React.FC = () => {
  const { currentUser } = useAuth()
  const isSalesOperator = currentUser.role === 'SALES_OPERATOR'

  const isMountedRef = useRef(true)
  const isFetchingRef = useRef(false)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      // Prevent duplicate simultaneous requests
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      if (isManualRefresh) setIsRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        // Fetch invoices and products once (avoiding duplicate queries)
        const [invs, prods] = await Promise.all([
          dataService.getInvoices(),
          isSalesOperator ? Promise.resolve([]) : dataService.getProducts(undefined, currentUser.role),
        ])

        // Pass fetched invoices and products into getDashboardSummary to avoid duplicate requests
        const sum = await dataService.getDashboardSummary({
          invoices: invs,
          products: prods,
          currentUserRole: currentUser.role,
        })

        if (!isMountedRef.current) return

        setSummary(sum)
        setProducts(prods)
        setInvoices(invs)
        setError(null)
      } catch (err: unknown) {
        if (!isMountedRef.current) return
        const msg = err instanceof Error ? err.message : 'تعذر تحميل بيانات ومؤشرات لوحة التحكم'
        setError(msg)
      } finally {
        isFetchingRef.current = false
        if (isMountedRef.current) {
          setLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [currentUser.role, isSalesOperator]
  )

  useEffect(() => {
    isMountedRef.current = true
    loadData()
    return () => {
      isMountedRef.current = false
    }
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

  if (loading && !summary && !error) {
    return <LoadingState message="جاري تجهيز لوحة التحكم والمؤشرات..." />
  }

  if (error && !summary) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#11243A]">تعذر تحميل لوحة التحكم</h3>
            <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => loadData(false)}
            className="w-full justify-center"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  if (!summary) {
    return <LoadingState message="جاري تجهيز لوحة التحكم والمؤشرات..." />
  }

  // SALES_OPERATOR DASHBOARD — EXACTLY THREE SECTIONS
  if (isSalesOperator) {
    return (
      <div className="space-y-5 sm:space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs text-rose-800">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="font-bold underline cursor-pointer hover:text-rose-950"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
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
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs text-rose-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="font-bold underline cursor-pointer hover:text-rose-950"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
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
