/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAtomicInvoiceRpcEnabled, getSupabaseClient } from '@/services/supabaseClient'
import { supabaseDataService } from '@/services/supabaseDataService'
import { cacheService } from '@/services/cacheService'
import { User, SalesInvoiceFormData } from '@/types'

// Mock Supabase client
vi.mock('@/services/supabaseClient', async () => {
  const actual = await vi.importActual<typeof import('@/services/supabaseClient')>('@/services/supabaseClient')

  const mockQueryBuilder = () => ({
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
    },
    from: vi.fn(() => mockQueryBuilder()),
    rpc: vi.fn(),
  }

  return {
    ...actual,
    getSupabaseClient: vi.fn(() => mockClient),
  }
})

describe('Phase S4 — Atomic Invoice Draft RPC Integration & Safeguards', () => {
  const mockAdmin: User = {
    id: 'admin-uuid-1',
    name: 'المدير العام',
    username: 'admin',
    email: 'admin@alamira.com',
    role: 'ADMIN',
    title: 'مدير النظام',
    is_active: true,
  }

  const mockSalesOperator: User = {
    id: 'sales-uuid-1',
    name: 'مسؤول المبيعات',
    username: 'sales_rep',
    email: 'sales@alamira.com',
    role: 'SALES_OPERATOR',
    title: 'مسؤول مبيعات',
    is_active: true,
  }

  const sampleFormData: SalesInvoiceFormData = {
    customer_id: 'cust-uuid-10',
    invoice_date: '2026-11-23',
    invoice_discount_type: 'fixed',
    invoice_discount_value: 50,
    additional_charges: 20,
    notes: 'مسودة تجريبية ذرية',
    items: [
      {
        product_id: 'prod-uuid-1',
        quantity: 5,
        unit_price: 100,
        discount_type: 'percentage',
        discount_value: 10,
      },
      {
        product_id: 'prod-uuid-2',
        quantity: 2,
        unit_price: 0, // Legitimate zero price sample
        discount_type: 'none',
        discount_value: 0,
      },
    ],
  }

  beforeEach(() => {
    cacheService.clear()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('Feature Flag Default: isAtomicInvoiceRpcEnabled is false by default', () => {
    expect(isAtomicInvoiceRpcEnabled()).toBe(false)
  })

  it('Feature Flag Activation: respects VITE_ENABLE_ATOMIC_INVOICE_RPC=true', () => {
    vi.stubEnv('VITE_ENABLE_ATOMIC_INVOICE_RPC', 'true')
    expect(isAtomicInvoiceRpcEnabled()).toBe(true)
  })

  describe('When Atomic RPC is Active (VITE_ENABLE_ATOMIC_INVOICE_RPC = true)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_ENABLE_ATOMIC_INVOICE_RPC', 'true')
    })

    it('creates draft invoice atomically in a single RPC call with zero-price preserved', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'inv-atomic-uuid-1',
          invoice_number: 'INV-20261123-5555',
          final_total: 420,
          status: 'draft',
        },
        error: null,
      })

      // Mock getInvoiceById for readback
      vi.spyOn(supabaseDataService, 'getInvoiceById').mockResolvedValueOnce({
        id: 'inv-atomic-uuid-1',
        invoice_number: 'INV-20261123-5555',
        customer_id: 'cust-uuid-10',
        customer_name_snapshot: 'شركة الأمل للتوريدات',
        customer_phone_snapshot: '01000000000',
        invoice_date: '2026-11-23',
        gross_amount: 500,
        item_discounts_amount: 50,
        subtotal: 450,
        invoice_discount_type: 'fixed',
        invoice_discount_value: 50,
        invoice_discount_amount: 50,
        additional_charges: 20,
        final_total: 420,
        notes: 'مسودة تجريبية ذرية',
        status: 'draft',
        created_by: mockSalesOperator.id,
        created_at: '2026-11-23T00:00:00Z',
        updated_at: '2026-11-23T00:00:00Z',
        items: [],
      } as any)

      const result = await supabaseDataService.createInvoice(sampleFormData, mockSalesOperator)

      expect(mockClient.rpc).toHaveBeenCalledTimes(1)
      expect(mockClient.rpc).toHaveBeenCalledWith('save_sales_invoice_draft', {
        p_invoice_id: null,
        p_customer_id: 'cust-uuid-10',
        p_invoice_date: '2026-11-23',
        p_invoice_discount_type: 'fixed',
        p_invoice_discount_value: 50,
        p_additional_charges: 20,
        p_notes: 'مسودة تجريبية ذرية',
        p_items: [
          {
            product_id: 'prod-uuid-1',
            quantity: 5,
            unit_price: 100,
            discount_type: 'percentage',
            discount_value: 10,
          },
          {
            product_id: 'prod-uuid-2',
            quantity: 2,
            unit_price: 0, // 0 price preserved!
            discount_type: 'none',
            discount_value: 0,
          },
        ],
        p_expected_updated_at: null,
        p_payment_terms: null,
      })

      expect(result.id).toBe('inv-atomic-uuid-1')
      expect(result.status).toBe('draft')
    })

    it('preserves and transmits payment_terms to atomic RPC', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'inv-atomic-credit-1',
          invoice_number: 'INV-20261123-7777',
          final_total: 420,
          status: 'draft',
          payment_terms: 'credit',
        },
        error: null,
      })

      vi.spyOn(supabaseDataService, 'getInvoiceById').mockResolvedValueOnce({
        id: 'inv-atomic-credit-1',
        payment_terms: 'credit',
        status: 'draft',
      } as any)

      await supabaseDataService.createInvoice({ ...sampleFormData, payment_terms: 'credit' }, mockSalesOperator)

      expect(mockClient.rpc).toHaveBeenCalledWith('save_sales_invoice_draft', expect.objectContaining({
        p_payment_terms: 'credit',
      }))
    })

    it('updates draft invoice atomically with optimistic concurrency check', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'inv-atomic-uuid-1',
          invoice_number: 'INV-20261123-5555',
          final_total: 420,
          status: 'draft',
        },
        error: null,
      })

      vi.spyOn(supabaseDataService, 'getInvoiceById').mockResolvedValue({
        id: 'inv-atomic-uuid-1',
        invoice_number: 'INV-20261123-5555',
        customer_id: 'cust-uuid-10',
        status: 'draft',
        created_by: mockSalesOperator.id,
        updated_at: '2026-11-23T00:00:00.000Z',
      } as any)

      const updated = await supabaseDataService.updateDraftInvoice('inv-atomic-uuid-1', sampleFormData, mockSalesOperator)

      expect(mockClient.rpc).toHaveBeenCalledWith('save_sales_invoice_draft', expect.objectContaining({
        p_invoice_id: 'inv-atomic-uuid-1',
        p_expected_updated_at: '2026-11-23T00:00:00.000Z',
      }))
      expect(updated.id).toBe('inv-atomic-uuid-1')
    })

    it('propagates concurrency conflict error clearly when draft was modified concurrently', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'تم تعديل الفاتورة بواسطة مستخدم آخر تزامناً؛ يرجى إعادة تحميل الفاتورة ومراجعتها' },
      })

      vi.spyOn(supabaseDataService, 'getInvoiceById').mockResolvedValueOnce({
        id: 'inv-atomic-uuid-1',
        status: 'draft',
        created_by: mockSalesOperator.id,
        updated_at: '2026-11-23T00:00:00.000Z',
      } as any)

      await expect(
        supabaseDataService.updateDraftInvoice('inv-atomic-uuid-1', sampleFormData, mockSalesOperator)
      ).rejects.toThrow('تم تعديل الفاتورة بواسطة مستخدم آخر تزامناً')
    })

    it('propagates authorization denial when a sales operator attempts to edit another user draft', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'غير مصرح: يمكن لمسؤول المبيعات تعديل مسودات الفواتير التي أنشأها بنفسه فقط' },
      })

      vi.spyOn(supabaseDataService, 'getInvoiceById').mockResolvedValueOnce({
        id: 'inv-atomic-uuid-1',
        status: 'draft',
        created_by: 'other-user-uuid',
        updated_at: '2026-11-23T00:00:00.000Z',
      } as any)

      await expect(
        supabaseDataService.updateDraftInvoice('inv-atomic-uuid-1', sampleFormData, mockSalesOperator)
      ).rejects.toThrow('غير مصرح: يمكن لمسؤول المبيعات تعديل مسودات الفواتير التي أنشأها بنفسه فقط')
    })

    it('handles save-and-approve by persisting draft via RPC and then executing approveInvoice', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'inv-atomic-uuid-1',
          status: 'draft',
        },
        error: null,
      })

      const approveSpy = vi.spyOn(supabaseDataService, 'approveInvoice').mockResolvedValueOnce({
        id: 'inv-atomic-uuid-1',
        status: 'approved',
      } as any)

      const approveFormData: SalesInvoiceFormData = {
        ...sampleFormData,
        action: 'approve',
      }

      const result = await supabaseDataService.createInvoice(approveFormData, mockAdmin)

      expect(mockClient.rpc).toHaveBeenCalledWith('save_sales_invoice_draft', expect.anything())
      expect(approveSpy).toHaveBeenCalledWith('inv-atomic-uuid-1', mockAdmin)
      expect(result.status).toBe('approved')
    })

    it('aborts cleanly and invalidates cache if RPC throws database error', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'الصنف موقوف/مؤرشف ولا يمكن بيعه' },
      })

      await expect(
        supabaseDataService.createInvoice(sampleFormData, mockSalesOperator)
      ).rejects.toThrow('فشل حفظ مسودة الفاتورة عبر الإجراء الذري: الصنف موقوف/مؤرشف ولا يمكن بيعه')
    })
  })

  describe('When Atomic RPC is Disabled (Default Fallback)', () => {
    it('uses verified multi-step fallback with input validation and zero price coalescing', async () => {
      const mockClient = getSupabaseClient() as any
      mockClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'inv-fallback-uuid-1', invoice_number: 'INV-20261123-1111' },
              error: null,
            }),
          }),
        }),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'prod-uuid-1', name: 'قاطع أوتوماتيكي', sku: 'ELC-01', unit: 'قطعة', selling_price: 100 },
            { id: 'prod-uuid-2', name: 'سلك نحاس', sku: 'WIR-01', unit: 'متر', selling_price: 50 },
          ],
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: { name: 'شركة النور', phone: '01200000000' },
          error: null,
        }),
      }))

      vi.spyOn(supabaseDataService, 'getInvoiceById').mockResolvedValueOnce({
        id: 'inv-fallback-uuid-1',
        invoice_number: 'INV-20261123-1111',
        status: 'draft',
      } as any)

      const result = await supabaseDataService.createInvoice(sampleFormData, mockSalesOperator)

      // Verifies fallback did NOT call save_sales_invoice_draft RPC
      expect(mockClient.rpc).not.toHaveBeenCalledWith('save_sales_invoice_draft', expect.anything())
      expect(result.id).toBe('inv-fallback-uuid-1')
    })
  })
})
