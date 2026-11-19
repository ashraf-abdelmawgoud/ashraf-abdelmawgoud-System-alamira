import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { InventoryMovement, InventoryMovementType } from '@/types'
import { formatCairoDateTime } from '@/lib/formatters'
import { Boxes, ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface RecentMovementsCardProps {
  movements: InventoryMovement[]
  showInventoryLink?: boolean
}

export const RecentMovementsCard: React.FC<RecentMovementsCardProps> = ({
  movements,
  showInventoryLink = true,
}) => {
  const getMovementBadge = (type: InventoryMovementType) => {
    switch (type) {
      case 'receipt':
        return (
          <Badge
            variant="emerald"
            className="h-4.5 px-1.5 py-0 text-[10px] font-bold gap-1 shrink-0 items-center justify-center border-emerald-200/90 bg-emerald-50 text-[#0F766E]"
          >
            <ArrowDownLeft className="w-2.5 h-2.5 text-[#0F766E] shrink-0" />
            <span>وارد مخزن</span>
          </Badge>
        )
      case 'issue':
        return (
          <Badge
            variant="neutral"
            className="h-4.5 px-1.5 py-0 text-[10px] font-bold gap-1 shrink-0 items-center justify-center border-slate-200/90 bg-slate-100 text-[#11243A]"
          >
            <ArrowUpRight className="w-2.5 h-2.5 text-slate-700 shrink-0" />
            <span>صرف مخزن</span>
          </Badge>
        )
      case 'adjustment':
        return (
          <Badge
            variant="warning"
            className="h-4.5 px-1.5 py-0 text-[10px] font-bold gap-1 shrink-0 items-center justify-center border-amber-200/90 bg-amber-50 text-amber-800"
          >
            <RefreshCw className="w-2.5 h-2.5 text-[#D97706] shrink-0" />
            <span>تسوية</span>
          </Badge>
        )
    }
  }

  return (
    <Card className="border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3.5 sm:p-4 pb-2.5 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-[15px] font-extrabold text-[#11243A]">
            <Boxes className="w-4.5 h-4.5 text-[#0F766E] shrink-0" />
            <span className="truncate">حركات المخزن الأخيرة</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-[#64748B] mt-0.5 truncate">
            سجل أذون الاستلام والصرف والتسويات المخزنية
          </CardDescription>
        </div>
        {showInventoryLink && (
          <Link
            to="/inventory"
            className="text-xs font-bold text-[#0F766E] hover:text-[#115E59] flex items-center gap-1 transition-colors shrink-0 hover:underline"
          >
            <span>عرض الكل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-2.5 flex-1">
        {movements.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B]">
            لا توجد حركات مخزنية مسجلة حتى الآن
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((mov) => (
              <div
                key={mov.id}
                className="p-2.5 sm:p-3 rounded-lg border border-[#E2E8F0] hover:border-slate-300 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Unit Icon Indicator */}
                  <div className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[10.5px] font-bold">
                    {mov.unit}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="font-bold text-xs sm:text-[13px] text-[#11243A] truncate max-w-[170px] sm:max-w-[210px]">
                        {mov.productName}
                      </p>
                      {getMovementBadge(mov.movementType)}
                    </div>
                    <p className="text-[10.5px] text-[#64748B] truncate">
                      {mov.reference} • {mov.performedBy}
                    </p>
                  </div>
                </div>

                {/* Quantity & Date */}
                <div className="text-left shrink-0 pl-1">
                  <span
                    className={`block font-extrabold text-xs sm:text-[13.5px] tabular-nums ${
                      mov.quantity > 0 ? 'text-[#0F766E]' : 'text-[#DC2626]'
                    }`}
                  >
                    {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                  </span>
                  <span className="block text-[10px] text-[#64748B] font-medium" dir="ltr">
                    {formatCairoDateTime(mov.date, { includeSeconds: false })}
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
