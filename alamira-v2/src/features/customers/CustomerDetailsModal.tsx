import React from 'react'
import { Modal, Button, Badge } from '@/components/ui'
import { Customer } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { User, Phone, MapPin, FileText, Edit3, DollarSign } from 'lucide-react'

export interface CustomerDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer | null
  onEdit: (customer: Customer) => void
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit,
}) => {
  if (!customer) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="بطاقة بيانات العميل"
      description={`الاسم: ${customer.name}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose()
              onEdit(customer)
            }}
            startIcon={<Edit3 className="w-4 h-4" />}
          >
            تعديل البيانات
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 text-right">
        {/* Header Summary */}
        <div className="flex items-start justify-between gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
          <div>
            <h3 className="font-extrabold text-base text-neutral-900">{customer.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              الكود الداخلي: {customer.code || customer.id}
            </p>
          </div>
          <Badge variant={customer.is_active ? 'emerald' : 'neutral'} dot>
            {customer.is_active ? 'نشط' : 'معلق'}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3 text-xs">
          <h4 className="font-bold text-neutral-800 flex items-center gap-1.5 text-xs">
            <User className="w-4 h-4 text-emerald-600" />
            <span>بيانات الاتصال والمقر</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
              <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-400 block">الهاتف</span>
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="font-semibold text-emerald-700 hover:underline"
                    dir="ltr"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-neutral-500">غير مسجل</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-400 block">العنوان</span>
                <span className="font-semibold text-neutral-800 truncate block">
                  {customer.address || customer.city || 'قنا'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Balance & Activity */}
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3">
          <h4 className="font-bold text-neutral-800 flex items-center gap-1.5 text-xs">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>المعاملات المالية والمديونية</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">المديونية الحالية</span>
              <span
                className={`font-extrabold text-base ${
                  customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(customer.balance)}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">عدد الفواتير المسجلة</span>
              <span className="font-bold text-base text-neutral-900">
                {formatNumber(customer.invoices_count || 0)} فاتورة
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {customer.notes && (
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>ملاحظات إضافية</span>
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">{customer.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
