import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsView } from '@/features/settings'
import { UserManagementSection } from '@/features/settings/UserManagementSection'
import { mockDataService } from '@/services/mockDataService'
import { auditLogger } from '@/services/auditLogger'
import { AuthProvider } from '@/auth/AuthContext'
import { User, SalesInvoiceFormData } from '@/types'
import {
  hasPermission,
  canCancelInvoice,
  canCreateCustomer,
  canEditCustomer,
  canDeleteCustomer,
  canManageSuppliers,
  canViewCostPrice,
  canViewExactStock,
} from '@/auth/rbac'

describe('Al-Amira ERP V2 — Phase 1 RBAC & User Management', () => {
  const adminUser: User = {
    id: 'usr-admin-01',
    name: 'المدير العام',
    username: 'admin',
    role: 'ADMIN',
    title: 'مدير النظام (كامل الصلاحيات)',
    is_active: true,
  }

  const salesOperatorUser: User = {
    id: 'usr-sales-01',
    name: 'مسؤول المبيعات',
    username: 'sales_operator',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  }

  const otherOperatorUser: User = {
    id: 'usr-sales-02',
    name: 'أحمد محمود',
    username: 'ahmed_sales',
    role: 'SALES_OPERATOR',
    title: 'مندوب مبيعات خارجي',
    is_active: true,
  }

  const inactiveUser: User = {
    id: 'usr-inactive-01',
    name: 'سمير خليل',
    username: 'samir_k',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات سابق (معطل)',
    is_active: false,
  }

  beforeEach(() => {
    mockDataService.resetToDefaults()
    auditLogger.clear()
  })

  describe('1. User Management Screen & Tab Integration', () => {
    it('renders User Management tab in SettingsView and displays development disclaimer banner', async () => {
      render(
        <AuthProvider initialUser={adminUser}>
          <SettingsView defaultTab="users" />
        </AuthProvider>
      )

      // Tab button is visible
      expect(
        screen.getByRole('button', { name: /إدارة المستخدمين والصلاحيات \(محاكاة\)/i })
      ).toBeInTheDocument()

      // Simulation disclaimer banner is visible
      expect(
        screen.getByText(/محاكاة تشغيلية لإدارة المستخدمين والأدوار \(Development Simulation Only\)/i)
      ).toBeInTheDocument()

      // Current mock user card is rendered
      expect(screen.getAllByText('المدير العام').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/المستخدم الحالي في جلسة العمل/i)).toBeInTheDocument()
    })

    it('renders list of mock users with their names, roles, and active statuses', async () => {
      render(
        <AuthProvider initialUser={adminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getAllByText('المدير العام').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('مسؤول المبيعات').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('أحمد محمود')).toBeInTheDocument()
        expect(screen.getByText('سمير خليل')).toBeInTheDocument()
      })

      // Check role labels and status badges
      expect(screen.getByText('مدير النظام (Admin)')).toBeInTheDocument()
      expect(screen.getAllByText('مسؤول مبيعات (Sales)').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('نشط').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('معطل')).toBeInTheDocument()
    })

    it('allows searching and filtering mock users by name or username', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider initialUser={adminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('أحمد محمود')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/بحث بالاسم أو اسم الدخول/i)
      await user.type(searchInput, 'أحمد')

      expect(screen.getByText('أحمد محمود')).toBeInTheDocument()
      expect(screen.queryByText('سمير خليل')).not.toBeInTheDocument()
    })

    it('adds a new mock user and prevents duplicate usernames', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider initialUser={adminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('أحمد محمود')).toBeInTheDocument()
      })

      // Open Add Modal
      await user.click(screen.getByRole('button', { name: /إضافة مستخدم تجريبي/i }))
      expect(screen.getByText('إضافة مستخدم تجريبي جديد')).toBeInTheDocument()

      // Fill Form with duplicate username 'admin'
      await user.type(screen.getByLabelText(/اسم المستخدم بالكامل/i), 'طارق العبد')
      await user.type(screen.getByLabelText(/اسم الدخول \(Username\)/i), 'admin')
      await user.click(screen.getByRole('button', { name: 'إضافة المستخدم' }))

      // Should show duplicate error
      await waitFor(() => {
        expect(screen.getByText(/مسجل بالفعل لمستخدم آخر/i)).toBeInTheDocument()
      })

      // Change username to unique
      const usernameInput = screen.getByLabelText(/اسم الدخول \(Username\)/i)
      await user.clear(usernameInput)
      await user.type(usernameInput, 'tarek_sales')
      await user.click(screen.getByRole('button', { name: 'إضافة المستخدم' }))

      // User is created and rendered
      await waitFor(() => {
        expect(screen.getByText('طارق العبد')).toBeInTheDocument()
      })

      // Verify audit log for USER_CREATE
      const logs = auditLogger.getByAction('USER_CREATE')
      expect(logs.length).toBe(1)
      expect(logs[0].entity_name_or_number).toBe('طارق العبد')
    })

    it('edits an existing mock user information and role', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider initialUser={adminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('أحمد محمود')).toBeInTheDocument()
      })

      // Find edit button for Ahmed Mahmoud
      const editButtons = screen.getAllByTitle('تعديل بيانات المستخدم والدور')
      await user.click(editButtons[2]) // Ahmed Mahmoud is 3rd user

      expect(screen.getByText('تعديل بيانات المستخدم التجريبي')).toBeInTheDocument()

      const titleInput = screen.getByLabelText(/المسمى الوظيفي/i)
      await user.clear(titleInput)
      await user.type(titleInput, 'مدير مبيعات إقليمي')
      await user.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

      await waitFor(() => {
        expect(screen.getByText('مدير مبيعات إقليمي')).toBeInTheDocument()
      })

      const logs = auditLogger.getByAction('USER_UPDATE')
      expect(logs.length).toBe(1)
    })

    it('toggles user active/inactive status and records USER_STATUS_CHANGE', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider initialUser={adminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('أحمد محمود')).toBeInTheDocument()
      })

      // Toggle Ahmed Mahmoud (currently active -> inactive)
      const toggleButtons = screen.getAllByTitle(/الحساب/)
      await user.click(toggleButtons[2])

      await waitFor(() => {
        expect(auditLogger.getByAction('USER_STATUS_CHANGE').length).toBe(1)
      })
    })

    it('switches current user simulation when clicking "تبديل إليه"', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider initialUser={adminUser}>
          <UserManagementSection />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /تبديل إليه/i }).length).toBeGreaterThanOrEqual(1)
      })

      const switchButtons = screen.getAllByRole('button', { name: /تبديل إليه/i })
      await user.click(switchButtons[0]) // First non-current is Sales Operator

      // Top selected user card now displays Sales Operator
      await waitFor(() => {
        expect(screen.getByText(/مسؤول مبيعات \(صلاحيات مخصصة\)|صلاحيات مبيعات مقيدة/i)).toBeInTheDocument()
      })
    })
  })

  describe('2. Inactive User Prevention (UI & Service Enforcement)', () => {
    it('revokes all permissions when user is inactive (is_active === false)', () => {
      expect(hasPermission(inactiveUser, 'invoices:create')).toBe(false)
      expect(hasPermission(inactiveUser, 'invoices:approve')).toBe(false)
      expect(hasPermission(inactiveUser, 'invoices:cancel_own')).toBe(false)
      expect(hasPermission(inactiveUser, 'customers:create')).toBe(false)
      expect(hasPermission(inactiveUser, 'route:dashboard')).toBe(false)

      expect(canCreateCustomer(inactiveUser)).toBe(false)
      expect(canDeleteCustomer(inactiveUser)).toBe(false)
      expect(canManageSuppliers(inactiveUser)).toBe(false)
      expect(canViewCostPrice(inactiveUser)).toBe(false)
      expect(canViewExactStock(inactiveUser)).toBe(false)
      expect(canCancelInvoice(inactiveUser, { status: 'approved', created_by: inactiveUser.name })).toBe(false)
      expect(canEditCustomer(inactiveUser, { created_by: inactiveUser.name })).toBe(false)
    })

    it('rejects customer operations when initiated by an inactive user at the service level', async () => {
      const existingCustomer = (await mockDataService.getCustomers())[0]

      await expect(
        mockDataService.createCustomer(
          { name: 'عميل مرفوض', phone: '01000000000', address: 'قنا' },
          inactiveUser
        )
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)

      await expect(
        mockDataService.updateCustomer(
          existingCustomer.id,
          { name: 'تعديل عميل', phone: '01000000000', address: 'قنا' },
          inactiveUser
        )
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)

      await expect(
        mockDataService.deleteCustomer(existingCustomer.id, inactiveUser)
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)
    })

    it('rejects invoice operations when initiated by an inactive user at the service level', async () => {
      const products = await mockDataService.getProducts()
      const customers = await mockDataService.getCustomers()
      const existingInvoice = (await mockDataService.getInvoices())[0]

      const invoiceData: SalesInvoiceFormData = {
        customer_id: customers[0].id,
        invoice_date: '2026-11-19',
        action: 'draft',
        items: [
          {
            product_id: products[0].id,
            quantity: 2,
            unit_price: 150,
            discount_type: 'none',
            discount_value: 0,
          },
        ],
      }

      await expect(
        mockDataService.createInvoice(invoiceData, inactiveUser)
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)

      await expect(
        mockDataService.approveInvoice(existingInvoice.id, inactiveUser)
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)

      await expect(
        mockDataService.cancelApprovedInvoice(existingInvoice.id, 'سبب اختباري', inactiveUser)
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)

      await expect(
        mockDataService.deleteDraftInvoice(existingInvoice.id, inactiveUser)
      ).rejects.toThrow(/المستخدم معطل: لا يمكن للمستخدمين غير النشطين تنفيذ العمليات/i)
    })
  })

  describe('3. Complete Sales Operator End-to-End Workflow Verification', () => {
    it('executes full sales operator lifecycle: create customer -> create draft -> edit owned draft -> approve owned invoice -> cancel owned invoice with stock restoration', async () => {
      // 1. Create customer as sales operator
      const customer = await mockDataService.createCustomer(
        {
          name: 'شركة الصعيد للمقاولات الحديثة',
          phone: '01099887766',
          address: 'قنا - مجمع المحاكم',
        },
        salesOperatorUser
      )
      expect(customer.id).toBeDefined()
      expect(customer.created_by).toBe(salesOperatorUser.name)

      // 2. Create invoice draft
      const products = await mockDataService.getProducts()
      const targetProd = products[0]
      const initialStock = targetProd.current_stock

      const draftInvoice = await mockDataService.createInvoice(
        {
          customer_id: customer.id,
          invoice_date: '2026-11-19',
          action: 'draft',
          items: [
            {
              product_id: targetProd.id,
              quantity: 5,
              unit_price: 100,
              discount_type: 'none',
              discount_value: 0,
            },
          ],
        },
        salesOperatorUser
      )

      expect(draftInvoice.status).toBe('draft')
      expect(draftInvoice.created_by).toBe(salesOperatorUser.name)
      // Stock should not change on draft
      const prodAfterDraft = (await mockDataService.getProducts()).find((p) => p.id === targetProd.id)!
      expect(prodAfterDraft.current_stock).toBe(initialStock)

      // 3. Edit owned draft as sales operator
      const updatedDraft = await mockDataService.updateDraftInvoice(
        draftInvoice.id,
        {
          customer_id: customer.id,
          invoice_date: '2026-11-19',
          action: 'draft',
          notes: 'ملاحظة خاصة بالعميل',
          items: [
            {
              product_id: targetProd.id,
              quantity: 8,
              unit_price: 100,
              discount_type: 'none',
              discount_value: 0,
            },
          ],
        },
        salesOperatorUser
      )
      expect(updatedDraft.notes).toBe('ملاحظة خاصة بالعميل')
      expect(updatedDraft.final_total).toBe(800)

      // 4. Verify unowned draft cannot be edited by another sales operator
      await expect(
        mockDataService.updateDraftInvoice(
          draftInvoice.id,
          {
            customer_id: customer.id,
            invoice_date: '2026-11-19',
            action: 'draft',
            items: [
              {
                product_id: targetProd.id,
                quantity: 2,
                unit_price: 100,
              },
            ],
          },
          otherOperatorUser
        )
      ).rejects.toThrow(/غير مصرح: يمكن لمسؤول المبيعات تعديل مسودات الفواتير التي أنشأها بنفسه فقط/i)

      // 5. Approve owned invoice as sales operator
      const approvedInvoice = await mockDataService.approveInvoice(draftInvoice.id, salesOperatorUser)
      expect(approvedInvoice.status).toBe('approved')

      // Verify stock was deducted
      const prodAfterApproval = (await mockDataService.getProducts()).find((p) => p.id === targetProd.id)!
      expect(prodAfterApproval.current_stock).toBe(initialStock - 8)

      // Verify sale movement logged
      const movements = await mockDataService.getInventoryMovements()
      const saleMovement = movements.find((m) => m.source_doc_id === approvedInvoice.id && m.movement_type === 'sale')
      expect(saleMovement).toBeDefined()
      expect(saleMovement?.quantity_out).toBe(8)

      // 6. Verify unowned approved invoice cannot be cancelled by another sales operator
      await expect(
        mockDataService.cancelApprovedInvoice(
          approvedInvoice.id,
          'محاولة إلغاء غير مصرحة',
          otherOperatorUser
        )
      ).rejects.toThrow(/غير مصرح: يمكن لمسؤول المبيعات إلغاء الفواتير التي أنشأها بنفسه فقط/i)

      // 7. Cancel owned approved invoice as sales operator
      const cancelledInvoice = await mockDataService.cancelApprovedInvoice(
        approvedInvoice.id,
        'إلغاء لخطأ في الكمية المطلوبة بناء على طلب العميل',
        salesOperatorUser
      )
      expect(cancelledInvoice.status).toBe('cancelled')
      expect(cancelledInvoice.cancelled_by).toBe(salesOperatorUser.name)

      // 8. Verify stock is restored internally
      const prodAfterCancel = (await mockDataService.getProducts()).find((p) => p.id === targetProd.id)!
      expect(prodAfterCancel.current_stock).toBe(initialStock)

      // Verify reversal movement is logged
      const movementsAfterCancel = await mockDataService.getInventoryMovements()
      const reversalMovement = movementsAfterCancel.find(
        (m) => m.source_doc_id === approvedInvoice.id && m.movement_type === 'reversal'
      )
      expect(reversalMovement).toBeDefined()
      expect(reversalMovement?.quantity_in).toBe(8)
    })

    it('rejects deletion of unowned draft invoices by sales operator', async () => {
      const products = await mockDataService.getProducts()
      const customers = await mockDataService.getCustomers()

      // Create draft by admin
      const adminDraft = await mockDataService.createInvoice(
        {
          customer_id: customers[0].id,
          invoice_date: '2026-11-19',
          action: 'draft',
          items: [
            {
              product_id: products[0].id,
              quantity: 1,
              unit_price: 150,
            },
          ],
        },
        adminUser
      )

      // Attempt deletion by sales operator -> rejected
      await expect(
        mockDataService.deleteDraftInvoice(adminDraft.id, salesOperatorUser)
      ).rejects.toThrow(/غير مصرح: يمكن لمسؤول المبيعات حذف مسودات الفواتير التي أنشأها بنفسه فقط/i)

      // Deletion by owner/admin -> succeeds
      const deleted = await mockDataService.deleteDraftInvoice(adminDraft.id, adminUser)
      expect(deleted).toBe(true)
    })
  })

  describe('4. Audit Infrastructure Coverage', () => {
    it('verifies all expected regulatory audit log actions are tracked', async () => {
      const products = await mockDataService.getProducts()

      // Customer Create & Update
      const cust = await mockDataService.createCustomer(
        { name: 'عميل للتدقيق', phone: '01000000000', address: 'قنا' },
        adminUser
      )
      await mockDataService.updateCustomer(
        cust.id,
        { name: 'عميل مدقق', phone: '01000000000', address: 'قنا' },
        adminUser
      )

      // Invoice Create, Approve, Cancel
      const inv = await mockDataService.createInvoice(
        {
          customer_id: cust.id,
          invoice_date: '2026-11-19',
          action: 'draft',
          items: [{ product_id: products[0].id, quantity: 1, unit_price: 200 }],
        },
        adminUser
      )
      await mockDataService.approveInvoice(inv.id, adminUser)
      await mockDataService.cancelApprovedInvoice(inv.id, 'إلغاء تدقيقي', adminUser)

      // Supplier Create & Delete
      const sup = await mockDataService.createSupplier(
        { name: 'مورد تدقيق', phone: '01000000000', address: 'القاهرة' },
        adminUser
      )
      await mockDataService.deleteSupplier(sup.id, adminUser)

      // User Create & Status Change
      const usr = await mockDataService.createUser(
        { name: 'مستخدم تدقيق', username: 'audit_u', role: 'SALES_OPERATOR' },
        adminUser
      )
      await mockDataService.toggleUserActive(usr.id, adminUser)

      const allLogs = auditLogger.getAll()
      const recordedActions = allLogs.map((l) => l.action)

      expect(recordedActions).toContain('CUSTOMER_CREATE')
      expect(recordedActions).toContain('CUSTOMER_UPDATE')
      expect(recordedActions).toContain('INVOICE_CREATE')
      expect(recordedActions).toContain('INVOICE_APPROVE')
      expect(recordedActions).toContain('INVOICE_CANCEL')
      expect(recordedActions).toContain('SUPPLIER_CREATE')
      expect(recordedActions).toContain('SUPPLIER_DELETE')
      expect(recordedActions).toContain('USER_CREATE')
      expect(recordedActions).toContain('USER_STATUS_CHANGE')
    })
  })

  describe('5. Email Authentication Data Contract & Validation', () => {
    it('creates a user with valid email and enforces lowercase normalization', async () => {
      const created = await mockDataService.createUser(
        {
          name: 'طارق عبد الرحيم',
          username: 'tarek_sales',
          email: 'Tarek@Alamira.COM',
          role: 'SALES_OPERATOR',
        },
        adminUser
      )

      expect(created.email).toBe('tarek@alamira.com')
      expect(created.username).toBe('tarek_sales')
    })

    it('rejects user creation with invalid email format', async () => {
      await expect(
        mockDataService.createUser(
          {
            name: 'مستخدم خطأ',
            username: 'bad_email_user',
            email: 'not-an-email',
            role: 'SALES_OPERATOR',
          },
          adminUser
        )
      ).rejects.toThrow(/صيغة البريد الإلكتروني غير صالحة/i)
    })

    it('rejects duplicate email during user creation', async () => {
      // admin@alamira.com already belongs to admin
      await expect(
        mockDataService.createUser(
          {
            name: 'مستخدم مكرر',
            username: 'duplicate_email_user',
            email: 'admin@alamira.com',
            role: 'SALES_OPERATOR',
          },
          adminUser
        )
      ).rejects.toThrow(/البريد الإلكتروني.*مسجل بالفعل/i)
    })

    it('rejects duplicate email during user update', async () => {
      const users = await mockDataService.getUsers()
      const salesUser = users.find((u) => u.username === 'sales_operator')!

      await expect(
        mockDataService.updateUser(
          salesUser.id,
          { email: 'admin@alamira.com' },
          adminUser
        )
      ).rejects.toThrow(/البريد الإلكتروني.*مسجل بالفعل/i)
    })

    it('allows updating a user while keeping their own email', async () => {
      const users = await mockDataService.getUsers()
      const salesUser = users.find((u) => u.username === 'sales_operator')!

      const updated = await mockDataService.updateUser(
        salesUser.id,
        { title: 'مسؤول مبيعات أول', email: salesUser.email },
        adminUser
      )
      expect(updated.title).toBe('مسؤول مبيعات أول')
    })
  })
})
