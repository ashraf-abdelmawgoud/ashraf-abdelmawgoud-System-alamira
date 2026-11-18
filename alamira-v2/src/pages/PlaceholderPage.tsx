import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { Construction, ShieldCheck } from 'lucide-react'

export interface PlaceholderPageProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  plannedPhase: string
  features: string[]
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  icon,
  plannedPhase,
  features,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-neutral-200/60">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
                {title}
              </h2>
              <Badge variant="neutral" size="sm">
                {plannedPhase}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">{subtitle}</p>
          </div>
        </div>
      </div>

      <Card className="border-dashed border-2 border-neutral-200 bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 mb-3">
            <Construction className="w-7 h-7 text-emerald-600" />
          </div>
          <CardTitle className="text-lg">هذا القسم قيد التجهيز للمراحل القادمة</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            تم بناء الأساس المعماري ومكونات واجهة المستخدم (V2 Foundation). سيتم تفعيل الوظائف التنفيذية والربط في المراحل التالية بعد اعتماد النموذج الأولي.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="max-w-lg mx-auto bg-neutral-50 rounded-xl p-5 border border-neutral-200/70">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">
              الميزات المخططة لهذا القسم:
            </h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام آمن — لا توجد أية عمليات تعديل على بيانات الإنتاج الحالية</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
