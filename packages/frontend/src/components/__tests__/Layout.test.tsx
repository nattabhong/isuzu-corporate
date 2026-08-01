import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'

function renderLayout(role: 'manager' | 'sales_rep') {
  return render(
    <MemoryRouter>
      <Layout role={role}>
        <div data-testid="child-content">Child Content</div>
      </Layout>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  it('renders children in content area', () => {
    renderLayout('sales_rep')

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('renders sidebar', () => {
    renderLayout('sales_rep')

    // Sidebar renders common items
    expect(screen.getByText('ภาพรวม')).toBeInTheDocument()
  })

  it('renders manager-only sidebar items for manager role', () => {
    renderLayout('manager')

    expect(screen.getByText('รายงาน')).toBeInTheDocument()
    expect(screen.getByText('ตั้งค่า')).toBeInTheDocument()
  })

  it('does not render manager-only sidebar items for sales_rep role', () => {
    renderLayout('sales_rep')

    expect(screen.queryByText('รายงาน')).not.toBeInTheDocument()
    expect(screen.queryByText('ตั้งค่า')).not.toBeInTheDocument()
  })
})
