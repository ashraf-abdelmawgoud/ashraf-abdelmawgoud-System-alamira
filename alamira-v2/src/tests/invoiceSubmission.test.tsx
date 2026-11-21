import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InvoiceBuilder } from '@/features/invoices/InvoiceBuilder'
import type { SalesInvoice } from '@/types'

vi.mock('@/auth', () => ({ useAuth: () => ({ currentUser: { role: 'ADMIN' } }) }))
const initial = {
  id: 'test-invoice', invoice_date: '2026-01-01', customer_id: 'test-customer',
  invoice_discount_type: 'none', invoice_discount_value: 0, additional_charges: 0,
  items: [{ id: 'test-item', product_id: 'test-product', quantity: 1, unit_price: 10, discount_type: 'none', discount_value: 0 }],
} as SalesInvoice

describe('invoice submission guard', () => {
  it('allows one outstanding save and releases the guard after failure', async () => {
    let rejectSave!: (error: Error) => void
    const onSave = vi.fn(() => new Promise<SalesInvoice>((_, reject) => { rejectSave = reject }))
    const onClose = vi.fn()
    render(<InvoiceBuilder initialInvoice={initial} customers={[]} products={[]} onSave={onSave} onClose={onClose} />)
    const buttons = screen.getAllByRole('button')
    const save = buttons.find(button => /مسودة/.test(button.textContent ?? ''))!
    expect(save).toBeDefined()
    act(() => { fireEvent.click(save); fireEvent.click(save) })
    expect(onSave).toHaveBeenCalledTimes(1)
    await act(async () => { rejectSave(new Error('Synthetic failure')) })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Synthetic failure')).toBeInTheDocument()
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledTimes(2)
    await act(async () => { rejectSave(new Error('Synthetic failure')) })
  })
})
