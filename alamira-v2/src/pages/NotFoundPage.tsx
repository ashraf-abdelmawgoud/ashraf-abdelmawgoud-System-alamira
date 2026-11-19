import React from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { AlertCircle } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-12">
      <EmptyState
        icon={<AlertCircle className="w-8 h-8 text-rose-500" />}
        title="الصفحة المطلوبة غير موجودة"
        description="ربما تم نقل الصفحة أو أن الرابط غير صحيح. يمكنك العودة إلى لوحة التحكم الرئيسية."
        action={
          <Link to="/">
            <Button>
              العودة للوحة التحكم
            </Button>
          </Link>
        }
      />
    </div>
  )
}
