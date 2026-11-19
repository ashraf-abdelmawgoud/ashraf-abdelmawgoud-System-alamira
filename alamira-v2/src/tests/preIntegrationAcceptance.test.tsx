import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  MOCK_USERS,
  canAccessRoute,
} from '@/auth/rbac'
import { getNavigationItemsForUser } from '@/components/layout/navigation'
import { AuthProvider } from '@/auth/AuthContext'
import { mockDataService } from '@/services/mockDataService'
import { auditLogger } from '@/services/auditLogger'
import { ProductsTable } from '@/features/products/ProductsTable'
import { ProductDetailsModal } from '@/features/products/ProductDetailsModal'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { AuditLogView } from '@/features/audit/AuditLogView'
import { QENA_TIMEZONE, QENA_TIMEZONE_LABEL } from '@/lib/formatters'
import { Product, SalesInvoiceFormData } from '@/types'

describe('Al-Amira ERP V2 — Comprehensive Pre-Integration Quality Acceptance', () => {
  const adminUser = MOCK_USERS.ADMIN
  const salesOperatorUser = MOCK_USERS.SALES_OPERATOR

  beforeEach(() => {
    mockDataService.resetToDefaults()
    auditLogger.clear()
  })

  // =========================================================================
  // SCENARIO 1: Complete Product Lifecycle, Stock Deduction & Restoration Cycle
  // =========================================================================
  describe('1. Business Logic Integrity: 50 -> 35 -> 50 Lifecycle with Idempotency', () => {
    it('creates product with 50 units initial stock, deducts 15 on invoice approval, and restores to 50 on cancellation', async () => {
      // Step A: Sales Operator creates product with opening_quantity = 50
      const createdProduct = await mockDataService.createProduct(
        {
          name: 'صفيحة عسل نحل فندقي سدر 50 كجم',
          sku: 'ACC-HONEY-50',
          category: 'عسل نحل',
          unit: 'صفيحة',
          allows_decimal_quantity: false,
          purchase_price: 0, // Sales operator cannot set purchase price
          selling_price: 1200,
          opening_quantity: 50,
          min_stock_level: 10,
          description: 'منتج اختبار قبول الجودة الشامل V2',
        },
        salesOperatorUser
      )

      expect(createdProduct.id).toBeDefined()
      expect(createdProduct.current_stock).toBe(50)
      expect(createdProduct.currentStock).toBe(50)

      // Verify audit log recorded initial stock
      const productAudit = auditLogger
        .getAll()
        .find((l) => l.action === 'PRODUCT_CREATE' && l.entity_id === createdProduct.id)
      expect(productAudit).toBeDefined()
      expect(productAudit?.details?.initial_stock).toBe(50)

      // Step B: Sales Operator creates sales invoice for 15 units
      const customers = await mockDataService.getCustomers()
      const customer = customers[0]

      const invoicePayload: SalesInvoiceFormData = {
        invoice_date: new Date().toISOString().split('T')[0],
        customer_id: customer.id,
        invoice_discount_type: 'none',
        invoice_discount_value: 0,
        additional_charges: 0,
        payment_terms: 'cash',
        notes: 'فاتورة فحص قبول الجودة - خصم 15 وحدة',
        items: [
          {
            product_id: createdProduct.id,
            quantity: 15,
            unit_price: 1200,
          },
        ],
        action: 'approve', // direct approval upon creation
      }

      const approvedInvoice = await mockDataService.createInvoice(invoicePayload, salesOperatorUser)
      expect(approvedInvoice.status).toBe('approved')
      expect(approvedInvoice.final_total).toBe(15 * 1200)

      // Check stock deducted accurately to 35
      const productAfterApproval = await mockDataService.getProductById(createdProduct.id)
      expect(productAfterApproval?.current_stock).toBe(35)

      // Check movements audit log has 'sale' movement with quantity_out: 15
      const movements = await mockDataService.getInventoryMovements()
      const saleMovement = movements.find(
        (m) => m.product_id === createdProduct.id && m.movement_type === 'sale'
      )
      expect(saleMovement).toBeDefined()
      expect(saleMovement?.quantity_out).toBe(15)
      expect(saleMovement?.stock_balance_after).toBe(35)

      // Step C: Idempotency Check - Attempting repeated approval throws an error
      await expect(
        mockDataService.approveInvoice(approvedInvoice.id, salesOperatorUser)
      ).rejects.toThrow(/معتمدة مسبقاً/)

      // Stock remains exactly 35 after blocked repeated approval
      const productAfterRepeatedApproval = await mockDataService.getProductById(createdProduct.id)
      expect(productAfterRepeatedApproval?.current_stock).toBe(35)

      // Step D: Insufficient Stock Check - Attempting to approve 40 units when 35 available fails
      const excessInvoicePayload: SalesInvoiceFormData = {
        invoice_date: new Date().toISOString().split('T')[0],
        customer_id: customer.id,
        invoice_discount_type: 'none',
        invoice_discount_value: 0,
        additional_charges: 0,
        items: [
          {
            product_id: createdProduct.id,
            quantity: 40, // 40 > 35
            unit_price: 1200,
          },
        ],
        action: 'draft',
      }
      const excessDraft = await mockDataService.createInvoice(excessInvoicePayload, salesOperatorUser)
      await expect(
        mockDataService.approveInvoice(excessDraft.id, salesOperatorUser)
      ).rejects.toThrow(/غير كاف/)

      // Stock still remains intact at 35
      const productAfterBlockedExcess = await mockDataService.getProductById(createdProduct.id)
      expect(productAfterBlockedExcess?.current_stock).toBe(35)

      // Step E: Invoice Cancellation restores stock from 35 back to 50
      const cancelledInvoice = await mockDataService.cancelApprovedInvoice(
        approvedInvoice.id,
        'مرتجع فحص القبول الشامل للاعتماد',
        salesOperatorUser
      )
      expect(cancelledInvoice.status).toBe('cancelled')
      expect(cancelledInvoice.cancel_reason).toBe('مرتجع فحص القبول الشامل للاعتماد')

      // Stock restored to 50
      const productAfterCancellation = await mockDataService.getProductById(createdProduct.id)
      expect(productAfterCancellation?.current_stock).toBe(50)

      // Check reversal movement logged
      const movementsAfterCancel = await mockDataService.getInventoryMovements()
      const reversalMovement = movementsAfterCancel.find(
        (m) => m.product_id === createdProduct.id && m.movement_type === 'reversal'
      )
      expect(reversalMovement).toBeDefined()
      expect(reversalMovement?.quantity_in).toBe(15)
      expect(reversalMovement?.stock_balance_after).toBe(50)

      // Step F: Idempotency Check - Attempting repeated cancellation throws an error
      await expect(
        mockDataService.cancelApprovedInvoice(
          approvedInvoice.id,
          'محاولة إلغاء مكررة',
          salesOperatorUser
        )
      ).rejects.toThrow(/لا يمكن إلغاء سوى الفواتير المعتمدة فقط/)

      // Stock remains exactly 50 after blocked repeated cancellation
      const productAfterRepeatedCancel = await mockDataService.getProductById(createdProduct.id)
      expect(productAfterRepeatedCancel?.current_stock).toBe(50)
    })

    it('rejects invalid inputs: negative quantity, empty cancel reason, and negative price', async () => {
      // 1. Negative initial stock
      await expect(
        mockDataService.createProduct(
          {
            name: 'منتج رصيد سالب',
            sku: 'NEG-01',
            category: 'عام',
            unit: 'قطعة',
            allows_decimal_quantity: false,
            purchase_price: 10,
            selling_price: 20,
            opening_quantity: -5,
            min_stock_level: 0,
          },
          adminUser
        )
      ).rejects.toThrow(/الرصيد الافتتاحي/)

      // 2. Negative selling price
      await expect(
        mockDataService.createProduct(
          {
            name: 'منتج سعر سالب',
            sku: 'NEG-PRC-01',
            category: 'عام',
            unit: 'قطعة',
            allows_decimal_quantity: false,
            purchase_price: 10,
            selling_price: -25,
            opening_quantity: 0,
            min_stock_level: 0,
          },
          adminUser
        )
      ).rejects.toThrow(/سعر البيع/)

      // 3. Empty cancellation reason on approved invoice
      const invoices = await mockDataService.getInvoices()
      const approvedInv = invoices.find((i) => i.status === 'approved')
      if (approvedInv) {
        await expect(
          mockDataService.cancelApprovedInvoice(approvedInv.id, '   ', adminUser)
        ).rejects.toThrow(/يجب كتابة سبب الإلغاء/)
      }
    })
  })

  // =========================================================================
  // SCENARIO 2: SALES_OPERATOR Role Restrictions & Dashboard Isolation
  // =========================================================================
  describe('2. SALES_OPERATOR RBAC & Dashboard Isolation', () => {
    it('restricts navigation for SALES_OPERATOR (hides suppliers, settings, audit)', () => {
      const navItems = getNavigationItemsForUser(salesOperatorUser)
      const hrefs = navItems.map((n) => n.href)

      expect(hrefs).toContain('/')
      expect(hrefs).toContain('/invoices')
      expect(hrefs).toContain('/products')
      expect(hrefs).toContain('/customers')
      expect(hrefs).not.toContain('/suppliers')
      expect(hrefs).not.toContain('/inventory')
      expect(hrefs).not.toContain('/reports')
      expect(hrefs).not.toContain('/settings')
      expect(hrefs).not.toContain('/audit-log')
    })

    it('denies route access to ADMIN-only paths for SALES_OPERATOR', () => {
      expect(canAccessRoute(salesOperatorUser, '/suppliers')).toBe(false)
      expect(canAccessRoute(salesOperatorUser, '/inventory')).toBe(false)
      expect(canAccessRoute(salesOperatorUser, '/reports')).toBe(false)
      expect(canAccessRoute(salesOperatorUser, '/settings')).toBe(false)
      expect(canAccessRoute(salesOperatorUser, '/audit-log')).toBe(false)
    })

    it('renders exactly three sections on the SALES_OPERATOR dashboard', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={salesOperatorUser}>
            <DashboardView />
          </AuthProvider>
        </MemoryRouter>
      )

      expect(await screen.findByText('لوحة تحكم مسؤول المبيعات')).toBeInTheDocument()

      // Section 1: Sales Invoices activity
      expect(screen.getByText('أحدث فواتير المبيعات')).toBeInTheDocument()

      // Section 2: Today's sales card
      expect(screen.getByText('مبيعات اليوم')).toBeInTheDocument()

      // Section 3: Recent movements (with no inventory link)
      expect(screen.getByText('حركات المخزن الأخيرة')).toBeInTheDocument()
      expect(screen.queryByText('عرض سجل الحركات')).not.toBeInTheDocument()

      // ADMIN-only widgets must NOT be rendered
      expect(screen.queryByText('إجمالي المبيعات')).not.toBeInTheDocument()
      expect(screen.queryByText('صافي الأرباح المحققة')).not.toBeInTheDocument()
      expect(screen.queryByText('قيمة المخزون بسعر الشراء')).not.toBeInTheDocument()
      expect(screen.queryByText('تنبيهات نواقص المخزون')).not.toBeInTheDocument()
    })

    it('hides exact stock numbers and cost prices from SALES_OPERATOR in UI components', () => {
      const mockProduct: Product = {
        id: 'p-secret',
        sku: 'SEC-01',
        code: 'SEC-01',
        name: 'منتج الفحص السري للأرصدة والتكلفة',
        category: 'عسل نحل',
        unit: 'برطمان',
        allows_decimal_quantity: false,
        purchase_price: 75,
        costPrice: 75,
        selling_price: 120,
        sellingPrice: 120,
        current_stock: 67,
        currentStock: 67,
        min_stock_level: 10,
        minStockLevel: 10,
        isLowStock: false,
        is_active: true,
      }

      // 1. ProductsTable as SALES_OPERATOR
      const { unmount: unmountTable } = render(
        <MemoryRouter>
          <AuthProvider initialUser={salesOperatorUser}>
            <ProductsTable
              products={[mockProduct]}
              onView={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </AuthProvider>
        </MemoryRouter>
      )

      expect(screen.queryByText('67')).not.toBeInTheDocument()
      expect(screen.queryByText('75 ج.م')).not.toBeInTheDocument()
      expect(screen.getByText('120 ج.م')).toBeInTheDocument()
      expect(screen.getByText('متوفر')).toBeInTheDocument()
      unmountTable()

      // 2. ProductDetailsModal as SALES_OPERATOR
      const { unmount: unmountModal } = render(
        <MemoryRouter>
          <AuthProvider initialUser={salesOperatorUser}>
            <ProductDetailsModal
              product={mockProduct}
              isOpen={true}
              onClose={() => {}}
              onEdit={() => {}}
            />
          </AuthProvider>
        </MemoryRouter>
      )

      expect(screen.queryByText('سعر الشراء / التكلفة')).not.toBeInTheDocument()
      expect(screen.queryByText('هامش الربح التقديري')).not.toBeInTheDocument()
      expect(screen.queryByText('67 برطمان')).not.toBeInTheDocument()
      expect(screen.getByText('متوفر للطلب والبيع')).toBeInTheDocument()
      unmountModal()

      // 3. ProductDetailsModal as ADMIN (exact stock & cost visible)
      render(
        <MemoryRouter>
          <AuthProvider initialUser={adminUser}>
            <ProductDetailsModal
              product={mockProduct}
              isOpen={true}
              onClose={() => {}}
              onEdit={() => {}}
            />
          </AuthProvider>
        </MemoryRouter>
      )

      expect(screen.getByText('سعر الشراء / التكلفة')).toBeInTheDocument()
      expect(screen.getByText('75 ج.م')).toBeInTheDocument()
      expect(screen.getAllByText(/67 برطمان/i).length).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // SCENARIO 3: Invoice Ownership & Isolation between Operators
  // =========================================================================
  describe('3. Multi-Operator Invoice Ownership & Action Guards', () => {
    const operator1 = MOCK_USERS.SALES_OPERATOR
    const operator2 = {
      id: 'mock-op-2',
      name: 'محمود أحمد - مندوب قنا',
      username: 'op_mahmoud',
      email: 'mahmoud@alamira.com',
      role: 'SALES_OPERATOR' as const,
      is_active: true,
    }

    it('enforces that operator can only edit or cancel their own invoices', async () => {
      const customers = await mockDataService.getCustomers()
      const products = await mockDataService.getProducts()

      // Operator 1 creates a draft invoice
      const draft1 = await mockDataService.createInvoice(
        {
          invoice_date: new Date().toISOString().split('T')[0],
          customer_id: customers[0].id,
          items: [{ product_id: products[0].id, quantity: 1, unit_price: products[0].selling_price }],
          action: 'draft',
        },
        operator1
      )

      // Operator 2 attempts to edit operator 1's draft -> rejected
      await expect(
        mockDataService.updateDraftInvoice(
          draft1.id,
          {
            invoice_date: new Date().toISOString().split('T')[0],
            customer_id: customers[0].id,
            items: [{ product_id: products[0].id, quantity: 2, unit_price: products[0].selling_price }],
          },
          operator2
        )
      ).rejects.toThrow(/غير مصرح/)

      // Operator 1 can edit their own draft
      const updatedDraft = await mockDataService.updateDraftInvoice(
        draft1.id,
        {
          invoice_date: new Date().toISOString().split('T')[0],
          customer_id: customers[0].id,
          items: [{ product_id: products[0].id, quantity: 2, unit_price: products[0].selling_price }],
        },
        operator1
      )
      expect(updatedDraft.items?.[0].quantity).toBe(2)

      // Operator 1 approves their own invoice
      const approved1 = await mockDataService.approveInvoice(draft1.id, operator1)
      expect(approved1.status).toBe('approved')

      // Operator 2 attempts to cancel operator 1's approved invoice -> rejected
      await expect(
        mockDataService.cancelApprovedInvoice(approved1.id, 'محاولة إلغاء غير مصرح بها', operator2)
      ).rejects.toThrow(/غير مصرح/)

      // Operator 1 can cancel their own approved invoice
      const cancelled = await mockDataService.cancelApprovedInvoice(
        approved1.id,
        'إلغاء مشروع من صاحب الفاتورة',
        operator1
      )
      expect(cancelled.status).toBe('cancelled')
    })
  })

  // =========================================================================
  // SCENARIO 4: Admin Capabilities, Qena Timezone & Audit Log
  // =========================================================================
  describe('4. ADMIN Verification: Full Dashboard, Audit Log & Official Qena Timezone', () => {
    it('renders full executive dashboard with 4 KPIs and Sales Trend for ADMIN', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={adminUser}>
            <DashboardView />
          </AuthProvider>
        </MemoryRouter>
      )

      expect(await screen.findByText('نظرة عامة على النشاط التجاري')).toBeInTheDocument()
      expect(screen.getByText('مبيعات اليوم')).toBeInTheDocument()
      expect(screen.getByText('إجمالي المبيعات')).toBeInTheDocument()
      expect(screen.getByText('أصناف المخزون')).toBeInTheDocument()
      expect(screen.getByText('نواقص المخزون')).toBeInTheDocument()
      expect(screen.getByText('مؤشر المبيعات الأسبوعي')).toBeInTheDocument()
    })

    it('verifies Qena timezone constant is Africa/Cairo with exact Arabic label', () => {
      expect(QENA_TIMEZONE).toBe('Africa/Cairo')
      expect(QENA_TIMEZONE_LABEL).toBe('بتوقيت قنا – مصر')
    })

    it('renders simplified audit log for Super Admin displaying Qena timezone badge', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={adminUser}>
            <AuditLogView />
          </AuthProvider>
        </MemoryRouter>
      )

      expect(await screen.findByText('سجل النشاط والرقابة')).toBeInTheDocument()
      expect(screen.getByText(/بتوقيت قنا – مصر/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('ابحث برقم المستند، المنفّذ، السبب...')).toBeInTheDocument()
    })
  })
})
