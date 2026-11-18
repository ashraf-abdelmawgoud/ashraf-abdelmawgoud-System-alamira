import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { InventoryMovement, InventoryMovementType } from '@/types'
import { formatDate } from '@/lib/formatters'
import { Boxes, ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface RecentMovementsCardProps {
  movements: InventoryMovement[]
}

export const RecentMovementsCard: React.FC<RecentMovementsCardProps> = ({ movements }) => {
  const getMovementBadge = (type: InventoryMovementType) => {
    switch (type) {
      case 'receipt':
        return (
          <Badge variant="emerald" size="sm" className="gap-1 text-[11px] py-0 px-2 shrink-0">
            <ArrowDownLeft className="w-3 h-3 text-[#047857]" />
            وارد مخزن
          </Badge>
        )
      case 'issue':
        return (
          <Badge variant="info" size="sm" className="gap-1 text-[11px] py-0 px-2 shrink-0">
            <ArrowUpRight className="w-3 h-3 text-[#0284c7]" />
            صرف مخزن
          </Badge>
        )
      case 'adjustment':
        return (
          <Badge variant="warning" size="sm" className="gap-1 text-[11px] py-0 px-2 shrink-0">
            <RefreshCw className="w-3 h-3 text-[#d97706]" />
            تسوية
          </Badge>
        )
    }
  }

  return (
    <Card className="border-[#E2E8F0] shadow-xs overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 sm:p-5 pb-3 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-[15px] text-[#11243A]">
            <Boxes className="w-5 h-5 text-[#0F766E] shrink-0" />
            <span className="truncate">حركات المخزن الأخيرة</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-0.5">
            سجل حركة الأصناف والكميات الواردة والمنصرفة
          </CardDescription>
        </div>
        <Link
          to="/inventory"
          className="text-xs font-semibold text-[#0F766E] hover:text-[#115E59] flex items-center gap-1 transition-colors self-start sm:self-auto shrink-0"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3">
        <div className="space-y-2">
          {movements.map((mov) => (
            <div
              key={mov.id}
              className="p-3 rounded-lg border border-[#E2E8F0] hover:border-slate-300 bg-white transition-colors space-y-1.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between shadow-2xs"
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <div className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  {mov.unit}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-xs sm:text-[13px] text-[#11243A] truncate">
                      {mov.productName}
                    </p>
                    {getMovementBadge(mov.movementType)}
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                    {mov.reference} • {mov.performedBy}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0] text-left shrink-0">
                <span
                  className={`font-semibold text-xs sm:text-[13px] tabular-nums ${
                    mov.quantity > 0 ? 'text-[#0F766E]' : 'text-[#DC2626]'
                  }`}
                >
                  {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {formatDate(mov.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
