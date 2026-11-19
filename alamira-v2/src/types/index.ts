export type InvoiceStatus = 'draft' | 'approved' | 'cancelled'

export type Role = 'ADMIN' | 'SALES_OPERATOR'

export interface User {
  id: string
  name: string
  username: string
  email?: string
  role: Role
  title: string
  is_active: boolean
}

export type AuditOutcome = 'success' | 'denied' | 'failure'

export type AuditActionCategory =
  | 'all'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'inventory'
  | 'products'
  | 'admin'
  | 'security'

export type AuditAction =
  // Sales
  | 'INVOICE_CREATE'
  | 'INVOICE_DRAFT_UPDATE'
  | 'INVOICE_DRAFT_DELETE'
  | 'INVOICE_APPROVE'
  | 'INVOICE_CANCEL'
  | 'INVOICE_PRINT'
  | 'INVOICE_EXPORT_PNG'
  // Customers
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_UPDATE'
  | 'CUSTOMER_DELETE'
  // Suppliers
  | 'SUPPLIER_CREATE'
  | 'SUPPLIER_UPDATE'
  | 'SUPPLIER_DELETE'
  // Inventory
  | 'STOCK_RECEIPT_CREATE'
  | 'STOCK_RECEIPT_APPROVE'
  | 'STOCK_ISSUE_CREATE'
  | 'STOCK_ISSUE_APPROVE'
  | 'STOCK_ADJUSTMENT_CREATE'
  | 'STOCK_ADJUSTMENT_APPROVE'
  // Products
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_STATUS_CHANGE'
  | 'PRODUCT_DELETE'
  // Administration
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_STATUS_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'BACKUP_EXPORT'
  | 'BACKUP_EXPORT_JSON'
  | 'BACKUP_EXPORT_EXCEL'
  | 'AUDIT_LOG_EXPORT'
  // Access & Security
  | 'AUTH_SWITCH_USER'
  | 'AUTH_SWITCH_ROLE'
  | 'ACCESS_DENIED'

export type AuditEntityType =
  | 'sales_invoice'
  | 'invoice'
  | 'customer'
  | 'supplier'
  | 'product'
  | 'stock_receipt'
  | 'stock_issue'
  | 'stock_adjustment'
  | 'inventory_movement'
  | 'user'
  | 'role'
  | 'settings'
  | 'system_settings'
  | 'backup'
  | 'system_backup'
  | 'security_access'
  | 'audit_log'

export interface AuditLogEntry {
  id: string
  action: AuditAction
  category?: AuditActionCategory
  entity_type: AuditEntityType
  entity_id: string
  entity_name_or_number?: string
  performed_by: string
  performed_by_id?: string
  performed_by_role: Role
  timestamp: string
  outcome: AuditOutcome
  reason?: string
  details?: Record<string, unknown>
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
}

export interface AuditLogFilters {
  search?: string
  category?: AuditActionCategory
  action?: AuditAction | 'all'
  outcome?: AuditOutcome | 'all'
  user?: string
  performedBy?: string
  date_from?: string
  date_to?: string
  startDate?: string
  endDate?: string
}

export type InventoryMovementType =
  | 'receipt'
  | 'issue'
  | 'adjustment'
  | 'sale'
  | 'reversal'

export type InventoryDocumentStatus = 'draft' | 'approved' | 'cancelled'

export type ProductStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
export type CustomerStatus = 'all' | 'active' | 'inactive'
export type SupplierStatus = 'all' | 'active' | 'inactive'

export type { CompanyProfile, SystemPreferences } from '@/features/settings/types'

export interface Product {
  id: string
  sku: string
  code: string // backwards compatibility alias for sku
  name: string
  category: string
  unit: string
  allows_decimal_quantity: boolean
  purchase_price: number // V1 database field: default purchase/cost price
  costPrice: number // alias for purchase_price
  selling_price: number // V1 database field: default selling price
  sellingPrice: number // alias for selling_price
  current_stock: number // V1 database field: current warehouse inventory balance
  currentStock: number // alias for current_stock
  min_stock_level: number // V1 database field: minimum threshold for reorder alert
  minStockLevel: number // alias for min_stock_level
  isLowStock: boolean
  description?: string
  notes?: string
  is_active: boolean
  createdAt?: string
}

export interface ProductFormData {
  sku: string
  name: string
  category: string
  unit: string
  allows_decimal_quantity: boolean
  purchase_price: number
  selling_price: number
  min_stock_level: number
  opening_quantity?: number
  description?: string
  is_active?: boolean
}

export interface Customer {
  id: string
  code?: string
  name: string
  phone: string
  address: string
  city: string // alias for address
  notes?: string
  balance: number
  is_active: boolean
  invoices_count: number
  createdAt?: string
  created_by?: string
  updated_by?: string
  updated_at?: string
}

export interface CustomerFormData {
  name: string
  phone: string
  address: string
  notes?: string
  is_active?: boolean
  created_by?: string
}

export interface Supplier {
  id: string
  code?: string
  name: string
  phone: string
  address: string
  city: string // alias for address
  notes?: string
  balance: number
  is_active: boolean
  receipts_count: number
  createdAt?: string
}

export interface SupplierFormData {
  name: string
  phone: string
  address: string
  notes?: string
  is_active?: boolean
}

export type InvoiceDiscountType = 'none' | 'percentage' | 'fixed'

// V1 Database Aligned Sales Invoice Item
export interface SalesInvoiceItem {
  id: string
  invoice_id?: string
  product_id: string
  product_sku_snapshot?: string
  product_name_snapshot?: string
  unit_snapshot?: string
  allows_decimal_quantity?: boolean
  quantity: number
  unit_price: number
  gross_amount: number
  discount_type: InvoiceDiscountType
  discount_value: number
  discount_amount: number
  net_amount: number
}

// V1 Database Aligned Sales Invoice Header
export interface SalesInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  customer_id: string | null
  customer_name_snapshot?: string
  customer_phone_snapshot?: string
  gross_amount: number
  item_discounts_amount: number
  subtotal: number
  invoice_discount_type: InvoiceDiscountType
  invoice_discount_value: number
  invoice_discount_amount: number
  additional_charges: number
  final_total: number
  status: InvoiceStatus
  payment_terms?: 'cash' | 'credit'
  notes?: string
  approved_by?: string | null
  approved_at?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  created_by?: string
  created_at?: string
  updated_at?: string
  items?: SalesInvoiceItem[]
}

export interface SalesInvoiceItemInput {
  product_id: string
  quantity: number
  unit_price: number
  discount_type?: InvoiceDiscountType
  discount_value?: number
}

export interface SalesInvoiceFormData {
  invoice_number?: string
  invoice_date: string
  customer_id: string
  customer_phone?: string
  invoice_discount_type?: InvoiceDiscountType
  invoice_discount_value?: number
  additional_charges?: number
  payment_terms?: 'cash' | 'credit'
  notes?: string
  items: SalesInvoiceItemInput[]
  action?: 'draft' | 'approve'
}

// Legacy alias for Dashboard compatibility
export interface InvoiceItem {
  id: string
  productId: string
  productCode: string
  productName: string
  unit: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  customerId: string
  customerName: string
  status: InvoiceStatus
  itemsCount: number
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  remainingAmount: number
  notes?: string
}

// -------------------------------------------------------------
// STOCK RECEIPTS (أذون استلام البضاعة / التوريدات)
// -------------------------------------------------------------
export interface StockReceiptItem {
  id: string
  receipt_id?: string
  product_id: string
  product_sku?: string
  product_name?: string
  unit?: string
  allows_decimal_quantity?: boolean
  quantity: number
  unit_price: number
  line_total: number
}

export interface StockReceipt {
  id: string
  receipt_number: string
  receipt_date: string
  supplier_id: string | null
  supplier_name?: string
  supplier_invoice_number?: string
  notes?: string
  total_amount: number
  status: InventoryDocumentStatus
  approved_by?: string | null
  approved_at?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  created_by?: string
  created_at: string
  items: StockReceiptItem[]
}

export interface StockReceiptItemInput {
  product_id: string
  quantity: number
  unit_price: number
}

export interface StockReceiptFormData {
  receipt_number?: string
  receipt_date: string
  supplier_id: string | null
  supplier_invoice_number?: string
  notes?: string
  items: StockReceiptItemInput[]
  action?: 'draft' | 'approve'
}

// -------------------------------------------------------------
// STOCK ISSUES (أذون صرف البضاعة من المخزن)
// -------------------------------------------------------------
export interface StockIssueItem {
  id: string
  issue_id?: string
  product_id: string
  product_sku?: string
  product_name?: string
  unit?: string
  allows_decimal_quantity?: boolean
  available_stock?: number
  quantity: number
}

export interface StockIssue {
  id: string
  issue_number: string
  issue_date: string
  recipient_name: string
  reason?: string
  notes?: string
  status: InventoryDocumentStatus
  approved_by?: string | null
  approved_at?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  created_by?: string
  created_at: string
  items: StockIssueItem[]
}

export interface StockIssueItemInput {
  product_id: string
  quantity: number
}

export interface StockIssueFormData {
  issue_number?: string
  issue_date: string
  recipient_name: string
  reason?: string
  notes?: string
  items: StockIssueItemInput[]
  action?: 'draft' | 'approve'
}

// -------------------------------------------------------------
// STOCK ADJUSTMENTS (تسويات الجرد المخزني الفعلي)
// -------------------------------------------------------------
export interface StockAdjustmentItem {
  id: string
  adjustment_id?: string
  product_id: string
  product_sku?: string
  product_name?: string
  unit?: string
  allows_decimal_quantity?: boolean
  recorded_quantity: number
  actual_quantity: number
  difference: number
}

export interface StockAdjustment {
  id: string
  adjustment_number: string
  adjustment_date: string
  reason: string
  status: InventoryDocumentStatus
  approved_by?: string | null
  approved_at?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  created_by?: string
  created_at: string
  items: StockAdjustmentItem[]
}

export interface StockAdjustmentFormData {
  adjustment_number?: string
  adjustment_date: string
  reason: string
  product_id: string
  actual_quantity: number
}

// -------------------------------------------------------------
// INVENTORY MOVEMENTS AUDIT TRAIL (سجل حركات المخزون المعصوم)
// -------------------------------------------------------------
export interface InventoryMovementLog {
  id: string
  product_id: string
  product_sku?: string
  product_name?: string
  unit?: string
  movement_type: InventoryMovementType
  source_doc_type: 'stock_receipt' | 'stock_issue' | 'inventory_adjustment' | 'sales_invoice'
  source_doc_id: string
  source_doc_number: string
  quantity_in: number
  quantity_out: number
  stock_balance_after: number
  unit_cost_or_price: number
  notes?: string
  created_by?: string
  created_at: string
}

// Legacy alias for dashboard compatibility
export interface InventoryMovement {
  id: string
  date: string
  movementType: InventoryMovementType
  movementNumber: string
  productId: string
  productName: string
  productCode: string
  quantity: number
  unit: string
  reference: string
  performedBy: string
}

export interface DailySalesTrend {
  day: string
  date: string
  totalSales: number
  invoicesCount: number
}

export interface DashboardSummary {
  todaySales: number
  todayInvoicesCount: number
  totalSales: number
  totalProductsCount: number
  lowStockProductsCount: number
  activeCustomersCount: number
  recentInvoices: Invoice[]
  recentMovements: InventoryMovement[]
  salesTrends: DailySalesTrend[]
}
