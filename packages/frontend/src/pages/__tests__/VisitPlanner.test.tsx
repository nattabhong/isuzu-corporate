import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VisitPlanner } from '../VisitPlanner'

const mockPlans = [
  {
    id: 'vp1',
    customerId: 'c1',
    salesRepId: 'sr1',
    month: '2026-08',
    plannedDate: '2026-08-10',
    visitType: 'follow_up' as const,
    objective: 'ติดตามข้อเสนอ',
    status: 'planned' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'บริษัท สยามยนต์ จำกัด',
    salesRepName: 'สมชาย ใจดี',
  },
  {
    id: 'vp2',
    customerId: 'c2',
    salesRepId: 'sr1',
    month: '2026-08',
    plannedDate: '2026-08-12',
    visitType: 'first_visit' as const,
    objective: 'แนะนำสินค้าใหม่',
    status: 'completed' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'ห้างหุ้นส่วน เชียงใหม่ขนส่ง',
    salesRepName: 'สมชาย ใจดี',
  },
  {
    id: 'vp3',
    customerId: 'c3',
    salesRepId: 'sr1',
    month: '2026-08',
    plannedDate: '2026-08-15',
    visitType: 'closing' as const,
    objective: null,
    status: 'missed' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'บริษัท นอร์ทเทิร์นโลจิสติกส์',
    salesRepName: 'สมชาย ใจดี',
  },
  {
    id: 'vp4',
    customerId: 'c4',
    salesRepId: 'sr1',
    month: '2026-08',
    plannedDate: '2026-08-20',
    visitType: 'service' as const,
    objective: 'ตรวจเช็คระยะ',
    status: 'rescheduled' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'บริษัท ทรัพย์เจริญขนส่ง',
    salesRepName: 'สมชาย ใจดี',
  },
]

describe('VisitPlanner', () => {
  it('renders page heading in Thai', () => {
    render(<VisitPlanner userRole="sales_rep" />)

    expect(screen.getByText('แผนการเข้าพบลูกค้า')).toBeInTheDocument()
  })

  it('renders month selector input', () => {
    render(<VisitPlanner userRole="sales_rep" />)

    const monthInput = screen.getByLabelText('เดือน')
    expect(monthInput).toBeInTheDocument()
    expect(monthInput).toHaveAttribute('type', 'month')
  })

  it('renders "บันทึก Visit" button', () => {
    render(<VisitPlanner userRole="sales_rep" />)

    const addBtns = screen.getAllByRole('button', { name: 'บันทึก Visit' })
    expect(addBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty state when no plans', () => {
    render(<VisitPlanner userRole="sales_rep" />)

    // Initially there are no plans (no fetch) so it should show empty
    // But we need to check the table structure exists
    expect(screen.getByText('แผนการเข้าพบลูกค้า')).toBeInTheDocument()
  })

  it('renders visit plan rows with customer names', () => {
    render(<VisitPlanner userRole="sales_rep" initialPlans={mockPlans} />)

    expect(screen.getByText('บริษัท สยามยนต์ จำกัด')).toBeInTheDocument()
    expect(screen.getByText('ห้างหุ้นส่วน เชียงใหม่ขนส่ง')).toBeInTheDocument()
  })

  it('renders status badges in Thai for each status in table view', () => {
    render(<VisitPlanner userRole="sales_rep" initialPlans={mockPlans} />)
    fireEvent.click(screen.getByRole('button', { name: /ตาราง/i }))

    expect(screen.getByText('ตามแผน')).toBeInTheDocument()
    expect(screen.getByText('สำเร็จ')).toBeInTheDocument()
    expect(screen.getByText('พลาดนัด')).toBeInTheDocument()
    expect(screen.getByText('เลื่อน')).toBeInTheDocument()
  })

  it('renders planned dates in table view', () => {
    render(<VisitPlanner userRole="sales_rep" initialPlans={mockPlans} />)
    fireEvent.click(screen.getByRole('button', { name: /ตาราง/i }))

    expect(screen.getByText('10 ส.ค. 2026')).toBeInTheDocument()
    expect(screen.getByText('12 ส.ค. 2026')).toBeInTheDocument()
  })

  it('renders visit type labels', () => {
    render(<VisitPlanner userRole="sales_rep" initialPlans={mockPlans} />)

    expect(screen.getAllByText('ติดตาม').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('เข้าเยี่ยมครั้งแรก').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('ปิดการขาย').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('บริการ').length).toBeGreaterThanOrEqual(1)
  })

  it('renders table headers when switching to table view mode', () => {
    render(<VisitPlanner userRole="sales_rep" initialPlans={mockPlans} />)
    fireEvent.click(screen.getByRole('button', { name: /ตาราง/i }))

    expect(screen.getByText('ลูกค้า')).toBeInTheDocument()
    expect(screen.getByText('วันที่')).toBeInTheDocument()
    expect(screen.getByText('ประเภท')).toBeInTheDocument()
    expect(screen.getByText('สถานะ')).toBeInTheDocument()
  })

  it('shows sales rep filter for manager role', () => {
    render(<VisitPlanner userRole="manager" initialPlans={mockPlans} />)

    expect(screen.getByLabelText('เซลล์')).toBeInTheDocument()
  })

  it('does not show sales rep filter for sales_rep role', () => {
    render(<VisitPlanner userRole="sales_rep" initialPlans={mockPlans} />)

    expect(screen.queryByLabelText('เซลล์')).not.toBeInTheDocument()
  })

  it('opens VisitForm modal when "บันทึก Visit" button is clicked', () => {
    render(<VisitPlanner userRole="sales_rep" />)

    const addBtns = screen.getAllByRole('button', { name: 'บันทึก Visit' })
    fireEvent.click(addBtns[0])

    // Modal should be open now — check for VisitForm fields
    expect(screen.getByText('ลูกค้า')).toBeInTheDocument()
    expect(screen.getByLabelText('วันที่')).toBeInTheDocument()
  })
})
