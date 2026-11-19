import { Role, User } from '@/types'

export type Permission =
  // Route / Page Access
  | 'route:dashboard'
  | 'route:products'
  | 'route:customers'
  | 'route:suppliers'
  | 'route:invoices'
  | 'route:inventory'
  | 'route:reports'
  | 'route:settings'
  | 'route:audit_log'
  // Invoices Actions
  | 'invoices:view'
  | 'invoices:create'
  | 'invoices:approve'
  | 'invoices:cancel_own'
  | 'invoices:cancel_all'
  | 'invoices:delete_draft'
  // Customer Actions
  | 'customers:view'
  | 'customers:create'
  | 'customers:edit_own'
  | 'customers:edit_all'
  | 'customers:delete'
  // Supplier Actions
  | 'suppliers:view'
  | 'suppliers:create'
  | 'suppliers:edit'
  | 'suppliers:delete'
  // Products & Cost Security
  | 'products:view'
  | 'products:create'
  | 'products:manage'
  | 'products:view_cost_price'
  | 'products:view_exact_stock'
  | 'inventory:manage'
  // Reports & Settings & Audit
  | 'reports:view'
  | 'settings:manage'
  | 'backup:export'
  | 'audit:view'
  | 'audit:export'

/**
 * Centralized Role-to-Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'route:dashboard',
    'route:products',
    'route:customers',
    'route:suppliers',
    'route:invoices',
    'route:inventory',
    'route:reports',
    'route:settings',
    'invoices:view',
    'invoices:create',
    'invoices:approve',
    'invoices:cancel_own',
    'invoices:cancel_all',
    'invoices:delete_draft',
    'customers:view',
    'customers:create',
    'customers:edit_own',
    'customers:edit_all',
    'customers:delete',
    'suppliers:view',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:delete',
    'products:view',
    'products:create',
    'products:manage',
    'products:view_cost_price',
    'products:view_exact_stock',
    'inventory:manage',
    'reports:view',
    'settings:manage',
    'backup:export',
    'route:audit_log',
    'audit:view',
    'audit:export',
  ],
  SALES_OPERATOR: [
    'route:dashboard',
    'route:products',
    'route:customers',
    'route:invoices',
    // NO route:suppliers (Restricted from supplier management)
    // NO route:inventory (Restricted from warehouse movements)
    // NO route:reports (Restricted from general ledger and system reports)
    // NO route:settings (Restricted from system settings)
    'invoices:view',
    'invoices:create',
    'invoices:approve',
    'invoices:cancel_own', // Can cancel own approved sales invoices
    'invoices:delete_draft',
    'customers:view',
    'customers:create', // Can create new customers
    'customers:edit_own', // Can edit customers created by the same operator
    // NO customers:edit_all
    // NO customers:delete (Cannot delete customers)
    // NO suppliers:* (Cannot view or manage suppliers)
    'products:view',
    'products:create', // Can create new products in the catalog
    // NO products:manage (Cannot edit or delete products)
    // NO products:view_cost_price (Purchase cost is protected)
    // NO products:view_exact_stock (Raw inventory totals protected)
  ],
}

/**
 * Pre-defined Mock Users for Local Demonstration & Testing
 */
export const MOCK_USERS: Record<Role, User> = {
  ADMIN: {
    id: 'usr-admin-01',
    name: 'المدير العام',
    username: 'admin',
    email: 'admin@alamira.com',
    role: 'ADMIN',
    title: 'مدير النظام (كامل الصلاحيات)',
    is_active: true,
  },
  SALES_OPERATOR: {
    id: 'usr-sales-01',
    name: 'مسؤول المبيعات',
    username: 'sales_operator',
    email: 'sales@alamira.com',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  },
}

/**
 * Checks whether a user or role has a specific permission.
 * Inactive users (is_active === false) have all permissions revoked.
 */
export function hasPermission(userOrRole: User | Role, permission: Permission): boolean {
  if (typeof userOrRole === 'object') {
    if (userOrRole.is_active === false) {
      return false
    }
  }
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}

/**
 * Checks whether a user owns a given invoice.
 */
export function isInvoiceOwner(
  user: User,
  invoice: { created_by?: string | null }
): boolean {
  if (!invoice.created_by) return false
  const creator = invoice.created_by.trim().toLowerCase()
  const userName = user.name.toLowerCase()
  const userUsername = user.username.toLowerCase()
  const userId = user.id.toLowerCase()

  if (creator === userName || creator === userUsername || creator === userId) {
    return true
  }

  // Support Arabic role title alias in mock data for default primary sales operator
  if (
    (user.id === 'usr-sales-01' || user.username === 'sales_operator' || user.name === 'مسؤول المبيعات') &&
    (creator === 'مسؤول المبيعات' || creator === 'sales_operator' || creator === 'موظف المبيعات')
  ) {
    return true
  }

  return false
}

/**
 * Guard: Checks if a user is authorized to cancel an approved sales invoice.
 * - Admin can cancel any approved invoice.
 * - Sales Operator can only cancel approved invoices created by themselves.
 * - Only invoices with status 'approved' can be cancelled.
 */
export function canCancelInvoice(
  user: User,
  invoice: { status: string; created_by?: string | null }
): boolean {
  if (user.is_active === false) return false
  if (invoice.status !== 'approved') return false
  if (user.role === 'ADMIN') return true
  if (user.role === 'SALES_OPERATOR') {
    return isInvoiceOwner(user, invoice)
  }
  return false
}

/**
 * Checks whether a user owns a customer record.
 */
export function isCustomerOwner(
  user: User,
  customer: { created_by?: string | null }
): boolean {
  if (user.is_active === false) return false
  if (!customer.created_by) return false
  const creator = customer.created_by.trim().toLowerCase()
  const userName = user.name.toLowerCase()
  const userUsername = user.username.toLowerCase()
  const userId = user.id.toLowerCase()

  if (creator === userName || creator === userUsername || creator === userId) {
    return true
  }

  // Support Arabic role title alias in mock data for default primary sales operator
  if (
    (user.id === 'usr-sales-01' || user.username === 'sales_operator' || user.name === 'مسؤول المبيعات') &&
    (creator === 'مسؤول المبيعات' || creator === 'sales_operator' || creator === 'موظف المبيعات')
  ) {
    return true
  }

  return false
}

/**
 * Guard: Checks if a user can create new customers.
 * Both Admin and Sales Operator are allowed when active.
 */
export function canCreateCustomer(user: User): boolean {
  if (user.is_active === false) return false
  return hasPermission(user, 'customers:create')
}

/**
 * Guard: Checks if a user is authorized to edit a customer.
 * - Admin can edit all customers.
 * - Sales Operator can only edit customers created by themselves.
 */
export function canEditCustomer(
  user: User,
  customer: { created_by?: string | null }
): boolean {
  if (user.is_active === false) return false
  if (user.role === 'ADMIN') return true
  if (user.role === 'SALES_OPERATOR') {
    return isCustomerOwner(user, customer)
  }
  return false
}

/**
 * Guard: Checks if a user is authorized to delete a customer.
 * Admin only; Sales Operator is strictly prevented from deleting.
 */
export function canDeleteCustomer(user: User): boolean {
  if (user.is_active === false) return false
  return hasPermission(user, 'customers:delete')
}

/**
 * Guard: Checks if a user can view or manage suppliers.
 * Admin only; Sales Operator has no access to suppliers.
 */
export function canManageSuppliers(user: User): boolean {
  if (user.is_active === false) return false
  return hasPermission(user, 'suppliers:view')
}

/**
 * Guard: Checks if a user can create new products.
 * Admin and Sales Operator can create products.
 */
export function canCreateProduct(user: User): boolean {
  if (user.is_active === false) return false
  return hasPermission(user, 'products:create')
}

/**
 * Guard: Checks if a user can view cost / purchase prices.
 * Confidential: Admin only.
 */
export function canViewCostPrice(user: User): boolean {
  if (user.is_active === false) return false
  return hasPermission(user, 'products:view_cost_price')
}

/**
 * Guard: Checks if a user can view exact warehouse stock levels.
 * Admin only; Sales Operator sees stock status badges (متوفر / غير متوفر).
 */
export function canViewExactStock(user: User): boolean {
  if (user.is_active === false) return false
  return hasPermission(user, 'products:view_exact_stock')
}

/**
 * Checks route-level access for a given user.
 */
export function canAccessRoute(user: User, path: string): boolean {
  if (user.is_active === false) return false
  const normalized = path.replace(/^\//, '').split('/')[0].split('#')[0]

  switch (normalized) {
    case '':
    case 'dashboard':
      return hasPermission(user, 'route:dashboard')
    case 'products':
      return hasPermission(user, 'route:products')
    case 'customers':
      return hasPermission(user, 'route:customers')
    case 'invoices':
      return hasPermission(user, 'route:invoices')
    case 'suppliers':
      return hasPermission(user, 'route:suppliers')
    case 'inventory':
      return hasPermission(user, 'route:inventory')
    case 'reports':
      return hasPermission(user, 'route:reports')
    case 'settings':
      return hasPermission(user, 'route:settings')
    case 'audit-log':
      return hasPermission(user, 'route:audit_log')
    default:
      return true
  }
}
