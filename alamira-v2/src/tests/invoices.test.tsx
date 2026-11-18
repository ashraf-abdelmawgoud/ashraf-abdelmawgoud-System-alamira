import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  calculateLineItem,
  calculateInvoiceTotals,
  round2,
} from '@/domain/invoiceCalculations'
import { mockDataService } from '@/services/mockDataService'
import { InvoicesPage } from '@/pages/InvoicesPage'

describe('Sales Invoice Builder & Financial Engine (Phase 3B)', () => {
  beforeEach(() => {
    mockDataService.resetToDefaults()
  })

  // =========================================================================
  // 1. FINANCIAL CALCULATIONS & V1 FORMULA PARITY TESTS
  // =========================================================================
  describe('Financial Calculations Parity with V1 Formulas', () => {
    it('calculates standard line item gross without discount', () => {
      const line = calculateLineItem({
        productId: 'prod-001',
        quantity: 5,
        unitPrice: 100.5,
      })

      expect(line.grossAmount).toBe(502.5)
      expect(line.discountAmount).toBe(0)
      expect(line.netAmount).toBe(502.5)
    })

    it('calculates percentage discount on a line item with 2-decimal rounding', () => {
      // 3 items @ 33.33 = 99.99 gross. 10% discount = 9.999 -> rounded to 10.00
      const line = calculateLineItem({
        productId: 'prod-002',
        quantity: 3,
        unitPrice: 33.33,
        discountType: 'percentage',
        discountValue: 10,
      })

      expect(line.grossAmount).toBe(99.99)
      expect(line.discountAmount).toBe(10.0)
      expect(line.netAmount).toBe(89.99)
    })

    it('calculates fixed discount on a line item and caps discount at line gross', () => {
      const line = calculateLineItem({
        productId: 'prod-002',
        quantity: 2,
        unitPrice: 50,
        discountType: 'fixed',
        discountValue: 25,
      })

      expect(line.grossAmount).toBe(100)
      expect(line.discountAmount).toBe(25)
      expect(line.netAmount).toBe(75)

      // Capped test: discount greater than gross amount
      const cappedLine = calculateLineItem({
        productId: 'prod-002',
        quantity: 2,
        unitPrice: 50,
        discountType: 'fixed',
        discountValue: 150,
      })

      expect(cappedLine.discountAmount).toBe(100)
      expect(cappedLine.netAmount).toBe(0)
    })

    it('calculates multi-item invoice with subtotal, invoice-level percentage discount and delivery charges', () => {
      // Item 1: 2 * 100 = 200 (no discount) -> net 200
      // Item 2: 4 * 50 = 200 (fixed 50 discount) -> net 150
      // Subtotal = 350
      // Invoice discount: 10% on 350 = 35
      // Delivery charges: + 45
      // Final Total: 350 - 35 + 45 = 360
      const result = calculateInvoiceTotals({
        items: [
          { productId: 'p1', quantity: 2, unitPrice: 100 },
          { productId: 'p2', quantity: 4, unitPrice: 50, discountType: 'fixed', discountValue: 50 },
        ],
        discountType: 'percentage',
        discountValue: 10,
        additionalCharges: 45,
      })

      expect(result.grossTotal).toBe(400)
      expect(result.itemDiscountsTotal).toBe(50)
      expect(result.subtotal).toBe(350)
      expect(result.invoiceDiscountAmount).toBe(35)
      expect(result.additionalCharges).toBe(45)
      expect(result.finalTotal).toBe(360)
    })

    it('supports decimal quantities accurately with 3 fractional places (e.g. 2.750 * 120)', () => {
      const result = calculateInvoiceTotals({
        items: [{ productId: 'p3', quantity: 2.75, unitPrice: 120 }],
      })

      expect(result.grossTotal).toBe(330)
      expect(result.subtotal).toBe(330)
      expect(result.finalTotal).toBe(330)
    })

    it('prevents negative final totals and ignores negative charges or discounts', () => {
      const result = calculateInvoiceTotals({
        items: [{ productId: 'p1', quantity: 1, unitPrice: 50 }],
        discountType: 'fixed',
        discountValue: 500, // Excessive discount capped at subtotal
        additionalCharges: -20, // Negative charge ignored
      })

      expect(result.subtotal).toBe(50)
      expect(result.invoiceDiscountAmount).toBe(50) // Capped at subtotal
      expect(result.additionalCharges).toBe(0)
      expect(result.finalTotal).toBe(0)
    })

    it('verifies round2 precision on known floating-point edge cases (0.1 + 0.2, etc.)', () => {
      expect(round2(0.1 + 0.2)).toBe(0.3)
      expect(round2(1.005)).toBe(1.01)
      expect(round2(35.555)).toBe(35.56)
    })
  })

  // =========================================================================
  // 2. INVOICE LIFECYCLE & INVENTORY RULES SERVICE TESTS
  // =========================================================================
  describe('mockDataService Sales Invoice Lifecycle & Inventory Rules', () => {
    it('creates a draft invoice without deducting product stock', async () => {
      const prods = await mockDataService.getProducts()
      const item = prods.find((p) => p.current_stock >= 10)!
      const originalStock = item.current_stock

      const custs = await mockDataService.getCustomers()

      const created = await mockDataService.createInvoice({
        invoice_date: '2026-11-17',
        customer_id: custs[0].id,
        items: [{ product_id: item.id, quantity: 5, unit_price: item.selling_price }],
      })

      expect(created.status).toBe('draft')
      expect(created.items?.length).toBe(1)

      // Stock balance must remain untouched for draft invoices
      const afterProds = await mockDataService.getProducts()
      const afterItem = afterProds.find((p) => p.id === item.id)!
      expect(afterItem.current_stock).toBe(originalStock)
    })

    it('approves invoice, deducting stock once and recording immutable movement audit trail', async () => {
      const prods = await mockDataService.getProducts()
      const item = prods.find((p) => p.current_stock >= 10)!
      const originalStock = item.current_stock
      const custs = await mockDataService.getCustomers()

      // 1. Create draft
      const draft = await mockDataService.createInvoice({
        invoice_date: '2026-11-17',
        customer_id: custs[0].id,
        items: [{ product_id: item.id, quantity: 4, unit_price: item.selling_price }],
      })

      // 2. Approve draft
      const approved = await mockDataService.approveInvoice(draft.id)
      expect(approved.status).toBe('approved')
      expect(approved.approved_by).toBe('مدير المبيعات')

      // 3. Stock deducted exactly once
      const afterProds = await mockDataService.getProducts()
      const afterItem = afterProds.find((p) => p.id === item.id)!
      expect(afterItem.current_stock).toBe(originalStock - 4)

      // 4. Verify movement audit trail
      const logs = await mockDataService.getMovementLogs({ product_id: item.id })
      const saleLog = logs.find((l) => l.source_doc_number === draft.invoice_number)
      expect(saleLog).toBeDefined()
      expect(saleLog?.movement_type).toBe('sale')
      expect(saleLog?.quantity_out).toBe(4)
      expect(saleLog?.stock_balance_after).toBe(originalStock - 4)
    })

    it('rejects double approval on already approved invoice', async () => {
      const prods = await mockDataService.getProducts()
      const item = prods.find((p) => p.current_stock >= 5)!
      const custs = await mockDataService.getCustomers()

      const inv = await mockDataService.createInvoice({
        invoice_date: '2026-11-17',
        customer_id: custs[0].id,
        items: [{ product_id: item.id, quantity: 2, unit_price: item.selling_price }],
        action: 'approve',
      })

      expect(inv.status).toBe('approved')

      // Second approval attempt must throw error
      await expect(mockDataService.approveInvoice(inv.id)).rejects.toThrow(
        /معتمدة مسبقاً/
      )
    })

    it('rejects approval when requested quantity exceeds available stock', async () => {
      const prods = await mockDataService.getProducts()
      const item = prods.find((p) => p.current_stock > 0)!
      const custs = await mockDataService.getCustomers()

      // Attempt to directly approve with stock exceeding current balance
      await expect(
        mockDataService.createInvoice({
          invoice_date: '2026-11-17',
          customer_id: custs[0].id,
          items: [{ product_id: item.id, quantity: item.current_stock + 999, unit_price: item.selling_price }],
          action: 'approve',
        })
      ).rejects.toThrow(/غير كافٍ/)
    })

    it('cancels approved invoice, restoring stock to warehouse and adding reversal audit log', async () => {
      const prods = await mockDataService.getProducts()
      const item = prods.find((p) => p.current_stock >= 6)!
      const originalStock = item.current_stock
      const custs = await mockDataService.getCustomers()

      // Create and approve invoice for 3 units
      const inv = await mockDataService.createInvoice({
        invoice_date: '2026-11-17',
        customer_id: custs[0].id,
        items: [{ product_id: item.id, quantity: 3, unit_price: item.selling_price }],
        action: 'approve',
      })

      const midProds = await mockDataService.getProducts()
      const midItem = midProds.find((p) => p.id === item.id)!
      expect(midItem.current_stock).toBe(originalStock - 3)

      // Cancel invoice with audit reason
      const cancelled = await mockDataService.cancelApprovedInvoice(inv.id, 'إلغاء لطلب العميل استبدال البند')
      expect(cancelled.status).toBe('cancelled')

      // Stock must be restored back to original stock
      const finalProds = await mockDataService.getProducts()
      const finalItem = finalProds.find((p) => p.id === item.id)!
      expect(finalItem.current_stock).toBe(originalStock)

      // Movement logs must record reversal
      const logs = await mockDataService.getMovementLogs({ product_id: item.id })
      const revLog = logs.find((l) => l.movement_type === 'reversal' && l.source_doc_number === inv.invoice_number)
      expect(revLog).toBeDefined()
      expect(revLog?.quantity_in).toBe(3)
      expect(revLog?.stock_balance_after).toBe(originalStock)
    })

    it('rejects editing or deleting non-draft invoices', async () => {
      const prods = await mockDataService.getProducts()
      const custs = await mockDataService.getCustomers()

      const inv = await mockDataService.createInvoice({
        invoice_date: '2026-11-17',
        customer_id: custs[0].id,
        items: [{ product_id: prods[0].id, quantity: 1, unit_price: prods[0].selling_price }],
        action: 'approve',
      })

      // Cannot update approved invoice
      await expect(
        mockDataService.updateDraftInvoice(inv.id, {
          invoice_date: '2026-11-18',
          customer_id: custs[0].id,
          items: [{ product_id: prods[0].id, quantity: 1, unit_price: prods[0].selling_price }],
        })
      ).rejects.toThrow(/لا يمكن تعديلها/)

      // Cannot delete approved invoice
      await expect(mockDataService.deleteDraftInvoice(inv.id)).rejects.toThrow(
        /الحذف متاح للمسودات فقط/
      )
    })
  })

  // =========================================================================
  // 3. INVOICES VIEW & BUILDER UI INTEGRATION TESTS
  // =========================================================================
  describe('InvoicesPage UI Components & Workflow', () => {
    it('renders invoice list with desktop table and mobile cards', async () => {
      render(<InvoicesPage />)

      await waitFor(() => {
        expect(screen.getByText(/فواتير المبيعات \(Sales Invoices\)/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /فاتورة مبيعات جديدة/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /مرتجعات المبيعات/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/بحث برقم الفاتورة، اسم العميل/i)).toBeInTheDocument()
    })

    it('filters invoices by search query', async () => {
      const user = userEvent.setup()
      render(<InvoicesPage />)

      await waitFor(() => {
        expect(screen.getByText(/فواتير المبيعات \(Sales Invoices\)/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/بحث برقم الفاتورة، اسم العميل/i)
      await user.type(searchInput, 'INV-2026-0048')

      await waitFor(() => {
        expect(screen.getAllByText(/INV-2026-0048/i).length).toBeGreaterThan(0)
        expect(screen.queryByText(/INV-2026-0047/i)).not.toBeInTheDocument()
      })
    })

    it('shows informational toast when clicking Sales Returns placeholder button', async () => {
      render(<InvoicesPage />)

      await waitFor(() => {
        expect(screen.getByText(/فواتير المبيعات \(Sales Invoices\)/i)).toBeInTheDocument()
      })

      const returnBtn = screen.getByRole('button', { name: /مرتجعات المبيعات/i })
      fireEvent.click(returnBtn)

      await waitFor(() => {
        expect(
          screen.getByText(/ميزة مرتجعات المبيعات قيد التطوير، وستتوفر قريبًا\./i)
        ).toBeInTheDocument()
      })
    })

    it('opens InvoiceBuilder when clicking "فاتورة مبيعات جديدة" and returns to list on cancel', async () => {
      render(<InvoicesPage />)

      await waitFor(() => {
        expect(screen.getByText(/فواتير المبيعات \(Sales Invoices\)/i)).toBeInTheDocument()
      })

      const newBtn = screen.getByRole('button', { name: /فاتورة مبيعات جديدة/i })
      fireEvent.click(newBtn)

      await waitFor(() => {
        expect(screen.getByText(/إنشاء فاتورة مبيعات جديدة/i)).toBeInTheDocument()
        expect(screen.getByText(/العميل المعتمد/i)).toBeInTheDocument()
        expect(screen.getByText(/بنود أصناف الفاتورة/i)).toBeInTheDocument()
        expect(screen.getByText(/الملخص المالي للفاتورة/i)).toBeInTheDocument()
      })

      // Click cancel
      const cancelBtn = screen.getByRole('button', { name: /إلغاء/i })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.getByText(/فواتير المبيعات \(Sales Invoices\)/i)).toBeInTheDocument()
      })
    })
  })
})
