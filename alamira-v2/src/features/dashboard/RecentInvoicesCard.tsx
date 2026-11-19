import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { Invoice, InvoiceStatus } from '@/types'
import { formatCurrency, formatCairoDateTime } from '@/lib/formatters'
import { FileText, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface RecentInvoicesCardProps {
  invoices: Invoice[]
}

export const RecentInvoicesCard: React.FC<RecentInvoicesCardProps> = ({ invoices }) => {
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="emerald" size="sm" dot className="text-[10px] px-1.5 py-0 h-4.5 font-bold shrink-0">
            معتمدة
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="warning" size="sm" dot className="text-[10px] px-1.5 py-0 h-4.5 font-bold shrink-0">
            مسودة
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="danger" size="sm" dot className="text-[10px] px-1.5 py-0 h-4.5 font-bold shrink-0">
            ملغاة
          </Badge>
        )
    }
  }

  return (
    <Card className="border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3.5 sm:p-4 pb-2.5 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-[15px] font-extrabold text-[#11243A]">
            <FileText className="w-4.5 h-4.5 text-[#0F766E] shrink-0" />
            <span className="truncate">أحدث فواتير المبيعات</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-[#64748B] mt-0.5 truncate">
            آخر الفواتير المعتمدة والمسودات الصادرة
          </CardDescription>
        </div>
        <Link
          to="/invoices"
          className="text-xs font-bold text-[#0F766E] hover:text-[#115E59] flex items-center gap-1 transition-colors shrink-0 hover:underline"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-2.5 flex-1">
        {invoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B]">
            لا توجد فواتير مبيعات مسجلة حتى الآن
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-2.5 sm:p-3 rounded-lg border border-[#E2E8F0] hover:border-slate-300 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-2.5 shadow-2xs"
              >
                {/* Right side (RTL start): Invoice number, Status, Customer name, Date */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-[11px] font-bold text-[#11243A] bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded shrink-0">
                      {inv.invoiceNumber}
                    </span>
                    {getStatusBadge(inv.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <p className="font-bold text-[#11243A] truncate max-w-[170px] sm:max-w-[220px]">
                      {inv.customerName}
                    </p>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10.5px] text-[#64748B] shrink-0" dir="ltr">
                      {formatCairoDateTime(inv.date, { includeSeconds: false })}
                    </span>
                  </div>
                </div>

                {/* Left side (RTL end): Total Amount */}
                <div className="text-left shrink-0 pl-1">
                  <span className="block font-extrabold text-xs sm:text-[13.5px] text-[#0F766E] tabular-nums">
                    {formatCurrency(inv.total)}
                  </span>
                  <span className="block text-[10px] text-[#64748B] font-medium">
                    الإجمالي
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
