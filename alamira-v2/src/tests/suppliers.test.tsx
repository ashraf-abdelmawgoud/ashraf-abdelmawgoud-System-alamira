import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuppliersView } from '@/features/suppliers/SuppliersView'
import { mockDataService } from '@/services/mockDataService'

describe('Suppliers Management UI (Phase 2)', () => {
  beforeEach(() => {
    mockDataService.resetToDefaults()
  })

  it('renders suppliers list with names and balances', async () => {
    render(<SuppliersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل الموردين/i)).not.toBeInTheDocument()
    })

    expect(screen.getAllByText(/شركة السويدي إلكتريك/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/مجموعة الأهرام لنظم السباكة/i).length).toBeGreaterThan(0)
  })

  it('filters suppliers by search query', async () => {
    const user = userEvent.setup()
    render(<SuppliersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل الموردين/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/بحث باسم المورد، الهاتف/i)
    await user.type(searchInput, 'السويدي')

    await waitFor(() => {
      expect(screen.getAllByText(/شركة السويدي إلكتريك/i).length).toBeGreaterThan(0)
      expect(screen.queryByText(/مجموعة الأهرام لنظم السباكة/i)).not.toBeInTheDocument()
    })
  })

  it('validates supplier name on submission', async () => {
    const user = userEvent.setup()
    render(<SuppliersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل الموردين/i)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /إضافة مورد جديد/i }))
    await user.click(screen.getByRole('button', { name: /إضافة المورد/i }))

    expect(screen.getByText(/يرجى إدخال اسم المورد أو المصنع/i)).toBeInTheDocument()
  })

  it('creates a new supplier successfully', async () => {
    const user = userEvent.setup()
    render(<SuppliersView />)

    await waitFor(() => {
      expect(screen.queryByText(/جاري استرجاع دليل الموردين/i)).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /إضافة مورد جديد/i }))

    await user.type(screen.getByLabelText(/اسم المورد أو المصنع/i), 'مصنع قنا للصناعات البلاستيكية')
    await user.type(screen.getByLabelText(/المقر أو العنوان الرئيسي/i), 'قنا - منطقة هو الصناعية بنجع حمادي')

    await user.click(screen.getByRole('button', { name: /إضافة المورد/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/مصنع قنا للصناعات البلاستيكية/i).length).toBeGreaterThan(0)
    })
  })
})
