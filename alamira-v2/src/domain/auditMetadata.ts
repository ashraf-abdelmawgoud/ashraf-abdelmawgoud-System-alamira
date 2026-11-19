import { AuditAction, AuditActionCategory, AuditEntityType, AuditOutcome } from '@/types'

export interface ActionMeta {
  title: string
  category: AuditActionCategory
  description: string
  badgeClass: string
}

export const AUDIT_CATEGORY_LABELS: Record<AuditActionCategory, string> = {
  all: 'جميع الأنشطة والعمليات',
  sales: 'المبيعات والفواتير',
  customers: 'دليل العملاء',
  suppliers: 'دليل الموردين',
  inventory: 'المخزون والأذون',
  products: 'دليل الأصناف والأسعار',
  admin: 'إدارة المستخدمين والإعدادات',
  security: 'مراقبة الأمان والوصول',
}

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  sales_invoice: 'فاتورة مبيعات',
  invoice: 'فاتورة مبيعات',
  customer: 'عميل',
  supplier: 'مورد',
  product: 'صنف / منتج',
  stock_receipt: 'إذن استلام مخزن',
  stock_issue: 'إذن صرف مخزن',
  stock_adjustment: 'إذن تسوية جردية',
  inventory_movement: 'حركة مخزنية',
  user: 'مستخدم نظام',
  role: 'دور وظيفي',
  settings: 'إعدادات المنظومة',
  system_settings: 'إعدادات المنظومة',
  backup: 'نسخة احتياطية',
  system_backup: 'نسخة احتياطية',
  security_access: 'أمان والوصول',
  audit_log: 'سجل الرقابة',
}

export const AUDIT_OUTCOME_LABELS: Record<
  AuditOutcome,
  { label: string; badgeClass: string }
> = {
  success: {
    label: 'ناجحة ومكتملة',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  denied: {
    label: 'مرفوضة / محظورة',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  failure: {
    label: 'فشل العملية',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
}

export const AUDIT_ACTION_MAP: Record<AuditAction, ActionMeta> = {
  // Sales
  INVOICE_CREATE: {
    title: 'إنشاء مسودة فاتورة مبيعات',
    category: 'sales',
    description: 'تم إنشاء مسودة فاتورة مبيعات جديدة في النظام',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  INVOICE_DRAFT_UPDATE: {
    title: 'تعديل مسودة فاتورة مبيعات',
    category: 'sales',
    description: 'تعديل بنود أو مبالغ مسودة فاتورة مبيعات',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  INVOICE_DRAFT_DELETE: {
    title: 'حذف مسودة فاتورة مبيعات',
    category: 'sales',
    description: 'حذف مسودة فاتورة مبيعات نهائياً من الذاكرة',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  INVOICE_APPROVE: {
    title: 'اعتماد فاتورة مبيعات وخصم مخزون',
    category: 'sales',
    description: 'اعتماد نهائي لفاتورة المبيعات وخصم الكميات من المخزن',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  INVOICE_CANCEL: {
    title: 'إلغاء فاتورة مبيعات معتمدة',
    category: 'sales',
    description: 'إلغاء فاتورة مبيعات معتمدة مع استرجاع البضاعة للمخزن',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  INVOICE_PRINT: {
    title: 'طلب طباعة فاتورة مبيعات',
    category: 'sales',
    description: 'فتح نافذة أو أمر طباعة فاتورة المبيعات الرسمية A4',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  INVOICE_EXPORT_PNG: {
    title: 'تصدير فاتورة مبيعات كصورة PNG',
    category: 'sales',
    description: 'تصدير بطاقة الفاتورة الرقمية كصورة PNG للمشاركة',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },

  // Customers
  CUSTOMER_CREATE: {
    title: 'إضافة عميل جديد',
    category: 'customers',
    description: 'تسجيل بيانات عميل جديد في دليل العملاء',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  CUSTOMER_UPDATE: {
    title: 'تحديث بيانات عميل',
    category: 'customers',
    description: 'تعديل بيانات أو هاتف أو عنوان العميل',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  CUSTOMER_DELETE: {
    title: 'حذف عميل',
    category: 'customers',
    description: 'حذف سجل عميل من الدليل (مدير النظام)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },

  // Suppliers
  SUPPLIER_CREATE: {
    title: 'إضافة مورد جديد',
    category: 'suppliers',
    description: 'تسجيل مورد جديد في دليل الموردين المعتمدين',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  SUPPLIER_UPDATE: {
    title: 'تحديث بيانات مورد',
    category: 'suppliers',
    description: 'تعديل بيانات مورد في الدليل',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  SUPPLIER_DELETE: {
    title: 'حذف مورد',
    category: 'suppliers',
    description: 'حذف سجل مورد من الدليل',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },

  // Inventory
  STOCK_RECEIPT_CREATE: {
    title: 'إنشاء إذن استلام بضاعة',
    category: 'inventory',
    description: 'تسجيل إذن استلام مخزن جديد من مورد',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  STOCK_RECEIPT_APPROVE: {
    title: 'اعتماد إذن استلام مخزني',
    category: 'inventory',
    description: 'اعتماد إذن استلام وإضافة الكميات لرصيد المخزن',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  STOCK_ISSUE_CREATE: {
    title: 'إنشاء إذن صرف بضاعة',
    category: 'inventory',
    description: 'تسجيل إذن صرف مخزني للأصناف',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  STOCK_ISSUE_APPROVE: {
    title: 'اعتماد إذن صرف مخزني',
    category: 'inventory',
    description: 'اعتماد إذن صرف وخصم الكميات من المخزن',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  STOCK_ADJUSTMENT_CREATE: {
    title: 'إنشاء إذن تسوية جردية',
    category: 'inventory',
    description: 'تسجيل مسودة تسوية جردية للأصناف',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  STOCK_ADJUSTMENT_APPROVE: {
    title: 'اعتماد إذن تسوية جردية',
    category: 'inventory',
    description: 'اعتماد تسوية فروق الجرد وتعديل رصيد المخزن',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },

  // Products
  PRODUCT_CREATE: {
    title: 'إضافة صنف جديد بالدليل',
    category: 'products',
    description: 'تسجيل صنف جديد بكود SKU وأسعار الشراء والبيع',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  PRODUCT_UPDATE: {
    title: 'تعديل صنف / أسعار',
    category: 'products',
    description: 'تعديل بيانات الصنف أو أسعار البيع والشراء',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  PRODUCT_STATUS_CHANGE: {
    title: 'تغيير حالة الصنف (تفعيل/إيقاف)',
    category: 'products',
    description: 'تغيير حالة الصنف بين نشط وموقوف عن البيع',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PRODUCT_DELETE: {
    title: 'حذف صنف من الدليل',
    category: 'products',
    description: 'حذف صنف من دليل المنتجات',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },

  // Administration
  USER_CREATE: {
    title: 'إنشاء مستخدم تجريبي جديد',
    category: 'admin',
    description: 'إضافة مستخدم جديد للنظام وتحديد دوره وصلاحياته',
    badgeClass: 'bg-slate-100 text-[#11243A] border-slate-300',
  },
  USER_UPDATE: {
    title: 'تعديل بيانات مستخدم',
    category: 'admin',
    description: 'تعديل بيانات المستخدم أو دوره أو مسماه الوظيفي',
    badgeClass: 'bg-slate-100 text-[#11243A] border-slate-300',
  },
  USER_STATUS_CHANGE: {
    title: 'تغيير حالة حساب مستخدم (تفعيل/تعطيل)',
    category: 'admin',
    description: 'تجميد أو إعادة تنشيط حساب المستخدم في المنظومة',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  SETTINGS_UPDATE: {
    title: 'تحديث إعدادات المنظومة',
    category: 'admin',
    description: 'تعديل بيانات وهوية المنشأة أو تفضيلات التشغيل',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  BACKUP_EXPORT: {
    title: 'تصدير نسخة احتياطية',
    category: 'admin',
    description: 'تصدير نسخة احتياطية محلية لبيانات المنظومة',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  BACKUP_EXPORT_JSON: {
    title: 'استخراج نسخة احتياطية JSON',
    category: 'admin',
    description: 'تصدير لقطة بيانات المنظومة بالكامل كملف JSON',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  BACKUP_EXPORT_EXCEL: {
    title: 'استخراج نسخة احتياطية Excel',
    category: 'admin',
    description: 'تصدير كافة جداول المنظومة كملف Excel متكامل',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  AUDIT_LOG_EXPORT: {
    title: 'تصدير سجل النشاط والرقابة',
    category: 'admin',
    description: 'استخراج سجلات التدقيق الرقابي إلى ملف خارجي',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },

  // Access & Security
  AUTH_SWITCH_USER: {
    title: 'تبديل المستخدم الحالي في جلسة العمل',
    category: 'security',
    description: 'محاكاة تشغيل المنظومة بهوية حساب موظف آخر',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  AUTH_SWITCH_ROLE: {
    title: 'تبديل الدور الوظيفي السريع',
    category: 'security',
    description: 'التبديل بين دور مدير النظام ودور مسؤول المبيعات',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  ACCESS_DENIED: {
    title: 'محاولة وصول غير مصرحة / محظورة',
    category: 'security',
    description: 'محاولة الوصول إلى مسار أو تنفيذ عملية محظورة أمنياً',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
  },
}

export function getActionCategory(action: AuditAction): AuditActionCategory {
  return AUDIT_ACTION_MAP[action]?.category || 'admin'
}

