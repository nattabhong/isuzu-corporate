import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../Sidebar'

function renderSidebar(role: 'manager' | 'sales_rep') {
  return render(
    <MemoryRouter>
      <Sidebar role={role} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders common navigation items for all roles', () => {
    renderSidebar('sales_rep')

    expect(screen.getByText('ภาพรวม')).toBeInTheDocument()
    expect(screen.getByText('ลูกค้าองค์กร')).toBeInTheDocument()
    expect(screen.getByText('Visit')).toBeInTheDocument()
    expect(screen.getByText('Call')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
  })

  it('renders manager-only items for manager role', () => {
    renderSidebar('manager')

    expect(screen.getByText('รายงาน')).toBeInTheDocument()
    expect(screen.getByText('ตั้งค่า')).toBeInTheDocument()
  })

  it('does not render manager-only items for sales_rep role', () => {
    renderSidebar('sales_rep')

    expect(screen.queryByText('รายงาน')).not.toBeInTheDocument()
    expect(screen.queryByText('ตั้งค่า')).not.toBeInTheDocument()
  })

  it('links common items to correct routes', () => {
    renderSidebar('sales_rep')

    expect(screen.getByText('ภาพรวม').closest('a')).toHaveAttribute('href', '/overview')
    expect(screen.getByText('ลูกค้าองค์กร').closest('a')).toHaveAttribute('href', '/customers')
    expect(screen.getByText('Visit').closest('a')).toHaveAttribute('href', '/visits')
    expect(screen.getByText('Call').closest('a')).toHaveAttribute('href', '/calls')
    expect(screen.getByText('Pipeline').closest('a')).toHaveAttribute('href', '/deals')
  })

  it('links manager items to correct routes', () => {
    renderSidebar('manager')

    expect(screen.getByText('รายงาน').closest('a')).toHaveAttribute('href', '/reports')
    expect(screen.getByText('ตั้งค่า').closest('a')).toHaveAttribute('href', '/settings')
  })
})
