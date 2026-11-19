import React from 'react'
import { Modal, Button, Badge } from '@/components/ui'
import { Supplier } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { Truck, Phone, MapPin, FileText, DollarSign } from 'lucide-react'

export interface SupplierDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null
  onEdit: (supplier: Supplier) => void
}

export const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onEdit,
}) => {
  if (!supplier) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="بطاقة بيانات المورد"
      description={`اسم المورد: ${supplier.name}`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose()
              onEdit(supplier)
            }}
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
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
          <div>
            <h3 className="font-extrabold text-base text-neutral-900">{supplier.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              الكود الداخلي: {supplier.code || supplier.id}
            </p>
          </div>
          <Badge variant={supplier.is_active ? 'emerald' : 'neutral'} dot>
            {supplier.is_active ? 'نشط' : 'معلق'}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3 text-xs">
          <h4 className="font-bold text-neutral-800 flex items-center gap-1.5 text-xs">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>بيانات المصنع والتواصل</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
              <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-400 block">الهاتف</span>
                {supplier.phone ? (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="font-semibold text-emerald-700 hover:underline"
                    dir="ltr"
                  >
                    {supplier.phone}
                  </a>
                ) : (
                  <span className="text-neutral-500">غير مسجل</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-400 block">المقر الرئيسي</span>
                <span className="font-semibold text-neutral-800 truncate block">
                  {supplier.address || supplier.city || 'القاهرة'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Inward Receipts */}
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3">
          <h4 className="font-bold text-neutral-800 flex items-center gap-1.5 text-xs">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>المستحقات وحركات التوريد</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">المستحقات المالية للمورد</span>
              <span className="font-extrabold text-base text-amber-800">
                {formatCurrency(supplier.balance)}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="text-[11px] text-neutral-500 block">أذون الاستلام المخزنية</span>
              <span className="font-bold text-base text-neutral-900">
                {formatNumber(supplier.receipts_count || 0)} إذن توريد
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {supplier.notes && (
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>شروط وملاحظات التوريد</span>
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">{supplier.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
