import React from 'react'
import { DollarSign, ShoppingBag, Package, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/ui'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { DashboardSummary } from '@/types'

export interface DashboardMetricsProps {
  summary: DashboardSummary
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Today's Sales */}
      <StatCard
        title="مبيعات اليوم"
        value={formatCurrency(summary.todaySales)}
        subtitle={`${summary.todayInvoicesCount} فاتورة مسجلة اليوم`}
        icon={<DollarSign className="w-5 h-5 text-[#0F766E]" />}
        variant="emerald"
      />

      {/* 2. Total Sales */}
      <StatCard
        title="إجمالي المبيعات"
        value={formatCurrency(summary.totalSales)}
        subtitle="الفواتير المعتمدة بالنظام"
        icon={<ShoppingBag className="w-5 h-5 text-[#11243A]" />}
        variant="navy"
      />

      {/* 3. Active Products */}
      <StatCard
        title="أصناف المخزون"
        value={`${formatNumber(summary.totalProductsCount)} صنف`}
        subtitle="إجمالي الأصناف النشطة"
        icon={<Package className="w-5 h-5 text-[#64748B]" />}
        variant="neutral"
      />

      {/* 4. Low-Stock Alerts */}
      <StatCard
        title="نواقص المخزون"
        value={`${formatNumber(summary.lowStockProductsCount)} صنف`}
        subtitle={
          summary.lowStockProductsCount > 0
            ? 'أصناف بلغت حد إعادة الطلب'
            : 'المخزون ضمن المستويات الآمنة'
        }
        icon={<AlertTriangle className="w-5 h-5 text-[#D97706]" />}
        variant={summary.lowStockProductsCount > 0 ? 'amber' : 'neutral'}
      />
    </div>
  )
}
