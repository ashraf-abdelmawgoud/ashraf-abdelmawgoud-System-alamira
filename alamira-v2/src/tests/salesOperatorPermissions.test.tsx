import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  MOCK_USERS,
  hasPermission,
  canCancelInvoice,
  isInvoiceOwner,
  canCreateCustomer,
  canEditCustomer,
  isCustomerOwner,
  canDeleteCustomer,
  canManageSuppliers,
  canAccessRoute,
  canCreateProduct,
} from '@/auth/rbac'
import { getNavigationItemsForUser } from '@/components/layout/navigation'
import { AuthProvider } from '@/auth/AuthContext'
import { RoleGuard } from '@/auth/RoleGuard'
import { mockDataService } from '@/services/mockDataService'
import { auditLogger } from '@/services/auditLogger'
import { ProductsTable } from '@/features/products/ProductsTable'
import { ProductDetailsModal } from '@/features/products/ProductDetailsModal'
import { ProductFilters } from '@/features/products/ProductFilters'
import { ProductFormModal } from '@/features/products/ProductFormModal'
import { CustomersTable } from '@/features/customers/CustomersTable'
import { InvoiceBuilder } from '@/features/invoices/InvoiceBuilder'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { AuditLogView } from '@/features/audit/AuditLogView'
import { QENA_TIMEZONE_LABEL } from '@/lib/formatters'
import { SalesInvoice } from '@/types'

describe('Centralized RBAC & SALES_OPERATOR Permission Architecture', () => {
  const adminUser = MOCK_USERS.ADMIN
  const salesOperatorUser = MOCK_USERS.SALES_OPERATOR

  beforeEach(() => {
    mockDataService.resetToDefaults()
    auditLogger.clear()
  })

  // =========================================================================
  // 1. Centralized Permission Definitions & Granular Rights
  // =========================================================================
  describe('1. Centralized RBAC Matrix Definitions', () => {
    it('grants full administrative rights to ADMIN', () => {
      expect(hasPermission(adminUser, 'route:dashboard')).toBe(true)
      expect(hasPermission(adminUser, 'route:products')).toBe(true)
      expect(hasPermission(adminUser, 'route:customers')).toBe(true)
      expect(hasPermission(adminUser, 'route:suppliers')).toBe(true)
      expect(hasPermission(adminUser, 'route:invoices')).toBe(true)
      expect(hasPermission(adminUser, 'route:inventory')).toBe(true)
      expect(hasPermission(adminUser, 'route:reports')).toBe(true)
      expect(hasPermission(adminUser, 'route:settings')).toBe(true)

      expect(hasPermission(adminUser, 'invoices:cancel_all')).toBe(true)
      expect(hasPermission(adminUser, 'customers:delete')).toBe(true)
      expect(hasPermission(adminUser, 'suppliers:create')).toBe(true)
      expect(hasPermission(adminUser, 'products:view_cost_price')).toBe(true)
    })

    it('grants specific, controlled permissions to SALES_OPERATOR', () => {
      // Invoices
      expect(hasPermission(salesOperatorUser, 'invoices:view')).toBe(true)
      expect(hasPermission(salesOperatorUser, 'invoices:create')).toBe(true)
      expect(hasPermission(salesOperatorUser, 'invoices:cancel_own')).toBe(true)
      expect(hasPermission(salesOperatorUser, 'invoices:cancel_all')).toBe(false)

      // Customers
      expect(hasPermission(salesOperatorUser, 'customers:view')).toBe(true)
      expect(hasPermission(salesOperatorUser, 'customers:create')).toBe(true)
      expect(hasPermission(salesOperatorUser, 'customers:edit_own')).toBe(true)
      expect(hasPermission(salesOperatorUser, 'customers:edit_all')).toBe(false)
      expect(hasPermission(salesOperatorUser, 'customers:delete')).toBe(false)

      // Suppliers strictly prohibited
      expect(hasPermission(salesOperatorUser, 'suppliers:view')).toBe(false)
      expect(hasPermission(salesOperatorUser, 'suppliers:create')).toBe(false)
      expect(hasPermission(salesOperatorUser, 'suppliers:edit')).toBe(false)
      expect(hasPermission(salesOperatorUser, 'suppliers:delete')).toBe(false)

      // Confidential product data protected
      expect(hasPermission(salesOperatorUser, 'products:view_cost_price')).toBe(false)
      expect(hasPermission(salesOperatorUser, 'products:view_exact_stock')).toBe(false)
    })
  })

  // =========================================================================
  // 2. Sales Invoices Cancellation & Ownership Workflows
  // =========================================================================
  describe('2. Sales Invoice Cancellation & Audit Logging', () => {
    it('allows SALES_OPERATOR to cancel their own approved sales invoice', async () => {
      // Find an approved invoice created by sales operator (inv-005)
      const invoices = await mockDataService.getInvoices()
      const ownApproved = invoices.find(
        (i) => i.status === 'approved' && isInvoiceOwner(salesOperatorUser, i)
      )
      expect(ownApproved).toBeDefined()
      if (!ownApproved) return

      // Verify guard passes
      expect(canCancelInvoice(salesOperatorUser, ownApproved)).toBe(true)

      // Check product initial stock before cancellation
      const targetItem = ownApproved.items?.[0]
      expect(targetItem).toBeDefined()
      const initialProduct = await mockDataService.getProductById(targetItem!.product_id)
      const initialStock = initialProduct!.current_stock

      // Perform cancellation
      const cancelReason = 'طلب العميل إلغاء الفاتورة لتعديل مقاسات الكابلات'
      const cancelled = await mockDataService.cancelApprovedInvoice(
        ownApproved.id,
        cancelReason,
        salesOperatorUser
      )

      // Assert status and metadata
      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.cancelled_by).toBe('مسؤول المبيعات')
      expect(cancelled.cancel_reason).toBe(cancelReason)
      expect(cancelled.cancelled_at).toBeTruthy()

      // Assert stock is restored
      const updatedProduct = await mockDataService.getProductById(targetItem!.product_id)
      expect(updatedProduct!.current_stock).toBe(
        Math.round((initialStock + targetItem!.quantity) * 1000) / 1000
      )

      // Assert reversal movement logged in inventory
      const movements = await mockDataService.getInventoryMovements()
      const reversalLog = movements.find(
        (m) =>
          m.source_doc_id === ownApproved.id &&
          m.movement_type === 'reversal' &&
          m.product_id === targetItem!.product_id
      )
      expect(reversalLog).toBeDefined()
      expect(reversalLog?.quantity_in).toBe(targetItem!.quantity)
      expect(reversalLog?.created_by).toBe('مسؤول المبيعات')

      // Assert regulatory audit log was prepared and recorded
      const auditLogs = auditLogger.getByEntity('sales_invoice', ownApproved.id)
      expect(auditLogs.length).toBeGreaterThan(0)
      const cancelAudit = auditLogs.find((l) => l.action === 'INVOICE_CANCEL')
      expect(cancelAudit).toBeDefined()
      expect(cancelAudit?.performed_by).toBe('مسؤول المبيعات')
      expect(cancelAudit?.performed_by_role).toBe('SALES_OPERATOR')
      expect(cancelAudit?.reason).toBe(cancelReason)
    })

    it('strictly forbids SALES_OPERATOR from cancelling approved invoices created by others', async () => {
      // Find an approved invoice created by someone else (e.g. inv-001 or inv-003)
      const invoices = await mockDataService.getInvoices()
      const othersApproved = invoices.find(
        (i) => i.status === 'approved' && !isInvoiceOwner(salesOperatorUser, i)
      )
      expect(othersApproved).toBeDefined()
      if (!othersApproved) return

      // UI Guard check
      expect(canCancelInvoice(salesOperatorUser, othersApproved)).toBe(false)

      // Service execution check throws
      await expect(
        mockDataService.cancelApprovedInvoice(
          othersApproved.id,
          'محاولة إلغاء غير مصرح بها',
          salesOperatorUser
        )
      ).rejects.toThrow(/غير مصرح: يمكن لمسؤول المبيعات إلغاء الفواتير التي أنشأها بنفسه فقط/i)
    })

    it('enforces cancellation idempotency safeguards (cannot re-cancel or cancel draft)', async () => {
      const invoices = await mockDataService.getInvoices()
      const draftInvoice = invoices.find((i) => i.status === 'draft')
      expect(draftInvoice).toBeDefined()

      await expect(
        mockDataService.cancelApprovedInvoice(draftInvoice!.id, 'محاولة إلغاء مسودة', salesOperatorUser)
      ).rejects.toThrow(/لا يمكن إلغاء سوى الفواتير المعتمدة فقط/i)
    })
  })

  // =========================================================================
  // 3. Customer Management: Creation, Ownership & Updates
  // =========================================================================
  describe('3. Customer Lifecycle & Ownership Rules', () => {
    it('allows SALES_OPERATOR to create a new customer and records audit log', async () => {
      expect(canCreateCustomer(salesOperatorUser)).toBe(true)

      const newCustomerData = {
        name: 'مؤسسة النور الحديثة للتجارة',
        phone: '01055554433',
        address: 'شارع المحطة - قنا',
        notes: 'عميل مسجل بواسطة مسؤول المبيعات',
      }

      const createdCustomer = await mockDataService.createCustomer(newCustomerData, salesOperatorUser)

      expect(createdCustomer.id).toBeTruthy()
      expect(createdCustomer.name).toBe(newCustomerData.name)
      expect(createdCustomer.created_by).toBe('مسؤول المبيعات')

      // Check audit log
      const auditEntries = auditLogger.getByEntity('customer', createdCustomer.id)
      expect(auditEntries.length).toBe(1)
      expect(auditEntries[0].action).toBe('CUSTOMER_CREATE')
      expect(auditEntries[0].performed_by).toBe('مسؤول المبيعات')
      expect(auditEntries[0].performed_by_role).toBe('SALES_OPERATOR')
    })

    it('allows SALES_OPERATOR to edit customers created by the same operator', async () => {
      // Find customer created by sales operator (cust-003)
      const customer = await mockDataService.getCustomerById('cust-003')
      expect(customer).toBeDefined()
      expect(isCustomerOwner(salesOperatorUser, customer!)).toBe(true)
      expect(canEditCustomer(salesOperatorUser, customer!)).toBe(true)

      // Update customer
      const updated = await mockDataService.updateCustomer(
        customer!.id,
        {
          name: 'مكتب المهندس أحمد عثمان للاستشارات الهندسية المحدث',
          phone: '01234567890',
          address: 'كورنيش النيل الجديد - أسوان',
        },
        salesOperatorUser
      )

      expect(updated.name).toBe('مكتب المهندس أحمد عثمان للاستشارات الهندسية المحدث')
      expect(updated.updated_by).toBe('مسؤول المبيعات')

      // Verify audit log
      const auditEntries = auditLogger.getByEntity('customer', customer!.id)
      const updateLog = auditEntries.find((a) => a.action === 'CUSTOMER_UPDATE')
      expect(updateLog).toBeDefined()
      expect(updateLog?.performed_by).toBe('مسؤول المبيعات')
    })

    it('blocks SALES_OPERATOR from editing customers created by other users', async () => {
      // cust-001 was created by Admin
      const customer = await mockDataService.getCustomerById('cust-001')
      expect(customer).toBeDefined()
      expect(isCustomerOwner(salesOperatorUser, customer!)).toBe(false)
      expect(canEditCustomer(salesOperatorUser, customer!)).toBe(false)

      await expect(
        mockDataService.updateCustomer(
          customer!.id,
          { name: 'محاولة تعديل غير مصرح بها', phone: '0100000000', address: 'قنا' },
          salesOperatorUser
        )
      ).rejects.toThrow(/غير مصرح: يمكن لمسؤول المبيعات تعديل بيانات العملاء الذين أضافهم بنفسه فقط/i)
    })

    it('strictly forbids SALES_OPERATOR from deleting any customer', async () => {
      expect(canDeleteCustomer(salesOperatorUser)).toBe(false)

      await expect(
        mockDataService.deleteCustomer('cust-003', salesOperatorUser)
      ).rejects.toThrow(/غير مصرح: حذف العملاء متاح لمدير النظام فقط/i)
    })
  })

  // =========================================================================
  // 4. Customer Selection in Invoice Builder
  // =========================================================================
  describe('4. Invoice Builder Customer Selection Flexibility', () => {
    it('allows selecting any existing customer regardless of creator', async () => {
      const customers = await mockDataService.getCustomers()
      const products = await mockDataService.getProducts()

      // Render InvoiceBuilder with customers created by both Admin and Sales Operator
      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <InvoiceBuilder
              customers={customers}
              products={products}
              onSave={async () => ({} as SalesInvoice)}
              onClose={() => {}}
            />
          </MemoryRouter>
        </AuthProvider>
      )

      // Ensure select has all customers
      const customerSelect = screen.getByDisplayValue('-- اختر العميل من الدليل --') as HTMLSelectElement
      expect(customerSelect).toBeInTheDocument()

      // Customer created by Admin (cust-001) should be selectable
      const adminCustomerOption = screen.getByRole('option', {
        name: /مؤسسة الأمل للمقاولات العامة/i,
      })
      expect(adminCustomerOption).toBeInTheDocument()

      // Customer created by Sales Operator (cust-003) should be selectable
      const operatorCustomerOption = screen.getByRole('option', {
        name: /مكتب المهندس أحمد عثمان/i,
      })
      expect(operatorCustomerOption).toBeInTheDocument()
    })
  })

  // =========================================================================
  // 5. Route Access, Navigation & Supplier Isolation
  // =========================================================================
  describe('5. Route & Supplier Access Isolation', () => {
    it('prohibits access to supplier management for SALES_OPERATOR', async () => {
      expect(canManageSuppliers(salesOperatorUser)).toBe(false)
      expect(canAccessRoute(salesOperatorUser, '/suppliers')).toBe(false)

      // Navigation filter excludes suppliers
      const navItems = getNavigationItemsForUser(salesOperatorUser)
      const hasSuppliersNav = navItems.some((item) => item.href === '/suppliers')
      expect(hasSuppliersNav).toBe(false)

      // But customers and invoices are accessible
      expect(canAccessRoute(salesOperatorUser, '/customers')).toBe(true)
      expect(canAccessRoute(salesOperatorUser, '/invoices')).toBe(true)
      expect(navItems.some((item) => item.href === '/customers')).toBe(true)
      expect(navItems.some((item) => item.href === '/invoices')).toBe(true)

      // Supplier service mutations throw for SALES_OPERATOR
      await expect(
        mockDataService.createSupplier(
          { name: 'مورد غير مصرح', phone: '010111', address: 'القاهرة' },
          salesOperatorUser
        )
      ).rejects.toThrow(/غير مصرح: إدارة الموردين متاحة لمدير النظام فقط/i)
    })

    it('renders RoleGuard fallback when SALES_OPERATOR accesses guarded route', () => {
      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <RoleGuard
              requiredPermission="suppliers:view"
              fallbackTitle="صلاحية الموردين غير ممنوحة"
              fallbackMessage="غير مصرح لمسؤول المبيعات بالوصول إلى إدارة الموردين."
            >
              <div>Suppliers Content Protected</div>
            </RoleGuard>
          </MemoryRouter>
        </AuthProvider>
      )

      expect(screen.getByText('صلاحية الموردين غير ممنوحة')).toBeInTheDocument()
      expect(screen.queryByText('Suppliers Content Protected')).not.toBeInTheDocument()
      expect(screen.getByText(/العودة إلى لوحة التحكم/i)).toBeInTheDocument()
    })
  })

  // =========================================================================
  // 6. Data Masking: Purchase Costs & Warehouse Inventory Totals
  // =========================================================================
  describe('6. Confidentiality & Data Masking for SALES_OPERATOR', () => {
    it('hides purchase cost and exact stock numbers in ProductsTable for SALES_OPERATOR', async () => {
      const products = await mockDataService.getProducts()

      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <ProductsTable
              products={products}
              onView={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </MemoryRouter>
        </AuthProvider>
      )

      // 'سعر التكلفة' header is not rendered for operator
      expect(screen.queryByText('سعر التكلفة')).not.toBeInTheDocument()

      // Exact numerical warehouse stock is masked with status badge
      expect(screen.getAllByText('متوفر').length).toBeGreaterThan(0)
      expect(screen.queryByText(/14 لفة/i)).not.toBeInTheDocument()
    })

    it('hides purchase price and profit margins in ProductDetailsModal for SALES_OPERATOR', async () => {
      const product = await mockDataService.getProductById('prod-001')
      expect(product).toBeDefined()

      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <ProductDetailsModal
              isOpen={true}
              product={product!}
              onClose={() => {}}
              onEdit={() => {}}
            />
          </MemoryRouter>
        </AuthProvider>
      )

      // Purchase price & profit margin are hidden
      expect(screen.queryByText('سعر الشراء / التكلفة')).not.toBeInTheDocument()
      expect(screen.queryByText('هامش الربح التقديري')).not.toBeInTheDocument()

      // Selling price remains visible
      expect(screen.getByText('سعر البيع المعتمد')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // 7. Customers Table Action Guarding
  // =========================================================================
  describe('7. Customers Table Action Guarding in UI', () => {
    it('disables edit button for other users customers and hides delete button for operator', async () => {
      const customers = await mockDataService.getCustomers()

      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <CustomersTable
              customers={customers}
              onView={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </MemoryRouter>
        </AuthProvider>
      )

      // Delete buttons are completely hidden for SALES_OPERATOR
      expect(screen.queryByTitle(/حذف مؤسسة الأمل/i)).not.toBeInTheDocument()

      // Edit button for cust-001 (created by Admin) is disabled
      const disabledEdits = screen.getAllByTitle('تعديل العميل متاح لمنشئ السجل فقط أو مدير النظام')
      expect(disabledEdits.length).toBeGreaterThan(0)
      expect(disabledEdits[0]).toBeDisabled()

      // Edit button for cust-003 (created by Sales Operator) is enabled
      const enabledEdit = screen.getByTitle(/تعديل مكتب المهندس أحمد عثمان/i)
      expect(enabledEdit).toBeEnabled()
    })
  })

  // =========================================================================
  // 8. Product Creation for SALES_OPERATOR & Cost / Stock Safeguards
  // =========================================================================
  describe('8. Product Creation Permissions & Safeguards', () => {
    it('verifies products:create permission and canCreateProduct guard', () => {
      expect(hasPermission(salesOperatorUser, 'products:create')).toBe(true)
      expect(hasPermission(adminUser, 'products:create')).toBe(true)
      expect(canCreateProduct(salesOperatorUser)).toBe(true)
      expect(canCreateProduct(adminUser)).toBe(true)

      // Products manage (edit/delete) remains ADMIN only
      expect(hasPermission(salesOperatorUser, 'products:manage')).toBe(false)
      expect(hasPermission(adminUser, 'products:manage')).toBe(true)
    })

    it('allows SALES_OPERATOR to create product in mockDataService, saves actual initial quantity to inventory, protects cost price, and records audit with initial stock', async () => {
      const newProd = await mockDataService.createProduct(
        {
          sku: 'ELC-OP-990',
          name: 'مفتاح إنارة مزدوج فينوس',
          category: 'توريدات كهربائية',
          unit: 'قطعة',
          allows_decimal_quantity: false,
          selling_price: 85,
          purchase_price: 55, // Should not be fabricated as verified cost
          opening_quantity: 100, // Must be saved accurately
          min_stock_level: 10,
        },
        salesOperatorUser
      )

      expect(newProd.id).toBeDefined()
      expect(newProd.sku).toBe('ELC-OP-990')
      expect(newProd.selling_price).toBe(85)
      // Initial stock is preserved in inventory system
      expect(newProd.current_stock).toBe(100)
      expect(newProd.currentStock).toBe(100)
      // Purchase cost is not fabricated
      expect(newProd.purchase_price).toBe(0)
      expect(newProd.costPrice).toBe(0)

      // Verify audit log records initial stock for ADMIN inspection
      const auditLog = auditLogger.getAll().find((l) => l.action === 'PRODUCT_CREATE' && l.entity_id === newProd.id)
      expect(auditLog).toBeDefined()
      expect(auditLog?.performed_by_role).toBe('SALES_OPERATOR')
      expect(auditLog?.outcome).toBe('success')
      expect(auditLog?.details?.initial_stock).toBe(100)
    })

    it('validates and rejects negative initial quantities', async () => {
      await expect(
        mockDataService.createProduct(
          {
            sku: 'NEG-001',
            name: 'صنف برصيد سالب',
            category: 'عام',
            unit: 'قطعة',
            allows_decimal_quantity: false,
            selling_price: 100,
            purchase_price: 0,
            opening_quantity: -15,
            min_stock_level: 5,
          },
          salesOperatorUser
        )
      ).rejects.toThrow(/الرصيد الافتتاحي/)
    })

    it('allows entering and viewing initial quantity in ProductFormModal while creation form is open and hides purchase price', () => {
      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <ProductFormModal
            isOpen={true}
            onClose={() => {}}
            onSave={async () => {}}
            categories={['توريدات كهربائية']}
          />
        </AuthProvider>
      )

      // Selling price and opening stock are visible during creation
      expect(screen.getByLabelText(/سعر البيع الافتراضي/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/الرصيد الافتتاحي بالمخزن/i)).toBeInTheDocument()

      // Confidential cost price is completely hidden
      expect(screen.queryByLabelText(/سعر الشراء \/ التكلفة/i)).not.toBeInTheDocument()
    })

    it('hides exact stock balance from SALES_OPERATOR after saving, while ADMIN sees exact quantity', async () => {
      const createdProd = await mockDataService.createProduct(
        {
          sku: 'ELC-STK-77',
          name: 'لوحة قواطع شنايدر 12 خط',
          category: 'توريدات كهربائية',
          unit: 'لوحة',
          allows_decimal_quantity: false,
          selling_price: 1250,
          purchase_price: 0,
          opening_quantity: 42,
          min_stock_level: 5,
        },
        salesOperatorUser
      )

      // 1. SALES_OPERATOR View: exact quantity 42 is hidden; shows stock status badge
      const { unmount } = render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <ProductDetailsModal
              isOpen={true}
              product={createdProd}
              onClose={() => {}}
              onEdit={() => {}}
            />
          </MemoryRouter>
        </AuthProvider>
      )

      expect(screen.queryByText(/42 لوحة/i)).not.toBeInTheDocument()
      expect(screen.getByText('متوفر للطلب والبيع')).toBeInTheDocument()
      unmount()

      // 2. ADMIN View: exact quantity 42 is clearly displayed
      render(
        <AuthProvider initialUser={adminUser}>
          <MemoryRouter>
            <ProductDetailsModal
              isOpen={true}
              product={createdProd}
              onClose={() => {}}
              onEdit={() => {}}
            />
          </MemoryRouter>
        </AuthProvider>
      )

      expect(screen.getAllByText(/42 لوحة/i).length).toBeGreaterThan(0)
    })

    it('makes newly created product available in sales invoices and maintains consistent stock deductions and restorations', async () => {
      // 1. Operator creates product with initial stock = 50
      const createdProd = await mockDataService.createProduct(
        {
          sku: 'ELC-INV-50',
          name: 'قاطع تيار رئيسي 63A',
          category: 'توريدات كهربائية',
          unit: 'قطعة',
          allows_decimal_quantity: false,
          selling_price: 320,
          purchase_price: 0,
          opening_quantity: 50,
          min_stock_level: 5,
        },
        salesOperatorUser
      )

      // Product is retrieved in product catalog
      const prods = await mockDataService.getProducts()
      const foundInCatalog = prods.find((p) => p.id === createdProd.id)
      expect(foundInCatalog).toBeDefined()
      expect(foundInCatalog?.current_stock).toBe(50)

      // 2. Operator creates sales invoice for 15 pieces of the newly created product
      const invoice = await mockDataService.createInvoice(
        {
          customer_id: 'cust-001',
          invoice_date: '2026-11-19',
          items: [{ product_id: createdProd.id, quantity: 15, unit_price: 320 }],
        },
        salesOperatorUser
      )

      // 3. Approve invoice -> stock decrements from 50 to 35
      await mockDataService.approveInvoice(invoice.id, salesOperatorUser)
      const afterApprove = (await mockDataService.getProducts()).find((p) => p.id === createdProd.id)
      expect(afterApprove?.current_stock).toBe(35)

      // 4. Cancel invoice -> stock restored from 35 back to 50
      await mockDataService.cancelApprovedInvoice(invoice.id, 'إلغاء للاختبار', salesOperatorUser)
      const afterCancel = (await mockDataService.getProducts()).find((p) => p.id === createdProd.id)
      expect(afterCancel?.current_stock).toBe(50)
    })

    it('rejects product update and delete attempts by SALES_OPERATOR', async () => {
      const products = await mockDataService.getProducts()
      const targetProd = products[0]

      // Update attempt rejected
      await expect(
        mockDataService.updateProduct(
          targetProd.id,
          {
            sku: targetProd.sku,
            name: 'تعديل غير مصرح',
            category: targetProd.category,
            unit: targetProd.unit,
            allows_decimal_quantity: false,
            selling_price: 999,
            purchase_price: 100,
            min_stock_level: 5,
          },
          salesOperatorUser
        )
      ).rejects.toThrow(/غير مصرح/)

      // Delete attempt rejected
      await expect(mockDataService.deleteProduct(targetProd.id, salesOperatorUser)).rejects.toThrow(/غير مصرح/)
    })

    it('renders text-only "إضافة صنف جديد" button in ProductFilters for SALES_OPERATOR', () => {
      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <ProductFilters
            searchQuery=""
            onSearchChange={() => {}}
            selectedCategory="all"
            onCategoryChange={() => {}}
            categories={['عام']}
            selectedStatus="all"
            onStatusChange={() => {}}
            onAddNew={() => {}}
            totalCount={10}
          />
        </AuthProvider>
      )

      const addBtn = screen.getByRole('button', { name: 'إضافة صنف جديد' })
      expect(addBtn).toBeInTheDocument()
      expect(addBtn.textContent?.trim()).toBe('إضافة صنف جديد')
    })
  })

  // =========================================================================
  // 9. Navigation Ordering & Final Position of Settings
  // =========================================================================
  describe('9. Navigation Ordering & Final Position of Settings', () => {
    it('places "الإعدادات" (/settings) in the final position for ADMIN', () => {
      const items = getNavigationItemsForUser(adminUser)
      const lastItem = items[items.length - 1]

      expect(lastItem.name).toBe('الإعدادات')
      expect(lastItem.href).toBe('/settings')

      // Verify audit-log is immediately before settings
      const auditItem = items[items.length - 2]
      expect(auditItem.name).toBe('سجل النشاط والرقابة')
      expect(auditItem.href).toBe('/audit-log')
    })
  })

  // =========================================================================
  // 10. Audit Log Action Buttons (Text-Only Verification)
  // =========================================================================
  describe('10. Audit Log Action Buttons (Text-Only Verification)', () => {
    it('renders "تصدير Excel" and "تصدير JSON" and "تحديث" as text-only buttons', async () => {
      render(
        <AuthProvider initialUser={adminUser}>
          <MemoryRouter>
            <AuditLogView />
          </MemoryRouter>
        </AuthProvider>
      )

      const excelBtn = await screen.findByRole('button', { name: 'تصدير Excel' })
      const jsonBtn = await screen.findByRole('button', { name: 'تصدير JSON' })
      const refreshBtn = await screen.findByRole('button', { name: /تحديث/i })

      expect(excelBtn).toBeInTheDocument()
      expect(excelBtn.textContent?.trim()).toBe('تصدير Excel')

      expect(jsonBtn).toBeInTheDocument()
      expect(jsonBtn.textContent?.trim()).toBe('تصدير JSON')

      expect(refreshBtn).toBeInTheDocument()
      expect(refreshBtn.textContent?.trim()).toMatch(/تحديث/)
    })
  })

  // =========================================================================
  // 11. Role-Specific Dashboard: SALES_OPERATOR (3 Sections) vs ADMIN (Complete)
  // =========================================================================
  describe('11. Role-Specific Dashboard Views', () => {
    it('renders EXACTLY three sections for SALES_OPERATOR and hides admin widgets', async () => {
      render(
        <AuthProvider initialUser={salesOperatorUser}>
          <MemoryRouter>
            <DashboardView />
          </MemoryRouter>
        </AuthProvider>
      )

      // Section A: Sales Invoice Activity
      expect(await screen.findByText('أحدث فواتير المبيعات')).toBeInTheDocument()

      // Section B: Today's Sales with Qena timezone and single column "اليوم"
      expect(screen.getByText('مبيعات اليوم')).toBeInTheDocument()
      expect(screen.getByText(QENA_TIMEZONE_LABEL)).toBeInTheDocument()
      expect(screen.getByText('اليوم')).toBeInTheDocument()

      // Section C: Recent Inventory Movements (without link to /inventory)
      expect(screen.getByText('حركات المخزن الأخيرة')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /عرض الكل/i })).not.toHaveAttribute('href', '/inventory')

      // Strictly hidden from SALES_OPERATOR:
      expect(screen.queryByText('مؤشر المبيعات الأسبوعي')).not.toBeInTheDocument()
      expect(screen.queryByText('مؤشر المبيعات اليومي')).not.toBeInTheDocument()
      expect(screen.queryByText('نواقص المخزون والتنبيهات العاجلة')).not.toBeInTheDocument()
      expect(screen.queryByText('أصناف المخزون')).not.toBeInTheDocument()
    })

    it('preserves full 5-level dashboard for ADMIN', async () => {
      render(
        <AuthProvider initialUser={adminUser}>
          <MemoryRouter>
            <DashboardView />
          </MemoryRouter>
        </AuthProvider>
      )

      // Admin KPI Cards
      expect(await screen.findByText('إجمالي المبيعات')).toBeInTheDocument()
      expect(screen.getByText('أصناف المخزون')).toBeInTheDocument()

      // Multi-period Trend Chart
      expect(screen.getByText(/مؤشر المبيعات الأسبوعي|مؤشر المبيعات/i)).toBeInTheDocument()

      // Invoices and Movements
      expect(screen.getByText('أحدث فواتير المبيعات')).toBeInTheDocument()
      expect(screen.getByText('حركات المخزن الأخيرة')).toBeInTheDocument()

      // Low Stock Alerts
      expect(screen.getByText('نواقص المخزون والتنبيهات العاجلة')).toBeInTheDocument()
    })
  })
})
