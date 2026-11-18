import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductsView } from '@/features/products/ProductsView'
import { mockDataService } from '@/services/mockDataService'

describe('Products & Inventory UI (Phase 2)', () => {
  beforeEach(() => {
    mockDataService.resetToDefaults()
  })

  it('renders products list with desktop table and mobile cards', async () => {
    render(<ProductsView />)

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع قائمة الأصناف/i)).not.toBeInTheDocument()
    })

    // Verify key products appear
    expect(screen.getAllByText(/كابل سويدي نحاس معزول 4 مم/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/قاطع أوتوماتيكي ثلاثي شنايدر/i).length).toBeGreaterThan(0)
  })

  it('filters products by search query for name or SKU', async () => {
    const user = userEvent.setup()
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع قائمة الأصناف/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/بحث بالاسم، كود الصنف/i)
    await user.type(searchInput, 'ELC-1002')

    await waitFor(() => {
      expect(screen.getAllByText(/قاطع أوتوماتيكي ثلاثي شنايدر/i).length).toBeGreaterThan(0)
      expect(screen.queryByText(/كابل سويدي نحاس معزول 4 مم/i)).not.toBeInTheDocument()
    })
  })

  it('filters products by stock status', async () => {
    const user = userEvent.setup()
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع قائمة الأصناف/i)).not.toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText(/تصفية حسب حالة المخزون/i)
    await user.selectOptions(statusSelect, 'out_of_stock')

    await waitFor(() => {
      // Out of stock product is 'طقم مفكات صلب معزولة 6 قطع'
      expect(screen.getAllByText(/طقم مفكات صلب معزولة 6 قطع/i).length).toBeGreaterThan(0)
      expect(screen.queryByText(/قاطع أوتوماتيكي ثلاثي شنايدر/i)).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no products match the search filter', async () => {
    const user = userEvent.setup()
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع قائمة الأصناف/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/بحث بالاسم، كود الصنف/i)
    await user.type(searchInput, 'صنف_غير_موجود_نهائيا')

    await waitFor(() => {
      expect(screen.getByText(/لا توجد أصناف مطابقة/i)).toBeInTheDocument()
    })
  })

  it('validates required fields in Add Product modal', async () => {
    const user = userEvent.setup()
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع قائمة الأصناف/i)).not.toBeInTheDocument()
    })

    // Click Add Product
    const addBtn = screen.getByRole('button', { name: /إضافة صنف جديد/i })
    await user.click(addBtn)

    expect(screen.getByText(/إضافة صنف جديد للمخزن/i)).toBeInTheDocument()

    // Submit empty form
    const submitBtn = screen.getByRole('button', { name: /إضافة الصنف/i })
    await user.click(submitBtn)

    // Validation errors should appear
    expect(screen.getByText(/يرجى إدخال كود الصنف \(SKU\)/i)).toBeInTheDocument()
    expect(screen.getByText(/يرجى إدخال اسم الصنف أو المنتج/i)).toBeInTheDocument()
  })

  it('adds a new product and reflects it in the UI', async () => {
    const user = userEvent.setup()
    render(<ProductsView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع قائمة الأصناف/i)).not.toBeInTheDocument()
    })

    // Open Modal
    await user.click(screen.getByRole('button', { name: /إضافة صنف جديد/i }))

    // Fill form
    await user.type(screen.getByLabelText(/كود الصنف \(SKU\)/i), 'TEST-999')
    await user.type(screen.getByLabelText(/اسم الصنف \/ المنتج/i), 'صنف اختبار تجريبي جديد')
    await user.type(screen.getByLabelText(/سعر البيع الافتراضي/i), '250')

    // Submit
    await user.click(screen.getByRole('button', { name: /إضافة الصنف/i }))

    // Verification
    await waitFor(() => {
      expect(screen.getAllByText(/صنف اختبار تجريبي جديد/i).length).toBeGreaterThan(0)
    })
  })
})
