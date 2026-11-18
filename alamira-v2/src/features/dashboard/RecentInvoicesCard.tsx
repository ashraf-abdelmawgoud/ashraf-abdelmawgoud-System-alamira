import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { Invoice, InvoiceStatus } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
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
          <Badge variant="emerald" size="sm" dot>
            معتمدة
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="warning" size="sm" dot>
            مسودة
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="danger" size="sm" dot>
            ملغاة
          </Badge>
        )
    }
  }

  return (
    <Card className="border-[#E2E8F0] shadow-xs overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 sm:p-5 pb-3 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-[15px] text-[#11243A]">
            <FileText className="w-5 h-5 text-[#0F766E] shrink-0" />
            <span className="truncate">أحدث فواتير المبيعات</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-0.5">
            آخر الحركات الصادرة والمسودات قيد المراجعة
          </CardDescription>
        </div>
        <Link
          to="/invoices"
          className="text-xs font-semibold text-[#0F766E] hover:text-[#115E59] flex items-center gap-1 transition-colors self-start sm:self-auto shrink-0"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3">
        {/* Desktop & Tablet Table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <span className="inv-number-badge">{inv.invoiceNumber}</span>
                  </TableCell>
                  <TableCell className="font-medium text-[#11243A]">
                    {inv.customerName}
                  </TableCell>
                  <TableCell className="text-xs text-[#64748B]">
                    {formatDate(inv.date)}
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-left font-semibold text-[#0F766E] tabular-nums">
                    {formatCurrency(inv.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View: High readability cards (<= 640px) */}
        <div className="sm:hidden space-y-2.5">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-3 rounded-lg border border-[#E2E8F0] bg-white shadow-xs space-y-1.5 text-right"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inv-number-badge">
                  {inv.invoiceNumber}
                </span>
                {getStatusBadge(inv.status)}
              </div>
              <p className="font-semibold text-xs text-[#11243A] truncate">
                {inv.customerName}
              </p>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#E2E8F0]">
                <span className="text-[#64748B] text-[11px]">{formatDate(inv.date)}</span>
                <span className="font-semibold text-[#0F766E] tabular-nums">
                  {formatCurrency(inv.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
