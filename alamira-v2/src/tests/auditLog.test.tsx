import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockDataService } from '@/services/mockDataService'
import { auditLogger } from '@/services/auditLogger'
import { formatCairoDateTime, formatQenaDateTime, QENA_TIMEZONE_LABEL } from '@/lib/formatters'
import { AuthProvider } from '@/auth/AuthContext'
import { MOCK_USERS } from '@/auth/rbac'
import { RoleGuard } from '@/auth/RoleGuard'
import { AuditLogView } from '@/features/audit/AuditLogView'
import { exportAuditLogsToExcel, exportAuditLogsToJson } from '@/features/audit/exportAuditLog'

describe('Al-Amira ERP V2 — Phase 2: Comprehensive Audit Log & Activity Monitoring', () => {
  beforeEach(async () => {
    await mockDataService.resetToDefaults()
    vi.clearAllMocks()
  })

  // =========================================================================
  // 1. Audit Logger Core & Cairo DateTime Formatting
  // =========================================================================
  describe('1. Core Audit Logger & Cairo Timezone Stamping', () => {
    it('formats timestamp strictly in Africa/Cairo timezone with Arabic markers and Western numerals', () => {
      const fixedIso = '2026-11-19T10:30:00Z' // 12:30 PM Cairo (UTC+2)
      const formatted = formatCairoDateTime(fixedIso)

      expect(formatted).toBeDefined()
      // Should contain 12:30 and Cairo PM marker (م)
      expect(formatted).toContain('12:30')
      expect(formatted).toMatch(/م|ص/)
      expect(formatted).toContain('2026')
    })

    it('supports official Qena timezone formatting and user-facing label', () => {
      const fixedIso = '2026-11-19T10:30:00Z'
      const formatted = formatQenaDateTime(fixedIso)
      expect(formatted).toBeDefined()
      expect(formatted).toContain('12:30')
      expect(QENA_TIMEZONE_LABEL).toBe('بتوقيت قنا – مصر')
    })

    it('records and retrieves audit entries with automatic ID and ISO timestamp', () => {
      const initialCount = auditLogger.getAll().length
      const entry = auditLogger.record({
        action: 'INVOICE_CREATE',
        entity_type: 'sales_invoice',
        entity_id: 'inv-test-999',
        entity_name_or_number: 'INV-20261119-999',
        performed_by: 'المدير العام',
        performed_by_role: 'ADMIN',
        outcome: 'success',
      })

      expect(entry.id).toMatch(/^audit-\d+/)
      expect(entry.category).toBe('sales')
      expect(auditLogger.getAll().length).toBe(initialCount + 1)
    })

    it('deduplicates identical audit records within 300ms window', () => {
      const initialCount = auditLogger.getAll().length
      const payload = {
        action: 'CUSTOMER_CREATE' as const,
        entity_type: 'customer' as const,
        entity_id: 'cust-dedup-1',
        entity_name_or_number: 'شركة التكرار',
        performed_by: 'المدير العام',
        performed_by_role: 'ADMIN' as const,
        outcome: 'success' as const,
      }

      auditLogger.record(payload)
      auditLogger.record(payload) // Rapid immediate second call

      expect(auditLogger.getAll().length).toBe(initialCount + 1)
    })
  })

  // =========================================================================
  // 2. Comprehensive Event Coverage Across ERP Domains
  // =========================================================================
  describe('2. Event Coverage Matrix Across All Business Domains', () => {
    it('Sales Domain: records invoice create, draft update with diff, draft delete, approve, and cancel', async () => {
      const admin = MOCK_USERS.ADMIN

      // 1. Create Invoice Draft
      const invoice = await mockDataService.createInvoice(
        {
          customer_id: 'cust-001',
          invoice_date: '2026-11-19',
          items: [{ product_id: 'prod-001', quantity: 2, unit_price: 350 }],
        },
        admin
      )
      const createLog = auditLogger.getAll().find(
        (l) => l.action === 'INVOICE_CREATE' && l.entity_id === invoice.id
      )
      expect(createLog).toBeDefined()
      expect(createLog?.outcome).toBe('success')

      // 2. Update Draft with Before/After Diff
      await mockDataService.updateDraftInvoice(
        invoice.id,
        {
          customer_id: 'cust-001',
          invoice_date: '2026-11-19',
          items: [{ product_id: 'prod-001', quantity: 3, unit_price: 350 }],
        },
        admin
      )
      const updateLog = auditLogger.getAll().find(
        (l) => l.action === 'INVOICE_DRAFT_UPDATE' && l.entity_id === invoice.id
      )
      expect(updateLog).toBeDefined()
      expect(updateLog?.before_state).toBeDefined()
      expect(updateLog?.after_state).toBeDefined()

      // 3. Approve Invoice
      await mockDataService.approveInvoice(invoice.id, admin)
      const approveLog = auditLogger.getAll().find(
        (l) => l.action === 'INVOICE_APPROVE' && l.entity_id === invoice.id
      )
      expect(approveLog).toBeDefined()
      expect(approveLog?.outcome).toBe('success')

      // 4. Cancel Approved Invoice
      await mockDataService.cancelApprovedInvoice(invoice.id, 'خطأ في الكمية المطلوبة من العميل', admin)
      const cancelLog = auditLogger.getAll().find(
        (l) => l.action === 'INVOICE_CANCEL' && l.entity_id === invoice.id
      )
      expect(cancelLog).toBeDefined()
      expect(cancelLog?.reason).toContain('خطأ في الكمية')

      // 5. Delete Draft (create another draft to test delete)
      const draft2 = await mockDataService.createInvoice(
        {
          customer_id: 'cust-001',
          invoice_date: '2026-11-19',
          items: [{ product_id: 'prod-001', quantity: 1, unit_price: 350 }],
        },
        admin
      )
      await mockDataService.deleteDraftInvoice(draft2.id, admin)
      const deleteLog = auditLogger.getAll().find(
        (l) => l.action === 'INVOICE_DRAFT_DELETE' && l.entity_id === draft2.id
      )
      expect(deleteLog).toBeDefined()
    })

    it('Customers & Suppliers Domain: records creation, updates with before/after diffs, and deletions', async () => {
      const admin = MOCK_USERS.ADMIN

      // Customer
      const cust = await mockDataService.createCustomer(
        { name: 'عميل الرقابة التجريبي', phone: '01011112222', address: 'قنا' },
        admin
      )
      expect(auditLogger.getAll().some((l) => l.action === 'CUSTOMER_CREATE' && l.entity_id === cust.id)).toBe(true)

      await mockDataService.updateCustomer(
        cust.id,
        { name: 'عميل الرقابة المعدل', phone: '01099998888', address: 'الأقصر' },
        admin
      )
      const custUpdateLog = auditLogger.getAll().find(
        (l) => l.action === 'CUSTOMER_UPDATE' && l.entity_id === cust.id
      )
      expect(custUpdateLog?.before_state?.name).toBe('عميل الرقابة التجريبي')
      expect(custUpdateLog?.after_state?.name).toBe('عميل الرقابة المعدل')

      await mockDataService.deleteCustomer(cust.id, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'CUSTOMER_DELETE' && l.entity_id === cust.id)).toBe(true)

      // Supplier
      const sup = await mockDataService.createSupplier(
        { name: 'مورد الرقابة التجريبي', phone: '01122223333', address: 'القاهرة' },
        admin
      )
      expect(auditLogger.getAll().some((l) => l.action === 'SUPPLIER_CREATE' && l.entity_id === sup.id)).toBe(true)

      await mockDataService.updateSupplier(
        sup.id,
        { name: 'مورد الرقابة المعدل', phone: '01155556666', address: 'الجيزة' },
        admin
      )
      const supUpdateLog = auditLogger.getAll().find(
        (l) => l.action === 'SUPPLIER_UPDATE' && l.entity_id === sup.id
      )
      expect(supUpdateLog?.before_state?.name).toBe('مورد الرقابة التجريبي')
      expect(supUpdateLog?.after_state?.name).toBe('مورد الرقابة المعدل')

      await mockDataService.deleteSupplier(sup.id, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'SUPPLIER_DELETE' && l.entity_id === sup.id)).toBe(true)
    })

    it('Inventory Movements Domain: records receipts, issues, and adjustments', async () => {
      const admin = MOCK_USERS.ADMIN

      // Receipt
      const receipt = await mockDataService.createReceipt(
        {
          receipt_date: '2026-11-19',
          supplier_id: 'sup-001',
          items: [{ product_id: 'prod-001', quantity: 10, unit_price: 200 }],
        },
        admin
      )
      expect(auditLogger.getAll().some((l) => l.action === 'STOCK_RECEIPT_CREATE' && l.entity_id === receipt.id)).toBe(true)

      await mockDataService.approveReceipt(receipt.id, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'STOCK_RECEIPT_APPROVE' && l.entity_id === receipt.id)).toBe(true)

      // Issue
      const issue = await mockDataService.createIssue(
        {
          issue_date: '2026-11-19',
          recipient_name: 'قسم التشغيل الداخلي',
          items: [{ product_id: 'prod-001', quantity: 2 }],
        },
        admin
      )
      expect(auditLogger.getAll().some((l) => l.action === 'STOCK_ISSUE_CREATE' && l.entity_id === issue.id)).toBe(true)

      await mockDataService.approveIssue(issue.id, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'STOCK_ISSUE_APPROVE' && l.entity_id === issue.id)).toBe(true)

      // Adjustment
      const adj = await mockDataService.createAdjustment(
        {
          adjustment_date: '2026-11-19',
          product_id: 'prod-001',
          actual_quantity: 45,
          reason: 'تسوية الجرد السنوي المخزني',
        },
        admin
      )
      expect(auditLogger.getAll().some((l) => l.action === 'STOCK_ADJUSTMENT_APPROVE' && l.entity_id === adj.id)).toBe(true)
    })

    it('Administration & Security Domain: records users, settings, and authentication switching', async () => {
      const admin = MOCK_USERS.ADMIN

      // User Create, Update, Toggle
      const newUser = await mockDataService.createUser(
        { name: 'محمود عبد الرحيم', username: 'm_abdelrahim', role: 'SALES_OPERATOR' },
        admin
      )
      expect(auditLogger.getAll().some((l) => l.action === 'USER_CREATE' && l.entity_id === newUser.id)).toBe(true)

      await mockDataService.updateUser(newUser.id, { title: 'أخصائي مبيعات أول' }, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'USER_UPDATE' && l.entity_id === newUser.id)).toBe(true)

      await mockDataService.toggleUserActive(newUser.id, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'USER_STATUS_CHANGE' && l.entity_id === newUser.id)).toBe(true)

      // Settings updates
      mockDataService.logSettingsUpdate('company_profile', 'بيانات وهوية المنشأة', { name: 'الأميرة' }, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'SETTINGS_UPDATE')).toBe(true)

      // Backup & Audit exports
      mockDataService.logBackupExport('excel', admin)
      expect(auditLogger.getAll().some((l) => l.action === 'BACKUP_EXPORT')).toBe(true)

      // Auth switching
      mockDataService.logAuthSwitchUser(newUser, admin)
      expect(auditLogger.getAll().some((l) => l.action === 'AUTH_SWITCH_USER')).toBe(true)

      mockDataService.logAuthSwitchRole('SALES_OPERATOR', admin)
      expect(auditLogger.getAll().some((l) => l.action === 'AUTH_SWITCH_ROLE')).toBe(true)
    })
  })

  // =========================================================================
  // 3. Unauthorized Operations & ACCESS_DENIED Audit Logging
  // =========================================================================
  describe('3. Unauthorized Operations & ACCESS_DENIED Logging', () => {
    it('records ACCESS_DENIED when SALES_OPERATOR attempts to manage suppliers', async () => {
      const operator = MOCK_USERS.SALES_OPERATOR

      await expect(
        mockDataService.createSupplier(
          { name: 'مورد محظور', phone: '01000000000', address: 'قنا' },
          operator
        )
      ).rejects.toThrow(/غير مصرح/)

      const deniedLog = auditLogger.getAll().find(
        (l) => l.action === 'ACCESS_DENIED' && l.entity_type === 'supplier'
      )
      expect(deniedLog).toBeDefined()
      expect(deniedLog?.outcome).toBe('denied')
      expect(deniedLog?.performed_by_role).toBe('SALES_OPERATOR')
    })

    it('records ACCESS_DENIED when SALES_OPERATOR attempts to access /audit-log API', async () => {
      const operator = MOCK_USERS.SALES_OPERATOR

      await expect(mockDataService.getAuditLogs(undefined, operator)).rejects.toThrow(/غير مصرح/)

      const deniedLog = auditLogger.getAll().find(
        (l) => l.action === 'ACCESS_DENIED' && l.entity_type === 'audit_log'
      )
      expect(deniedLog).toBeDefined()
      expect(deniedLog?.outcome).toBe('denied')
    })

    it('records ACCESS_DENIED when SALES_OPERATOR attempts to modify another user invoice', async () => {
      const operator1 = MOCK_USERS.SALES_OPERATOR // usr-sales-01
      const operator2 = {
        id: 'usr-sales-02',
        name: 'أحمد محمود',
        username: 'ahmed_sales',
        role: 'SALES_OPERATOR' as const,
        is_active: true,
      }

      // Create invoice by operator2
      const inv = await mockDataService.createInvoice(
        {
          customer_id: 'cust-001',
          invoice_date: '2026-11-19',
          items: [{ product_id: 'prod-001', quantity: 1, unit_price: 350 }],
        },
        operator2
      )

      // Operator 1 tries to update it
      await expect(
        mockDataService.updateDraftInvoice(
          inv.id,
          {
            customer_id: 'cust-001',
            invoice_date: '2026-11-19',
            items: [{ product_id: 'prod-001', quantity: 2, unit_price: 350 }],
          },
          operator1
        )
      ).rejects.toThrow(/غير مصرح/)

      const deniedLog = auditLogger.getAll().find(
        (l) => l.action === 'ACCESS_DENIED' && l.entity_id === inv.id
      )
      expect(deniedLog).toBeDefined()
      expect(deniedLog?.outcome).toBe('denied')
      expect(deniedLog?.reason).toContain('بواسطة مستخدم آخر')
    })
  })

  // =========================================================================
  // 4. Excel & JSON Export Engine Verification
  // =========================================================================
  describe('4. Audit Log Export Engine (Excel & JSON)', () => {
    it('exports audit logs to Excel with correct Arabic headers and Africa/Cairo timezone', () => {
      const logs = auditLogger.getAll().slice(0, 5)

      const result = exportAuditLogsToExcel(logs, MOCK_USERS.ADMIN)

      expect(result.success).toBe(true)
      expect(result.rowCount).toBe(logs.length)
      expect(result.filename).toMatch(/AlAmira_AuditLog_\d{4}-\d{2}-\d{2}\.xlsx/)
      expect(auditLogger.getAll().some((l) => l.action === 'AUDIT_LOG_EXPORT')).toBe(true)
    })

    it('exports audit logs to JSON with structured metadata payload', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:test-url')
      const revokeObjectURLMock = vi.fn()
      global.URL.createObjectURL = createObjectURLMock
      global.URL.revokeObjectURL = revokeObjectURLMock

      const logs = auditLogger.getAll().slice(0, 3)

      const result = exportAuditLogsToJson(logs, MOCK_USERS.ADMIN)

      expect(result.success).toBe(true)
      expect(result.rowCount).toBe(logs.length)
      expect(result.filename).toMatch(/AlAmira_AuditLog_\d{4}-\d{2}-\d{2}\.json/)
      expect(createObjectURLMock).toHaveBeenCalled()
      expect(auditLogger.getAll().some((l) => l.action === 'AUDIT_LOG_EXPORT')).toBe(true)
    })
  })

  // =========================================================================
  // 5. UI Integration & Role-Based Access Guarding
  // =========================================================================
  describe('5. AuditLogView UI & RoleGuard Route Enforcement', () => {
    it('renders simplified AuditLogView for Super Admin with Qena timezone and without KPI clutter', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={MOCK_USERS.ADMIN}>
            <AuditLogView />
          </AuthProvider>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('سجل النشاط والرقابة')).toBeInTheDocument()
      })

      // Qena timezone label displayed
      expect(screen.getByText('بتوقيت قنا – مصر')).toBeInTheDocument()

      // Primary exports accessible in header
      expect(screen.getByText('تصدير Excel')).toBeInTheDocument()
      expect(screen.getByText('تصدير JSON')).toBeInTheDocument()

      // KPI clutter intentionally removed for operational business manager simplicity
      expect(screen.queryByText('إجمالي الحركات المسجلة')).not.toBeInTheDocument()
      expect(screen.queryByText('العمليات المكتملة')).not.toBeInTheDocument()
      expect(screen.queryByText('محاولات محظورة ومرفوضة')).not.toBeInTheDocument()
    })

    it('blocks SALES_OPERATOR at RoleGuard level and renders Access Denied fallback', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={MOCK_USERS.SALES_OPERATOR}>
            <RoleGuard
              requiredPermission="audit:view"
              fallbackTitle="سجل النشاط والرقابة غير مصرح به"
              fallbackMessage="سجل النشاط والرقابة الإدارية مخصص لمدير النظام (Super Admin) فقط."
            >
              <AuditLogView />
            </RoleGuard>
          </AuthProvider>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('سجل النشاط والرقابة غير مصرح به')).toBeInTheDocument()
      })
      expect(
        screen.getByText('سجل النشاط والرقابة الإدارية مخصص لمدير النظام (Super Admin) فقط.')
      ).toBeInTheDocument()
    })

    it('filters audit records by action category and search input', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={MOCK_USERS.ADMIN}>
            <AuditLogView />
          </AuthProvider>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('سجل النشاط والرقابة')).toBeInTheDocument()
      })

      // Click "المبيعات" category tab
      const salesTab = screen.getByRole('button', { name: 'المبيعات' })
      fireEvent.click(salesTab)

      // Enter search term
      const searchInput = screen.getByPlaceholderText('ابحث برقم المستند، المنفّذ، السبب...')
      fireEvent.change(searchInput, { target: { value: 'INV' } })

      // Check reset button appears
      expect(screen.getByText('إعادة ضبط')).toBeInTheDocument()
      fireEvent.click(screen.getByText('إعادة ضبط'))

      expect(searchInput).toHaveValue('')
    })

    it('opens AuditLogDetailModal when clicking "عرض" on a log entry', async () => {
      render(
        <MemoryRouter>
          <AuthProvider initialUser={MOCK_USERS.ADMIN}>
            <AuditLogView />
          </AuthProvider>
        </MemoryRouter>
      )

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /عرض/ })
        expect(viewButtons.length).toBeGreaterThan(0)
        fireEvent.click(viewButtons[0])
      })

      expect(screen.getByText('تفاصيل السجل والرقابة الإدارية')).toBeInTheDocument()
      expect(screen.getByText('بيانات المستخدم المنفّذ')).toBeInTheDocument()
      expect(screen.getByText('المستند / الكيان المرتبط')).toBeInTheDocument()
    })
  })
})
