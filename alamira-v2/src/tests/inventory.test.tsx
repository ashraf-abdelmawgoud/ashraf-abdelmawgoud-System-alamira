import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { mockDataService } from '@/services/mockDataService'
import { InventoryPage } from '@/pages/InventoryPage'

describe('Inventory Module & Movement Workflows (Phase 3A)', () => {
  beforeEach(() => {
    mockDataService.resetToDefaults()
  })

  // 1. Service-level business rules tests
  describe('mockDataService Business Logic & Safety Rules', () => {
    it('creates a draft stock receipt and approves it, increasing stock balance and creating audit movement', async () => {
      const initialProducts = await mockDataService.getProducts()
      const cable = initialProducts.find((p) => p.sku === 'ELC-1001')!
      const initialStock = cable.current_stock

      // Create draft receipt
      const receipt = await mockDataService.createReceipt({
        receipt_date: '2026-11-17',
        supplier_id: 'sup-001',
        supplier_invoice_number: 'TEST-INV-01',
        items: [{ product_id: cable.id, quantity: 10, unit_price: 2850 }],
      })

      expect(receipt.status).toBe('draft')
      expect(receipt.total_amount).toBe(28500)

      // Stock should NOT change yet while draft
      let updatedProds = await mockDataService.getProducts()
      let updatedCable = updatedProds.find((p) => p.id === cable.id)!
      expect(updatedCable.current_stock).toBe(initialStock)

      // Approve receipt
      const approved = await mockDataService.approveReceipt(receipt.id)
      expect(approved.status).toBe('approved')

      // Stock must be increased by 10
      updatedProds = await mockDataService.getProducts()
      updatedCable = updatedProds.find((p) => p.id === cable.id)!
      expect(updatedCable.current_stock).toBe(initialStock + 10)

      // Audit movements log must record the receipt
      const movements = await mockDataService.getMovementLogs({ product_id: cable.id })
      const latestReceiptMovement = movements.find(
        (m) => m.source_doc_number === receipt.receipt_number
      )
      expect(latestReceiptMovement).toBeDefined()
      expect(latestReceiptMovement?.movement_type).toBe('receipt')
      expect(latestReceiptMovement?.quantity_in).toBe(10)
      expect(latestReceiptMovement?.stock_balance_after).toBe(initialStock + 10)
    })

    it('rejects approving receipt twice', async () => {
      const prods = await mockDataService.getProducts()
      const receipt = await mockDataService.createReceipt({
        receipt_date: '2026-11-17',
        supplier_id: null,
        items: [{ product_id: prods[0].id, quantity: 5, unit_price: 100 }],
        action: 'approve',
      })

      expect(receipt.status).toBe('approved')

      // Second approval attempt must throw error
      await expect(mockDataService.approveReceipt(receipt.id)).rejects.toThrow(
        /معتمد مسبقاً/
      )
    })

    it('validates decimal quantity constraint on products that forbid decimals', async () => {
      const prods = await mockDataService.getProducts()
      const integerOnlyProduct = prods.find((p) => !p.allows_decimal_quantity)!

      // Attempting to create receipt with fractional quantity (e.g. 2.5)
      await expect(
        mockDataService.createReceipt({
          receipt_date: '2026-11-17',
          supplier_id: null,
          items: [{ product_id: integerOnlyProduct.id, quantity: 2.5, unit_price: 100 }],
        })
      ).rejects.toThrow(/يباع بالعدد الصحيح فقط/)
    })

    it('creates and approves stock issue, deducting stock and rejecting insufficient stock', async () => {
      const prods = await mockDataService.getProducts()
      const inStockProd = prods.find((p) => p.current_stock >= 10)!
      const curStock = inStockProd.current_stock

      // Approve issue of 4 units
      const issue = await mockDataService.createIssue({
        issue_date: '2026-11-17',
        recipient_name: 'مشروع برج الأمل',
        reason: 'تركيبات كهربائية',
        items: [{ product_id: inStockProd.id, quantity: 4 }],
        action: 'approve',
      })

      expect(issue.status).toBe('approved')

      const updatedProds = await mockDataService.getProducts()
      const updatedItem = updatedProds.find((p) => p.id === inStockProd.id)!
      expect(updatedItem.current_stock).toBe(curStock - 4)

      // Attempting to issue more than remaining stock must fail
      await expect(
        mockDataService.createIssue({
          issue_date: '2026-11-17',
          recipient_name: 'مشروع برج الأمل',
          items: [{ product_id: inStockProd.id, quantity: updatedItem.current_stock + 100 }],
          action: 'approve',
        })
      ).rejects.toThrow(/غير كاف/)
    })

    it('executes stock adjustment and accurately calculates discrepancy math', async () => {
      const prods = await mockDataService.getProducts()
      const prod = prods.find((p) => p.allows_decimal_quantity)!
      const oldStock = prod.current_stock

      const adjustment = await mockDataService.createAdjustment({
        adjustment_date: '2026-11-17',
        product_id: prod.id,
        actual_quantity: oldStock + 3.5,
        reason: 'جرد ربع سنوي وإثبات زيادة مساحية',
      })

      expect(adjustment.status).toBe('approved')
      expect(adjustment.items[0].recorded_quantity).toBe(oldStock)
      expect(adjustment.items[0].actual_quantity).toBe(oldStock + 3.5)
      expect(adjustment.items[0].difference).toBe(3.5)

      // Verified product stock updated directly to actual quantity
      const afterProds = await mockDataService.getProducts()
      const afterProd = afterProds.find((p) => p.id === prod.id)!
      expect(afterProd.current_stock).toBe(oldStock + 3.5)
    })
  })

  // 2. Component Integration Tests
  describe('InventoryPage UI Integration', () => {
    it('renders inventory overview and tab switchers properly', async () => {
      render(<InventoryPage />)

      await waitFor(() => {
        expect(screen.getByText('أذون وحركات المخزون المعصومة')).toBeInTheDocument()
      })

      expect(screen.getByText('إجمالي قيمة المخزون (بالتكلفة)')).toBeInTheDocument()
      expect(screen.getByText('أذون الاستلام (الوارد)')).toBeInTheDocument()
      expect(screen.getByText('أذون الصرف (المنصرف)')).toBeInTheDocument()
      expect(screen.getByText('تسويات الجرد')).toBeInTheDocument()
      expect(screen.getByText('سجل حركات المخزون')).toBeInTheDocument()
    })

    it('switches between tabs and displays the respective movement lists', async () => {
      render(<InventoryPage />)

      await waitFor(() => {
        expect(screen.getByText('أذون وحركات المخزون المعصومة')).toBeInTheDocument()
      })

      // Switch to Receipts Tab
      const receiptsTab = screen.getByRole('button', { name: /أذون الاستلام/ })
      fireEvent.click(receiptsTab)

      await waitFor(() => {
        expect(screen.getByText('أذون استلام البضاعة (الوارد والتوريدات)')).toBeInTheDocument()
      })

      // Switch to Issues Tab
      const issuesTab = screen.getByRole('button', { name: /أذون الصرف/ })
      fireEvent.click(issuesTab)

      await waitFor(() => {
        expect(screen.getByText('أذون صرف البضاعة من المخزن')).toBeInTheDocument()
      })

      // Switch to Adjustments Tab
      const adjTab = screen.getByRole('button', { name: /تسويات الجرد/ })
      fireEvent.click(adjTab)

      await waitFor(() => {
        expect(screen.getByText('تسويات الجرد المخزني الفعلي')).toBeInTheDocument()
      })

      // Switch to Movement History Tab
      const historyTab = screen.getByRole('button', { name: /سجل حركات المخزون/ })
      fireEvent.click(historyTab)

      await waitFor(() => {
        expect(screen.getByText('سجل حركات المخزون المعصوم (Audit Trail)')).toBeInTheDocument()
      })
    })

    it('allows opening the new receipt modal from receipts tab', async () => {
      render(<InventoryPage />)

      await waitFor(() => {
        expect(screen.getByText('أذون وحركات المخزون المعصومة')).toBeInTheDocument()
      })

      const receiptsTab = screen.getByRole('button', { name: /أذون الاستلام/ })
      fireEvent.click(receiptsTab)

      const addBtn = await screen.findByRole('button', { name: /إذن استلام بضاعة جديد/ })
      fireEvent.click(addBtn)

      expect(await screen.findByText('إنشاء إذن استلام بضاعة للمخزن (توريدات)')).toBeInTheDocument()
      expect(screen.getByText('بنود البضاعة المستلمة')).toBeInTheDocument()
    })
  })
})
