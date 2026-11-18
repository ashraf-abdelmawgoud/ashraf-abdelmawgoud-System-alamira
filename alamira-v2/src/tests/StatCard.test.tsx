import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/ui/StatCard'

describe('StatCard Component', () => {
  it('renders title, value, and subtitle correctly', () => {
    render(
      <StatCard
        title="مبيعات اليوم"
        value="25,000 ج.م"
        subtitle="15 فاتورة معتمدة"
        icon={<span data-testid="metric-icon">💰</span>}
      />
    )

    expect(screen.getByText('مبيعات اليوم')).toBeInTheDocument()
    expect(screen.getByText('25,000 ج.م')).toBeInTheDocument()
    expect(screen.getByText('15 فاتورة معتمدة')).toBeInTheDocument()
    expect(screen.getByTestId('metric-icon')).toBeInTheDocument()
  })

  it('renders trend information when provided', () => {
    render(
      <StatCard
        title="إجمالي المبيعات"
        value="100,000 ج.م"
        icon={<span>📈</span>}
        trend={{
          value: '+15%',
          isPositive: true,
          label: 'مقارنة بالشهر السابق',
        }}
      />
    )

    expect(screen.getByText('+15%')).toBeInTheDocument()
    expect(screen.getByText('مقارنة بالشهر السابق')).toBeInTheDocument()
  })
})
