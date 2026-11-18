import React, { useEffect, useState } from 'react'
import { DashboardMetrics } from './DashboardMetrics'
import { SalesTrendChart } from './SalesTrendChart'
import { RecentInvoicesCard } from './RecentInvoicesCard'
import { RecentMovementsCard } from './RecentMovementsCard'
import { LowStockAlertsCard } from './LowStockAlertsCard'
import { mockDataService } from '@/services/mockDataService'
import { DashboardSummary, Product } from '@/types'
import { LoadingState } from '@/components/ui'
import { RefreshCw } from 'lucide-react'

export const DashboardView: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true)
    else setLoading(true)

    try {
      const [sum, prods] = await Promise.all([
        mockDataService.getDashboardSummary(),
        mockDataService.getProducts(),
      ])
      setSummary(sum)
      setProducts(prods)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading || !summary) {
    return <LoadingState message="جاري تجهيز لوحة التحكم والمؤشرات..." />
  }

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
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#11243A] bg-white border border-[#E2E8F0] rounded-md hover:bg-slate-50 transition-colors self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0F766E] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث المؤشرات'}</span>
        </button>
      </div>

      {/* Level 2: Primary KPI Metrics (4 Cards) */}
      <DashboardMetrics summary={summary} />

      {/* Level 3: Analytics - Sales Trend Chart */}
      <SalesTrendChart trends={summary.salesTrends} />

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
