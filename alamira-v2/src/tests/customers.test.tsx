import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomersView } from '@/features/customers/CustomersView'
import { mockDataService } from '@/services/mockDataService'

describe('Customers Management UI (Phase 2)', () => {
  beforeEach(() => {
    mockDataService.resetToDefaults()
  })

  it('renders customers list with names, phones, and balances', async () => {
    render(<CustomersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل العملاء/i)).not.toBeInTheDocument()
    })

    expect(screen.getAllByText(/مؤسسة الأمل للمقاولات العامة/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/مكتب المهندس أحمد محمود/i).length).toBeGreaterThan(0)
  })

  it('filters customers by search text', async () => {
    const user = userEvent.setup()
    render(<CustomersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل العملاء/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/بحث باسم العميل، الهاتف/i)
    await user.type(searchInput, 'أحمد محمود')

    await waitFor(() => {
      expect(screen.getAllByText(/مكتب المهندس أحمد محمود/i).length).toBeGreaterThan(0)
      expect(screen.queryByText(/مؤسسة الأمل للمقاولات العامة/i)).not.toBeInTheDocument()
    })
  })

  it('validates customer name on submission', async () => {
    const user = userEvent.setup()
    render(<CustomersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل العملاء/i)).not.toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /إضافة عميل جديد/i })
    await user.click(addBtn)

    const submitBtn = screen.getByRole('button', { name: /إضافة العميل/i })
    await user.click(submitBtn)

    expect(screen.getByText(/يرجى إدخال اسم العميل أو المؤسسة/i)).toBeInTheDocument()
  })

  it('successfully creates a customer in mock memory', async () => {
    const user = userEvent.setup()
    render(<CustomersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل العملاء/i)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /إضافة عميل جديد/i }))

    await user.type(screen.getByLabelText(/اسم العميل أو الجهة/i), 'شركة الصفوة للتجارة بقنا')
    await user.type(screen.getByLabelText(/رقم الهاتف للتواصل/i), '01055443322')
    await user.type(screen.getByLabelText(/العنوان والمقر/i), 'قنا - بجوار المعنا')

    await user.click(screen.getByRole('button', { name: /إضافة العميل/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/شركة الصفوة للتجارة بقنا/i).length).toBeGreaterThan(0)
    })
  })
})
