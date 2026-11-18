import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders button with correct text label', () => {
    render(<Button>حفظ البيانات</Button>)
    expect(screen.getByRole('button', { name: /حفظ البيانات/i })).toBeInTheDocument()
  })

  it('handles click events properly', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={handleClick}>اضغط هنا</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled and prevents clicks when disabled prop is true', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(<Button disabled onClick={handleClick}>معطل</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('displays loading state and disables the button when isLoading is true', () => {
    render(<Button isLoading>جاري المعالجة</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders start and end icons when provided', () => {
    render(
      <Button
        startIcon={<span data-testid="start-icon">★</span>}
        endIcon={<span data-testid="end-icon">▶</span>}
      >
        أيقونة
      </Button>
    )
    expect(screen.getByTestId('start-icon')).toBeInTheDocument()
    expect(screen.getByTestId('end-icon')).toBeInTheDocument()
  })
})
