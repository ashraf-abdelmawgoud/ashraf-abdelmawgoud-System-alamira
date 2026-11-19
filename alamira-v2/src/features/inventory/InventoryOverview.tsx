import React from 'react'
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  History,
  AlertTriangle,
  Layers,
  CircleDollarSign,
  ArrowLeft,
} from 'lucide-react'
import { Card, StatCard, Button } from '@/components/ui'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Product, StockReceipt, StockIssue, StockAdjustment } from '@/types'

export type InventoryTabType = 'overview' | 'receipts' | 'issues' | 'adjustments' | 'movements'

interface InventoryTabsBarProps {
  activeTab: InventoryTabType
  onTabChange: (tab: InventoryTabType) => void
  counts: {
    receipts: number
    issues: number
    adjustments: number
    movements: number
  }
}

export const InventoryTabsBar: React.FC<InventoryTabsBarProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const tabs = [
    {
      id: 'overview' as InventoryTabType,
      label: 'نظرة عامة',
      icon: <Boxes className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'receipts' as InventoryTabType,
      label: 'أذون الاستلام (الوارد)',
      icon: <ArrowDownLeft className="w-4 h-4 shrink-0" />,
      count: counts.receipts,
    },
    {
      id: 'issues' as InventoryTabType,
      label: 'أذون الصرف (المنصرف)',
      icon: <ArrowUpRight className="w-4 h-4 shrink-0" />,
      count: counts.issues,
    },
    {
      id: 'adjustments' as InventoryTabType,
      label: 'تسويات الجرد',
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
      count: counts.adjustments,
    },
    {
      id: 'movements' as InventoryTabType,
      label: 'سجل حركات المخزون',
      icon: <History className="w-4 h-4 shrink-0" />,
      count: counts.movements,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#11243A] hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {formatNumber(tab.count)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface InventoryOverviewProps {
  products: Product[]
  receipts: StockReceipt[]
  issues: StockIssue[]
  adjustments: StockAdjustment[]
  onNavigateTab: (tab: InventoryTabType) => void
  onOpenNewReceipt: () => void
  onOpenNewIssue: () => void
  onOpenNewAdjustment: () => void
}

export const InventoryOverview: React.FC<InventoryOverviewProps> = ({
  products,
  receipts,
  issues,
  adjustments,
  onNavigateTab,
  onOpenNewReceipt,
  onOpenNewIssue,
  onOpenNewAdjustment,
}) => {
  const totalItemsCount = products.length
  const totalStockQuantity = products.reduce((acc, p) => acc + (p.current_stock || 0), 0)
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (p.current_stock || 0) * (p.purchase_price || 0),
    0
  )
  const lowStockCount = products.filter((p) => p.isLowStock || p.current_stock <= p.min_stock_level).length
  const outOfStockCount = products.filter((p) => p.current_stock <= 0).length

  const draftReceiptsCount = receipts.filter((r) => r.status === 'draft').length
  const draftIssuesCount = issues.filter((i) => i.status === 'draft').length

  return (
    <div className="space-y-6">
      {/* Quick Action Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-[#0F766E] border border-emerald-200">
              إدارة حركة المستودعات
            </span>
            <span className="text-xs text-[#64748B]">
              المستودع المركزي — شركة الأميرة
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#11243A]">أذون وحركات المخزون المعصومة</h2>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            تسجيل ومتابعة أذون الاستلام والتوريدات، أذون الصرف، وتسويات الجرد الفعلي للمخازن.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button
            variant="primary"
            onClick={onOpenNewReceipt}
            className="flex-1 sm:flex-none justify-center shadow-xs"
          >
            إذن استلام وارد
          </Button>
          <Button
            variant="secondary"
            onClick={onOpenNewIssue}
            className="flex-1 sm:flex-none justify-center bg-slate-100 hover:bg-slate-200 text-[#11243A] border border-[#CBD5E1]"
          >
            إذن صرف منصرف
          </Button>
          <Button
            variant="outline"
            onClick={onOpenNewAdjustment}
            className="flex-1 sm:flex-none justify-center border-[#CBD5E1] text-[#11243A] hover:bg-slate-50 hover:text-[#0F766E]"
          >
            تسوية جردية
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي قيمة المخزون (بالتكلفة)"
          value={formatCurrency(totalInventoryValue)}
          subtitle={`إجمالي الأصناف: ${formatNumber(totalItemsCount)} صنف`}
          icon={<CircleDollarSign className="w-5 h-5 text-[#0F766E]" />}
          variant="emerald"
        />
        <StatCard
          title="إجمالي الكميات بالمخزن"
          value={formatNumber(totalStockQuantity)}
          subtitle="وحدات مخزنية متوفرة"
          icon={<Layers className="w-5 h-5 text-[#11243A]" />}
          variant="navy"
        />
        <StatCard
          title="أصناف أوشكت على النفاد"
          value={formatNumber(lowStockCount)}
          subtitle={
            outOfStockCount > 0
              ? `منها ${formatNumber(outOfStockCount)} صنف برصيد صفر`
              : 'أقل من الحد الأدنى للطلب'
          }
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          variant="amber"
        />
        <StatCard
          title="مسودات تنتظر الاعتماد"
          value={formatNumber(draftReceiptsCount + draftIssuesCount)}
          subtitle={`${formatNumber(draftReceiptsCount)} وارد | ${formatNumber(draftIssuesCount)} منصرف`}
          icon={<ClipboardCheck className="w-5 h-5 text-[#64748B]" />}
          variant="neutral"
        />
      </div>

      {/* Movement Shortcuts / Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card
          className="group hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer p-4 sm:p-5 flex flex-col justify-between h-full bg-white rounded-xl border border-[#E2E8F0]"
          onClick={() => onNavigateTab('receipts')}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-lg bg-emerald-50 text-[#0F766E] border border-emerald-200">
                <ArrowDownLeft className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-[#0F766E] rounded-md border border-emerald-100 tabular-nums">
                {formatNumber(receipts.length)} إذن مسجل
              </span>
            </div>
            <h3 className="text-base font-bold text-[#11243A] mb-1.5 group-hover:text-[#0F766E] transition-colors">
              أذون الاستلام (التوريدات)
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              إثبات استلام وتوريد البضائع من الموردين، وتحديث أسعار الشراء وزيادة أرصدة الأصناف فور الاعتماد.
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#0F766E]">
            <span>استعراض سجل الأذون</span>
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </Card>

        <Card
          className="group hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer p-4 sm:p-5 flex flex-col justify-between h-full bg-white rounded-xl border border-[#E2E8F0]"
          onClick={() => onNavigateTab('issues')}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-lg bg-slate-100 text-[#11243A] border border-slate-200">
                <ArrowUpRight className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-[#11243A] rounded-md border border-slate-200 tabular-nums">
                {formatNumber(issues.length)} إذن مسجل
              </span>
            </div>
            <h3 className="text-base font-bold text-[#11243A] mb-1.5 group-hover:text-[#0F766E] transition-colors">
              أذون الصرف المخزني
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              صرف الأصناف للمواقع، المشاريع، والمعارض مع التحقق الصارم من توفر الرصيد الكافي ومنع الأرصدة السالبة.
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#11243A]">
            <span>استعراض سجل الصرف</span>
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </Card>

        <Card
          className="group hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer p-4 sm:p-5 flex flex-col justify-between h-full bg-white rounded-xl border border-[#E2E8F0]"
          onClick={() => onNavigateTab('adjustments')}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-lg bg-slate-100 text-[#11243A] border border-slate-200">
                <ClipboardCheck className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-[#11243A] rounded-md border border-slate-200 tabular-nums">
                {formatNumber(adjustments.length)} تسوية معتمدة
              </span>
            </div>
            <h3 className="text-base font-bold text-[#11243A] mb-1.5 group-hover:text-[#0F766E] transition-colors">
              تسويات الجرد الفعلي
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              مطابقة الرصيد الدفتري مع الرصيد الواقعي في المستودع وتوثيق أسباب العجز والزيادة مع الأمان المحاسبي.
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#11243A]">
            <span>استعراض التسويات</span>
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </div>
        </Card>
      </div>
    </div>
  )
}
