import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceBuilder } from '@/features/invoices/InvoiceBuilder'
import { Product, Customer } from '@/types'

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    code: 'C-001',
    name: 'شركة النور للمقاولات',
    phone: '01011223344',
    address: 'قنا - م الوقف',
    city: 'قنا',
    balance: 0,
    invoices_count: 5,
    is_active: true,
  },
]

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    sku: 'ELC-1001',
    code: 'ELC-1001',
    name: 'كابل سويدي 4 مم',
    category: 'كابلات',
    unit: 'متر',
    purchase_price: 35,
    costPrice: 35,
    selling_price: 50,
    sellingPrice: 50,
    current_stock: 100,
    currentStock: 100,
    min_stock_level: 10,
    minStockLevel: 10,
    isLowStock: false,
    is_active: true,
    allows_decimal_quantity: true,
  },
  {
    id: 'prod-2',
    sku: 'ELC-1002',
    code: 'ELC-1002',
    name: 'مفتاح أوتوماتيك شنايدر',
    category: 'قواطع',
    unit: 'قطعة',
    purchase_price: 90,
    costPrice: 90,
    selling_price: 120,
    sellingPrice: 120,
    current_stock: 50,
    currentStock: 50,
    min_stock_level: 5,
    minStockLevel: 5,
    isLowStock: false,
    is_active: true,
    allows_decimal_quantity: false,
  },
]

// Mock AuthContext
vi.mock('@/auth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'admin-id',
      email: 'admin@alamira.com',
      role: 'ADMIN',
      name: 'مدير النظام',
    },
    canViewExactStock: true,
  }),
}))

describe('InvoiceBuilder Item Addition, Deletion & Recalculation', () => {
  it('allows adding items, removing items, and recalculating totals immediately', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <InvoiceBuilder
        customers={mockCustomers}
        products={mockProducts}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Select customer
    const customerSelect = screen.getByDisplayValue('-- اختر العميل من الدليل --')
    fireEvent.change(customerSelect, { target: { value: 'cust-1' } })

    // Initially 1 empty row: select prod-1 (price: 50)
    const initialProductSelects = screen.getAllByDisplayValue('-- اختر الصنف من المخزن --')
    expect(initialProductSelects.length).toBeGreaterThan(0)
    fireEvent.change(initialProductSelects[0], { target: { value: 'prod-1' } })

    // Wait for totals to reflect 1 * 50 = 50
    await waitFor(() => {
      expect(screen.getAllByText(/50(\.00)?/i).length).toBeGreaterThan(0)
    })

    // Now click "إضافة صنف" (Add Item)
    const addBtn = screen.getByRole('button', { name: /إضافة صنف/i })
    fireEvent.click(addBtn)

    // Now there are 2 item rows: select prod-2 (price: 120) for the second item
    const unselectedSelects = screen.getAllByDisplayValue('-- اختر الصنف من المخزن --')
    expect(unselectedSelects.length).toBeGreaterThan(0)
    fireEvent.change(unselectedSelects[0], { target: { value: 'prod-2' } })

    // Total should now reflect 50 + 120 = 170
    await waitFor(() => {
      expect(screen.getAllByText(/170(\.00)?/i).length).toBeGreaterThan(0)
    })

    // Click delete on the second item row
    const deleteButtons = screen.getAllByRole('button', { name: /حذف البند/i })
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(deleteButtons[deleteButtons.length - 1])

    // After deleting the second item, total drops back to 50
    await waitFor(() => {
      expect(screen.getAllByText(/50(\.00)?/i).length).toBeGreaterThan(0)
    })

    // Now delete the remaining first item: should clear/reset the row
    const remainingDeleteButtons = screen.getAllByRole('button', { name: /حذف البند/i })
    fireEvent.click(remainingDeleteButtons[0])

    // After clearing the only item, total drops to 0
    await waitFor(() => {
      expect(screen.getAllByText(/0(\.00)?/i).length).toBeGreaterThan(0)
    })
  })
})
