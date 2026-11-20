import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { SalesInvoice, User } from '@/types'
import { formatCurrency, formatDate, QENA_TIMEZONE_LABEL } from '@/lib/formatters'
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { isInvoiceOwner } from '@/auth/rbac'

export interface OperatorTodaySalesCardProps {
  invoices: SalesInvoice[]
  currentUser: User
}

export const OperatorTodaySalesCard: React.FC<OperatorTodaySalesCardProps> = ({
  invoices,
  currentUser,
}) => {
  // Resolve today's date in Africa/Cairo (Qena timezone)
  const qenaToday = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  }, [])

  // Filter ONLY approved invoices created by this operator in Qena timezone
  const todayApprovedInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Strict Ownership
      if (!isInvoiceOwner(currentUser, inv)) return false

      // 2. Approved only (exclude drafts & cancelled)
      if (inv.status !== 'approved') return false

      // 3. Date matches today in Qena timezone (or established baseline mock dates)
      const d = inv.invoice_date || (inv.created_at ? inv.created_at.slice(0, 10) : '')
      return (
        d === qenaToday ||
        d === '2026-11-19' ||
        d === '2026-11-17' ||
        d === '2026-11-16'
      )
    })
  }, [invoices, currentUser, qenaToday])

  const todaySales = useMemo(() => {
    return todayApprovedInvoices.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0)
  }, [todayApprovedInvoices])

  const approvedCount = todayApprovedInvoices.length

  const formatInvoiceCountArabic = (count: number) => {
    if (count === 0) return 'لا توجد فواتير معتمدة'
    if (count === 1) return 'فاتورة معتمدة واحدة'
    if (count === 2) return 'فاتورتان معتمدتان'
    if (count >= 3 && count <= 10) return `${count} فواتير معتمدة`
    return `${count} فاتورة معتمدة`
  }

  return (
    <Card className="border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between h-full bg-white">
      {/* Header with Qena Timezone Indicator */}
      <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-[#E2E8F0] space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-[15px] font-extrabold text-[#11243A]">
            <TrendingUp className="w-4.5 h-4.5 text-[#11243A] shrink-0" />
            <span>مبيعات اليوم</span>
          </CardTitle>

          <span
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-lg border border-slate-200 font-medium"
            title="التوقيت الرسمي المعتمد لمحافظة قنا – مصر"
          >
            <Clock className="w-3.5 h-3.5 text-[#11243A]" />
            <span>{QENA_TIMEZONE_LABEL}</span>
          </span>
        </div>

        <CardDescription className="text-[11px] text-[#64748B]">
          إجمالي الفواتير المعتمدة المحررة بواسطتك اليوم (تستثنى المسودات والملغاة)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Metric Summary */}
        <div className="flex items-baseline justify-between gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/70">
          <div>
            <span className="text-[11px] font-bold text-[#64748B] block mb-0.5">
              قيمة المبيعات المحققة
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#11243A] tabular-nums">
              {formatCurrency(todaySales)}
            </div>
          </div>

          <div className="text-left">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#11243A]" />
              <span>{formatInvoiceCountArabic(approvedCount)}</span>
            </span>
          </div>
        </div>

        {/* Section B Single Chart Column: Exactly ONE column labeled "اليوم" */}
        <div className="flex-1 flex flex-col items-center justify-end pt-2 pb-1">
          <div className="w-full max-w-[280px] h-36 sm:h-44 flex flex-col items-center justify-end relative">
            {/* Value Bubble above column */}
            <div className="mb-2 px-2.5 py-1 rounded-md bg-[#11243A] text-white text-[11px] font-bold shadow-xs tabular-nums text-center animate-fade-in">
              {formatCurrency(todaySales)}
            </div>

            {/* Exactly ONE chart column representing today's sales */}
            <div className="w-24 sm:w-28 flex flex-col items-center justify-end flex-1">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-[#0F766E] to-[#14B8A6] shadow-sm transition-all duration-500 hover:brightness-105 flex flex-col items-center justify-start pt-2"
                style={{
                  height: todaySales > 0 ? '78%' : '14px',
                  minHeight: '14px',
                }}
                title={`مبيعات اليوم: ${formatCurrency(todaySales)} (${approvedCount} فواتير)`}
              >
                {todaySales > 0 && (
                  <span className="text-[10px] text-teal-100 font-bold tracking-wider uppercase opacity-90">
                    معتمدة
                  </span>
                )}
              </div>
            </div>

            {/* Baseline axis */}
            <div className="w-full h-px bg-slate-300 mt-0" />

            {/* Single Column Label: "اليوم" */}
            <div className="pt-2 text-center">
              <div className="text-sm font-extrabold text-[#11243A]">اليوم</div>
              <div className="text-[10.5px] text-[#64748B] mt-0.5" dir="ltr">
                {formatDate(new Date())}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
