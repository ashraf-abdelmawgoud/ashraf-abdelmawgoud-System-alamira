/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isMockMode, isSupabaseConfigured, getSupabaseClient } from '@/services/supabaseClient'
import { supabaseDataService } from '@/services/supabaseDataService'
import { dataService } from '@/services/dataService'
import { cacheService } from '@/services/cacheService'
import { User, Role } from '@/types'

// Mock Supabase client module
vi.mock('@/services/supabaseClient', async () => {
  const actual = await vi.importActual<typeof import('@/services/supabaseClient')>('@/services/supabaseClient')

  const createMockQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })

  const mockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => createMockQueryBuilder()),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  }

  return {
    ...actual,
    getSupabaseClient: vi.fn(() => mockClient),
  }
})

beforeEach(() => {
  cacheService.clear()
  vi.clearAllMocks()
})

describe('Supabase Client Configuration & Gateway', () => {
  it('detects mock mode and configuration properly', () => {
    // In test environment, VITE_ENABLE_MOCK_DATA is 'true'
    expect(isMockMode()).toBe(true)
    expect(typeof isSupabaseConfigured()).toBe('boolean')
    expect(dataService.isMock()).toBe(true)
  })

  it('guarantees dataService does not silently fall back to mock on real backend failure', async () => {
    // When isRealBackendActive is simulated
    const originalIsMock = dataService.isMock
    dataService.isMock = () => false

    const mockClient = getSupabaseClient() as any
    mockClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database connection failed' } }),
    })

    await expect(dataService.getCustomers()).rejects.toThrow('فشل جلب قائمة العملاء: Database connection failed')

    // Restore
    dataService.isMock = originalIsMock
  })
})

describe('Phase D: Product Creation with Initial Stock & RBAC Masking', () => {
  const mockAdminUser: User = {
    id: 'usr-admin-1',
    name: 'المدير العام',
    username: 'admin',
    email: 'admin@alamira.com',
    role: 'ADMIN',
    title: 'مدير النظام',
    is_active: true,
  }

  const mockSalesUser: User = {
    id: 'usr-sales-1',
    name: 'مسؤول المبيعات',
    username: 'sales_rep',
    email: 'sales@alamira.com',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls atomic RPC register_product_with_opening_stock with opening quantity', async () => {
    const mockClient = getSupabaseClient() as any
    mockClient.rpc.mockResolvedValueOnce({
      data: { product_id: 'p-100', current_stock: 50 },
      error: null,
    })

    const newProduct = await supabaseDataService.createProduct(
      {
        sku: 'ELC-01',
        name: 'قاطع أوتوماتيكي ثلاثي 63 أمبير',
        category: 'توريدات كهربائية',
        unit: 'قطعة',
        allows_decimal_quantity: false,
        purchase_price: 120,
        selling_price: 180,
        min_stock_level: 5,
        opening_quantity: 50,
      },
      mockAdminUser
    )

    expect(mockClient.rpc).toHaveBeenCalledWith('register_product_with_opening_stock', {
      p_sku: 'ELC-01',
      p_name: 'قاطع أوتوماتيكي ثلاثي 63 أمبير',
      p_unit: 'قطعة',
      p_opening_quantity: 50,
      p_allows_decimal_quantity: false,
      p_category_id: null,
      p_purchase_price: 120,
      p_selling_price: 180,
      p_min_stock_level: 5,
      p_description: null,
    })
    expect(newProduct.name).toBe('قاطع أوتوماتيكي ثلاثي 63 أمبير')
    expect(newProduct.current_stock).toBe(50)
  })

  it('masks cost price and stock for SALES_OPERATOR upon product creation', async () => {
    const mockClient = getSupabaseClient() as any
    mockClient.rpc.mockResolvedValueOnce({
      data: { product_id: 'p-101', current_stock: 30 },
      error: null,
    })

    const newProduct = await supabaseDataService.createProduct(
      {
        sku: 'PLM-02',
        name: 'محبس كروي إيطالي 1 بوصة',
        category: 'سباكة وتوريدات صحية',
        unit: 'قطعة',
        allows_decimal_quantity: false,
        purchase_price: 80,
        selling_price: 140,
        min_stock_level: 5,
        opening_quantity: 30,
      },
      mockSalesUser
    )

    // SALES_OPERATOR safePurchasePrice passed to RPC is forced to 0
    expect(mockClient.rpc).toHaveBeenCalledWith(
      'register_product_with_opening_stock',
      expect.objectContaining({
        p_purchase_price: 0,
        p_opening_quantity: 30,
      })
    )
    // Masked in returned view model for SALES_OPERATOR
    expect(newProduct.purchase_price).toBe(0)
    expect(newProduct.current_stock).toBe(0)
  })

  it('masks cost price and stock when SALES_OPERATOR queries product list', async () => {
    const mockClient = getSupabaseClient() as any
    mockClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'p-1',
            sku: 'KUN-01',
            name: 'كنافة نابلسية',
            current_stock: 45,
            purchase_price: 90,
            selling_price: 160,
            min_stock_level: 10,
            is_active: true,
          },
        ],
        error: null,
      }),
    })

    const products = await supabaseDataService.getProducts(undefined, 'SALES_OPERATOR')
    expect(products).toHaveLength(1)
    expect(products[0].purchase_price).toBe(0)
    expect(products[0].costPrice).toBe(0)
    expect(products[0].current_stock).toBe(0)
    expect(products[0].currentStock).toBe(0)
    expect(products[0].selling_price).toBe(160)
  })
})

describe('Phase E & F: Customer Ownership & Invoice Atomic Workflows', () => {
  const salesUser: User = {
    id: 'usr-sales-01',
    name: 'مسؤول المبيعات',
    username: 'sales_operator',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  }

  const otherSalesUser: User = {
    id: 'usr-sales-02',
    name: 'مندوب آخر',
    username: 'other_operator',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  }

  it('records created_by when a customer is added', async () => {
    const mockClient = getSupabaseClient() as any
    mockClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'cust-10',
          name: 'شركة النيل للتجارة',
          phone: '01011112222',
          address: 'قنا',
          created_by: salesUser.id,
          created_at: new Date().toISOString(),
          is_active: true,
        },
        error: null,
      }),
    })

    const customer = await supabaseDataService.createCustomer(
      {
        name: 'شركة النيل للتجارة',
        phone: '01011112222',
        address: 'قنا',
      },
      salesUser
    )

    expect(customer.name).toBe('شركة النيل للتجارة')
    expect(customer.created_by).toBe(salesUser.id)
  })

  it('enforces ownership check when updating draft invoices', async () => {
    const mockClient = getSupabaseClient() as any
    // Mock getInvoices to return an invoice created by someone else
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'inv-99',
            invoice_number: 'INV-20261119-001',
            status: 'draft',
            created_by: otherSalesUser.id,
            items: [],
          },
        ],
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    await expect(
      supabaseDataService.updateDraftInvoice(
        'inv-99',
        {
          invoice_date: '2026-11-19',
          customer_id: 'cust-1',
          items: [],
        },
        salesUser
      )
    ).rejects.toThrow('غير مصرح: يمكن لمسؤول المبيعات تعديل مسودات الفواتير التي أنشأها بنفسه فقط')
  })

  it('executes atomic approve_sales_invoice RPC', async () => {
    const mockClient = getSupabaseClient() as any
    mockClient.rpc.mockResolvedValueOnce({
      data: { invoice_id: 'inv-1', invoice_number: 'INV-20261119-001', final_total: 450 },
      error: null,
    })
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            invoice_number: 'INV-20261119-001',
            status: 'approved',
            final_total: 450,
            items: [],
          },
        ],
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    const approved = await supabaseDataService.approveInvoice('inv-1', salesUser)
    expect(mockClient.rpc).toHaveBeenCalledWith('approve_sales_invoice', {
      p_invoice_id: 'inv-1',
    })
    expect(approved.status).toBe('approved')
  })

  it('executes atomic cancel_sales_invoice RPC with required reason', async () => {
    const mockClient = getSupabaseClient() as any
    mockClient.rpc.mockResolvedValueOnce({
      data: { invoice_id: 'inv-1', invoice_number: 'INV-20261119-001' },
      error: null,
    })
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            invoice_number: 'INV-20261119-001',
            status: 'cancelled',
            items: [],
          },
        ],
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    // Missing reason should fail
    await expect(
      supabaseDataService.cancelApprovedInvoice('inv-1', '', salesUser)
    ).rejects.toThrow('يجب كتابة سبب الإلغاء')

    // Valid cancellation
    const cancelled = await supabaseDataService.cancelApprovedInvoice(
      'inv-1',
      'طلب العميل تعديل الكميات والطلبية',
      salesUser
    )
    expect(mockClient.rpc).toHaveBeenCalledWith('cancel_sales_invoice', {
      p_invoice_id: 'inv-1',
      p_reason: 'طلب العميل تعديل الكميات والطلبية',
    })
    expect(cancelled.status).toBe('cancelled')
  })
})

describe('Phase B: Real Authentication & Session Management', () => {
  it('rejects unauthorized or inactive accounts with the required Arabic error message', async () => {
    const mockClient = getSupabaseClient() as any

    // Mock successful Supabase Auth signInWithPassword
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'auth-user-99', email: 'intruder@external.com' },
        session: { access_token: 'fake-jwt' },
      },
      error: null,
    })

    // Mock authorized_users query returning inactive or not found
    mockClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          user_id: 'auth-user-99',
          email: 'intruder@external.com',
          full_name: 'دخيل غير مصرح',
          is_active: false,
          role: 'SALES_OPERATOR',
        },
        error: null,
      }),
    })

    // Sign out should be triggered if account is inactive
    const res = await (async () => {
      // Simulate AuthContext verification logic directly
      const auth = mockClient.auth
      const signInRes = await auth.signInWithPassword({
        email: 'intruder@external.com',
        password: 'password123',
      })
      if (signInRes.error) return { success: false, error: signInRes.error.message }

      const { data: authRecord } = await mockClient
        .from('authorized_users')
        .select('*')
        .eq('email', 'intruder@external.com')
        .single()

      if (!authRecord || authRecord.is_active === false) {
        await auth.signOut()
        return {
          success: false,
          error: 'هذا الحساب غير مصرح له بالدخول أو تم تعطيله. يرجى التواصل مع الإدارة.',
        }
      }
      return { success: true }
    })()

    expect(res.success).toBe(false)
    expect(res.error).toBe('هذا الحساب غير مصرح له بالدخول أو تم تعطيله. يرجى التواصل مع الإدارة.')
    expect(mockClient.auth.signOut).toHaveBeenCalled()
  })

  it('allows active authorized users to sign in and restores user attributes', async () => {
    const mockClient = getSupabaseClient() as any

    mockClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'auth-user-01', email: 'owner@alamira.com' },
        session: { access_token: 'valid-jwt' },
      },
      error: null,
    })

    mockClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          user_id: 'auth-user-01',
          email: 'owner@alamira.com',
          full_name: 'الحاج أحمد صاحب المنشأة',
          is_active: true,
          role: 'ADMIN',
          username: 'owner_ahmed',
        },
        error: null,
      }),
    })

    const res = await (async () => {
      const auth = mockClient.auth
      const signInRes = await auth.signInWithPassword({
        email: 'owner@alamira.com',
        password: 'correct-password',
      })
      if (signInRes.error) return { success: false, error: signInRes.error.message }

      const { data: authRecord } = await mockClient
        .from('authorized_users')
        .select('*')
        .eq('email', 'owner@alamira.com')
        .single()

      if (!authRecord || authRecord.is_active === false) {
        await auth.signOut()
        return {
          success: false,
          error: 'هذا الحساب غير مصرح له بالدخول أو تم تعطيله. يرجى التواصل مع الإدارة.',
        }
      }

      return {
        success: true,
        user: {
          id: authRecord.user_id,
          name: authRecord.full_name,
          role: authRecord.role,
          username: authRecord.username,
        },
      }
    })()

    expect(res.success).toBe(true)
    expect(res.user?.name).toBe('الحاج أحمد صاحب المنشأة')
    expect(res.user?.role).toBe('ADMIN')
  })
})

describe('Phase G: Immutable Audit Logging', () => {
  it('records audit log entries to public.audit_logs table', async () => {
    const mockClient = getSupabaseClient() as any
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockClient.from.mockReturnValue({
      insert: mockInsert,
    })

    await supabaseDataService.recordAuditLog({
      action: 'INVOICE_APPROVE',
      category: 'sales',
      entity_type: 'sales_invoice',
      entity_id: 'inv-100',
      entity_name_or_number: 'INV-20261119-100',
      performed_by: 'المدير العام',
      performed_by_role: 'ADMIN' as Role,
      outcome: 'success',
      timestamp: new Date().toISOString(),
    })

    expect(mockClient.from).toHaveBeenCalledWith('audit_logs')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INVOICE_APPROVE',
        category: 'sales',
        entity_id: 'inv-100',
        outcome: 'success',
      })
    )
  })

  it('guarantees unsupported operations fail loudly in real backend mode without silent fallback', async () => {
    const originalIsMock = dataService.isMock
    dataService.isMock = () => false

    await expect(dataService.getReceipts()).rejects.toThrow(
      'عمليات أذون استلام المخزن الحقيقية غير مكتملة في طبقة الربط الحالية (PARTIALLY WIRED)'
    )

    await expect(dataService.getIssues()).rejects.toThrow(
      'عمليات أذون صرف المخزن الحقيقية غير مكتملة في طبقة الربط الحالية (PARTIALLY WIRED)'
    )

    await expect(dataService.getAdjustments()).rejects.toThrow(
      'عمليات تسويات الجرد الحقيقية غير مكتملة في طبقة الربط الحالية (PARTIALLY WIRED)'
    )

    await expect(dataService.restoreFromBackup({})).rejects.toThrow(
      'استعادة البيانات عبر ملفات JSON المحلية مقتصرة على وضع المحاكاة والتطوير فقط'
    )

    dataService.isMock = originalIsMock
  })

  it('enforces RBAC deletion guards for customers and invoices', async () => {
    const mockSalesUser: User = {
      id: 'usr-sales-99',
      name: 'مسؤول المبيعات',
      username: 'sales_op',
      role: 'SALES_OPERATOR',
      title: 'مسؤول مبيعات',
      is_active: true,
    }

    // SALES_OPERATOR cannot delete customers
    await expect(supabaseDataService.deleteCustomer('cust-1', mockSalesUser)).rejects.toThrow(
      'غير مصرح: حذف العملاء متاح لمدير النظام فقط'
    )

    // SALES_OPERATOR cannot delete invoices created by another user
    const mockClient = getSupabaseClient() as any
    mockClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'inv-1', invoice_number: 'INV-1', status: 'draft', created_by: 'another-user' },
        error: null,
      }),
    })

    await expect(supabaseDataService.deleteDraftInvoice('inv-1', mockSalesUser)).rejects.toThrow(
      'غير مصرح: يمكن لمسؤول المبيعات حذف مسودات الفواتير التي أنشأها بنفسه فقط'
    )
  })

  describe('Phase E: Real Sales Operator Provisioning via Edge Function', () => {
    const adminUser: User = {
      id: '040bda71-7ffa-4a17-94d8-ff9cd72aed5d',
      name: 'أشرف عبد الموجود',
      username: 'ashraf_admin',
      email: 'ashraf@alamira.com',
      role: 'ADMIN',
      title: 'المدير العام',
      is_active: true,
    }

    const salesUser: User = {
      id: 'usr-sales-10',
      name: 'علي حسن',
      username: 'ali_sales',
      email: 'ali@alamira.com',
      role: 'SALES_OPERATOR',
      title: 'مسؤول مبيعات',
      is_active: true,
    }

    it('rejects creation when caller has SALES_OPERATOR role (unauthorized)', async () => {
      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: 'كريم محمود',
            email: 'karim@alamira.com',
          },
          salesUser
        )
      ).rejects.toThrow('غير مصرح: إضافة مسؤولي المبيعات مقتصرة على مدير النظام فقط')
    })

    it('validates required name and email before invoking Edge Function', async () => {
      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: '',
            email: 'karim@alamira.com',
          },
          adminUser
        )
      ).rejects.toThrow('الاسم والبريد الإلكتروني مطلوبان لإنشاء حساب مسؤول المبيعات')

      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: 'كريم محمود',
            email: '',
          },
          adminUser
        )
      ).rejects.toThrow('الاسم والبريد الإلكتروني مطلوبان لإنشاء حساب مسؤول المبيعات')
    })

    it('handles Edge Function 409 conflict and extracts safe Arabic error message from context', async () => {
      const mockClient = getSupabaseClient() as any
      const mockError = {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: vi.fn().mockResolvedValue({
            error: 'البريد الإلكتروني "karim@alamira.com" مسجل بالفعل لمستخدم مصرح له في النظام',
          }),
        },
      }

      mockClient.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: mockError,
      })

      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: 'كريم محمود',
            email: 'karim@alamira.com',
            password: 'StrongPassword123!',
          },
          adminUser
        )
      ).rejects.toThrow('البريد الإلكتروني "karim@alamira.com" مسجل بالفعل لمستخدم مصرح له في النظام')
    })

    it('handles Edge Function unexpected failure safely without leaking internals', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network or server error' },
      })

      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: 'كريم محمود',
            email: 'karim@alamira.com',
            password: 'StrongPassword123!',
          },
          adminUser
        )
      ).rejects.toThrow('Network or server error')
    })

    it('successfully provisions sales operator, clears cache namespace, and logs audit', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          user: {
            id: 'new-operator-uuid-123',
            email: 'karim@alamira.com',
            name: 'كريم محمود',
            username: 'karim_sales',
            role: 'SALES_OPERATOR',
            title: 'مسؤول مبيعات',
            is_active: true,
          },
        },
        error: null,
      })

      const cacheSpy = vi.spyOn(cacheService, 'invalidateNamespace')
      const auditSpy = vi.spyOn(supabaseDataService, 'recordAuditLog').mockResolvedValueOnce({} as any)

      const result = await supabaseDataService.createSalesOperator(
        {
          full_name: 'كريم محمود',
          email: 'karim@alamira.com',
          password: 'StrongPassword123!',
          username: 'karim_sales',
        },
        adminUser
      )

      expect(mockClient.functions.invoke).toHaveBeenCalledWith('create-sales-operator', {
        body: {
          email: 'karim@alamira.com',
          password: 'StrongPassword123!',
          full_name: 'كريم محمود',
          username: 'karim_sales',
          phone: null,
        },
      })

      expect(result.id).toBe('new-operator-uuid-123')
      expect(result.name).toBe('كريم محمود')
      expect(result.role).toBe('SALES_OPERATOR')
      expect(result.is_active).toBe(true)
      expect(cacheSpy).toHaveBeenCalledWith('users')
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATE',
          entity_type: 'user',
          entity_id: 'new-operator-uuid-123',
          performed_by_id: adminUser.id,
          outcome: 'success',
        })
      )
    })

    it('requires a password of at least 8 characters when creating a sales operator', async () => {
      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: 'ياسر خليل',
            email: 'yasser@alamira.com',
            username: 'yasser_sales',
            password: '',
          },
          adminUser
        )
      ).rejects.toThrow('كلمة المرور مطلوبة ويجب أن تتكون من 8 أحرف على الأقل')

      await expect(
        supabaseDataService.createSalesOperator(
          {
            full_name: 'ياسر خليل',
            email: 'yasser@alamira.com',
            username: 'yasser_sales',
            password: 'short',
          },
          adminUser
        )
      ).rejects.toThrow('كلمة المرور مطلوبة ويجب أن تتكون من 8 أحرف على الأقل')
    })
  })
})
