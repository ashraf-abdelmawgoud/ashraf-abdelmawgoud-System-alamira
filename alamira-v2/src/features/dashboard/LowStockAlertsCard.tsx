import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { Product } from '@/types'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface LowStockAlertsCardProps {
  products: Product[]
}

export const LowStockAlertsCard: React.FC<LowStockAlertsCardProps> = ({ products }) => {
  const lowStockItems = products.filter((p) => p.isLowStock)

  return (
    <Card className="border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 sm:p-5 pb-3 border-b border-[#E2E8F0]">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-[15px] text-[#11243A]">
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            </div>
            <span className="truncate">نواقص المخزون والتنبيهات العاجلة</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B] mt-0.5">
            أصناف تجاوزت حد الطلب الأدنى وتتطلب أوامر توريد جديدة
          </CardDescription>
        </div>
        <Link
          to="/products"
          className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors self-start sm:self-auto shrink-0"
        >
          <span>إدارة الأصناف</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3">
        <div className="space-y-2.5">
          {lowStockItems.map((prod) => {
            const percentage = Math.min(
              Math.round((prod.currentStock / prod.minStockLevel) * 100),
              100
            )

            return (
              <div
                key={prod.id}
                className="p-3 rounded-lg border border-[#E2E8F0] hover:border-amber-300 bg-white space-y-2 text-right transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs sm:text-[13px] text-[#11243A] truncate">
                    {prod.name}
                  </span>
                  <Badge variant="warning" size="sm" className="shrink-0 text-[11px] tabular-nums">
                    {prod.currentStock} {prod.unit} متبقي
                  </Badge>
                </div>

                {/* Progress meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#64748B] tabular-nums">
                    <span>الرصيد: {prod.currentStock} {prod.unit}</span>
                    <span>الحد الأدنى: {prod.minStockLevel} {prod.unit}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#D97706] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
