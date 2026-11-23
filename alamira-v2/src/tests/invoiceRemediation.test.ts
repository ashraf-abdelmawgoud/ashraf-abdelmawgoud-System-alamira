import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { supabaseDataService as service } from '@/services/supabaseDataService'
import { cacheService } from '@/services/cacheService'
import type { Customer, Product, SalesInvoice, SalesInvoiceFormData, User } from '@/types'

const client = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: () => client,
  isAtomicInvoiceRpcEnabled: () => false,
}))

const admin = { id: 'admin-test', name: 'Test Admin', role: 'ADMIN' } as User
const sales = { id: 'sales-test', name: 'Test Sales', role: 'SALES_OPERATOR' } as User
const form = (): SalesInvoiceFormData => ({
  customer_id: 'customer-test', invoice_date: '2026-01-01', action: 'draft',
  items: [{ product_id: 'product-test', quantity: 1.25, unit_price: 0 }],
})
const draft = { id: 'invoice-test', invoice_number: 'TEST-1', status: 'draft', created_by: sales.id } as SalesInvoice
const product = { id: 'product-test', sku: 'TEST', name: 'Test product', unit: 'meter', selling_price: 50 } as Product

function query(data: unknown = null, error: unknown = null) {
  const result = { data, error }
  return {
    select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result), single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  cacheService.clear()
  vi.spyOn(service, 'recordAuditLog').mockResolvedValue()
})
afterEach(() => vi.restoreAllMocks())

function prepareEdit() {
  vi.spyOn(service, 'getInvoiceById').mockResolvedValue(draft)
  vi.spyOn(service, 'getCustomers').mockResolvedValue([{ id: 'customer-test', name: 'Test customer' } as Customer])
  vi.spyOn(service, 'getProducts').mockResolvedValue([product])
}

describe('S2 secure catalog failure', () => {
  it.each(['42P01', '42501', 'PGRST205'])('does not fall back to base products for %s', async (code) => {
    client.from.mockReturnValue(query(null, { code, message: 'relation unavailable' }))
    await expect(service.getProducts(undefined, sales.role)).rejects.toThrow('relation unavailable')
    expect(client.from.mock.calls).toEqual([['products_secure_view']])
  })
  it('keeps the allowed sales catalog projection usable', async () => {
    client.from.mockReturnValue(query([{ ...product, purchase_price: null, current_stock: null }]))
    const rows = await service.getProducts(undefined, sales.role)
    expect(rows[0]).toMatchObject({ id: product.id, purchase_price: 0, current_stock: 0, selling_price: 50 })
  })
})

describe('C1 checked line replacement (not a transaction)', () => {
  it.each(['delete', 'insert'])('reports %s failure and never approves or logs success', async (stage) => {
    prepareEdit()
    const header = query({ id: draft.id })
    const remove = query(null, stage === 'delete' ? { message: 'delete denied' } : null)
    const insert = query(null, stage === 'insert' ? { message: 'insert denied' } : null)
    client.from.mockReturnValueOnce(header).mockReturnValueOnce(remove).mockReturnValueOnce(insert)
    await expect(service.updateDraftInvoice(draft.id, { ...form(), action: 'approve' }, sales)).rejects.toThrow(`${stage} denied`)
    expect(client.rpc).not.toHaveBeenCalled()
    expect(service.recordAuditLog).not.toHaveBeenCalled()
    expect(client.from).toHaveBeenCalledTimes(stage === 'delete' ? 2 : 3)
  })
  it('stops before deleting lines on header failure', async () => {
    prepareEdit()
    client.from.mockReturnValue(query(null, { message: 'header denied' }))
    await expect(service.updateDraftInvoice(draft.id, form(), admin)).rejects.toThrow('header denied')
    expect(client.from).toHaveBeenCalledTimes(1)
  })
  it('stops before deleting lines if the header update affects no rows', async () => {
    prepareEdit()
    client.from.mockReturnValue(query(null))
    await expect(service.updateDraftInvoice(draft.id, form(), admin)).rejects.toThrow('لم تُحدّث المسودة')
    expect(client.from).toHaveBeenCalledTimes(1)
  })
  it.each([null, 'other-owner'])('rejects a sales edit for owner %s before writes', async (owner) => {
    vi.spyOn(service, 'getInvoiceById').mockResolvedValue({ ...draft, created_by: owner } as SalesInvoice)
    await expect(service.updateDraftInvoice(draft.id, form(), sales)).rejects.toThrow('غير مصرح')
    expect(client.from).not.toHaveBeenCalled()
  })
  it.each([admin, sales])('preserves zero price and decimal quantity for $role', async (actor) => {
    prepareEdit()
    const insert = query()
    client.from.mockReturnValueOnce(query({ id: draft.id })).mockReturnValueOnce(query()).mockReturnValueOnce(insert)
    await service.updateDraftInvoice(draft.id, form(), actor)
    expect(insert.insert).toHaveBeenCalledWith([expect.objectContaining({ quantity: 1.25, unit_price: 0, gross_amount: 0 })])
    expect(service.getProducts).toHaveBeenCalledWith(undefined, actor.role)
  })
})

describe('C2 create and delete safeguards', () => {
  it('preserves a zero price during creation', async () => {
    const header = query(draft)
    const lines = query()
    client.from.mockReturnValueOnce(query({ name: 'Test customer' })).mockReturnValueOnce(query([product]))
      .mockReturnValueOnce(header).mockReturnValueOnce(lines)
    vi.spyOn(service, 'getInvoiceById').mockResolvedValue(draft)
    await service.createInvoice(form(), sales)
    expect(lines.insert).toHaveBeenCalledWith([expect.objectContaining({ quantity: 1.25, unit_price: 0 })])
  })
  it('identifies the already-created draft after line failure', async () => {
    client.from.mockReturnValueOnce(query({ name: 'Test customer' })).mockReturnValueOnce(query([product]))
      .mockReturnValueOnce(query(draft)).mockReturnValueOnce(query(null, { message: 'line failed' }))
    await expect(service.createInvoice({ ...form(), action: 'approve' }, sales)).rejects.toThrow('أُنشئت المسودة')
    expect(client.rpc).not.toHaveBeenCalled()
    expect(service.recordAuditLog).not.toHaveBeenCalled()
  })
  it('stops before writes when the customer lookup fails', async () => {
    client.from.mockReturnValue(query(null, { message: 'denied' }))
    await expect(service.createInvoice(form(), sales)).rejects.toThrow('لم تُحفظ الفاتورة')
    expect(client.from).toHaveBeenCalledTimes(1)
  })
  it.each([admin, sales])('preserves production delete: removes lines then header for $role', async (actor) => {
    const linesDelete = query()
    const headerDelete = query()
    client.from.mockReturnValueOnce(query(draft)).mockReturnValueOnce(linesDelete).mockReturnValueOnce(headerDelete)
    expect(await service.deleteDraftInvoice(draft.id, actor)).toBe(true)
    expect(client.from.mock.calls).toEqual([['sales_invoices'], ['sales_invoice_items'], ['sales_invoices']])
  })
  it('rejects deletion if invoice is not a draft', async () => {
    client.from.mockReturnValueOnce(query({ ...draft, status: 'approved' }))
    await expect(service.deleteDraftInvoice(draft.id, sales)).rejects.toThrow('لا يمكن حذف سوى مسودات الفواتير')
  })
  it('rejects deletion for sales operator if not creator', async () => {
    client.from.mockReturnValueOnce(query({ ...draft, created_by: 'other-user' }))
    await expect(service.deleteDraftInvoice(draft.id, sales)).rejects.toThrow('غير مصرح')
  })
})

describe('C6 input validation before creation writes', () => {
  it.each([0, -1, NaN, Infinity])('rejects quantity %s', async (quantity) => {
    const data = form(); data.items[0].quantity = quantity
    await expect(service.createInvoice(data, admin)).rejects.toThrow('غير صالحة')
    expect(client.from).not.toHaveBeenCalled()
  })
  it.each([-1, NaN, Infinity])('rejects price %s', async (price) => {
    const data = form(); data.items[0].unit_price = price
    await expect(service.createInvoice(data, admin)).rejects.toThrow('غير صالحة')
    expect(client.from).not.toHaveBeenCalled()
  })
  it('rejects percentages above 100', async () => {
    await expect(service.createInvoice({ ...form(), invoice_discount_type: 'percentage', invoice_discount_value: 101 }, admin)).rejects.toThrow('غير صالحة')
    expect(client.from).not.toHaveBeenCalled()
  })
})
