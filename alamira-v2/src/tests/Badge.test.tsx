import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge Component', () => {
  it('renders badge label correctly', () => {
    render(<Badge>معتمدة</Badge>)
    expect(screen.getByText('معتمدة')).toBeInTheDocument()
  })

  it('renders with dot indicator when dot prop is true', () => {
    const { container } = render(<Badge dot variant="emerald">نشط</Badge>)
    const dot = container.querySelector('.rounded-full.shrink-0')
    expect(dot).toBeInTheDocument()
  })
})
