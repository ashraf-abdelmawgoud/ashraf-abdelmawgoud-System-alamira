import React from 'react'
import { Badge } from '@/components/ui'
import { InvoiceStatus } from '@/types'
import { Clock, CheckCircle2, Ban } from 'lucide-react'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({
  status,
  className,
}) => {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="emerald" className={className}>
          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
          معتمدة
        </Badge>
      )
    case 'draft':
      return (
        <Badge variant="warning" className={className}>
          <Clock className="w-3.5 h-3.5 ml-1" />
          مسودة
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="danger" className={className}>
          <Ban className="w-3.5 h-3.5 ml-1" />
          ملغاة
        </Badge>
      )
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>
  }
}
