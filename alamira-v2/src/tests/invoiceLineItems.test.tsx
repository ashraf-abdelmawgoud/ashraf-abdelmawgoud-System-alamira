import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InvoiceLineItems, LineItemFormState } from '@/features/invoices/InvoiceLineItems'
import { calculateLineItem, CalculatedLineItem } from '@/domain/invoiceCalculations'
import { Product } from '@/types'

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
    current_stock: 0,
    currentStock: 0,
    min_stock_level: 5,
    minStockLevel: 5,
    isLowStock: true,
    is_active: true,
    allows_decimal_quantity: false,
  },
]

const initialItems: LineItemFormState[] = [
  {
    productId: 'prod-1',
    quantity: 5,
    unitPrice: 50,
    discountType: 'none',
    discountValue: 0,
  },
]

const calculatedItems: CalculatedLineItem[] = [
  calculateLineItem({
    productId: 'prod-1',
    quantity: 5,
    unitPrice: 50,
    discountType: 'none',
    discountValue: 0,
  }),
]

describe('InvoiceLineItems Redesign (Task 1)', () => {
  it('renders exact Arabic label "إضافة صنف" with brand navy styling', () => {
    const onAddItem = vi.fn()
    render(
      <InvoiceLineItems
        items={initialItems}
        calculatedItems={calculatedItems}
        products={mockProducts}
        onItemChange={vi.fn()}
        onAddItem={onAddItem}
        onRemoveItem={vi.fn()}
      />
    )

    const addBtn = screen.getByRole('button', { name: 'إضافة صنف' })
    expect(addBtn).toBeInTheDocument()
    expect(addBtn.textContent?.trim()).toBe('إضافة صنف')

    // Verify brand navy class
    expect(addBtn.className).toContain('bg-[#11243A]')
    expect(addBtn.className).toContain('hover:bg-[#1E3A5F]')
    expect(addBtn.className).toContain('text-white')

    // Click handler
    fireEvent.click(addBtn)
    expect(onAddItem).toHaveBeenCalledTimes(1)
  })

  it('displays unit next to quantity and shows net total and delete action', () => {
    const onRemoveItem = vi.fn()
    render(
      <InvoiceLineItems
        items={initialItems}
        calculatedItems={calculatedItems}
        products={mockProducts}
        onItemChange={vi.fn()}
        onAddItem={vi.fn()}
        onRemoveItem={onRemoveItem}
      />
    )

    // Unit display
    const units = screen.getAllByText('متر')
    expect(units.length).toBeGreaterThan(0)

    // Net line amount
    expect(screen.getAllByText(/250(\.00)?/i).length).toBeGreaterThan(0)

    // Delete action button exists
    const deleteButtons = screen.getAllByRole('button', { name: /حذف البند/i })
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('renders out-of-stock warning when a zero-stock product is selected', () => {
    const zeroStockItems: LineItemFormState[] = [
      {
        productId: 'prod-2',
        quantity: 1,
        unitPrice: 120,
        discountType: 'none',
        discountValue: 0,
      },
    ]

    const zeroStockCalculated: CalculatedLineItem[] = [
      calculateLineItem({
        productId: 'prod-2',
        quantity: 1,
        unitPrice: 120,
        discountType: 'none',
        discountValue: 0,
      }),
    ]

    render(
      <InvoiceLineItems
        items={zeroStockItems}
        calculatedItems={zeroStockCalculated}
        products={mockProducts}
        onItemChange={vi.fn()}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
      />
    )

    expect(screen.getAllByText(/رصيد المخزن: 0|غير متوفر بالمخزن/i).length).toBeGreaterThan(0)
  })
})
