import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CallPlanner } from '../CallPlanner'

// Mock the api module
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  fetchCustomers: vi.fn(),
  fetchTeamMembers: vi.fn(),
}))

import { api, fetchCustomers, fetchTeamMembers } from '../../lib/api'

const mockPlans = [
  {
    id: 'cp1',
    customerId: 'c1',
    salesRepId: 'sr1',
    month: '2026-08',
    plannedDate: '2026-08-10',
    callPurpose: 'follow_up' as const,
    status: 'planned' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'บริษัท สยามยนต์ จำกัด',
    salesRepName: 'สมชาย ใจดี',
  },
  {
    id: 'cp2',
    customerId: 'c2',
    salesRepId: 'sr1',
    month: '2026-08',
    plannedDate: '2026-08-15',
    callPurpose: 'check_in' as const,
    status: 'completed' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'ห้างหุ้นส่วน เชียงใหม่ขนส่ง',
    salesRepName: 'สมชาย ใจดี',
  },
  {
    id: 'cp3',
    customerId: 'c3',
    salesRepId: 'sr2',
    month: '2026-08',
    plannedDate: '2026-08-20',
    callPurpose: 'offer' as const,
    status: 'missed' as const,
    createdAt: '2026-08-01T00:00:00Z',
    customerName: 'บริษัท นอร์ทเทิร์นโลจิสติกส์',
    salesRepName: 'สมศรี มั่นคง',
  },
]

describe('CallPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockPlans,
      error: undefined,
    })
  })

  it('renders page heading in Thai', async () => {
    render(<CallPlanner />)

    // Heading renders immediately
    expect(screen.getByText('แผนการโทร')).toBeInTheDocument()
  })

  it('renders month selector input with type=month', () => {
    render(<CallPlanner />)

    const monthInput = screen.getByLabelText('เดือน')
    expect(monthInput).toBeInTheDocument()
    expect(monthInput).toHaveAttribute('type', 'month')
  })

  it('renders "บันทึกการโทร" button', () => {
    render(<CallPlanner />)

    const btn = screen.getByRole('button', { name: 'บันทึกการโทร' })
    expect(btn).toBeInTheDocument()
  })

  it('renders "Generate" button', () => {
    render(<CallPlanner />)

    const btn = screen.getByRole('button', { name: 'Generate' })
    expect(btn).toBeInTheDocument()
  })

  it('renders table headers', async () => {
    render(<CallPlanner />)

    // Wait for plans to load first
    await screen.findByText('บริษัท สยามยนต์ จำกัด')

    const headers = ['ลูกค้า', 'วันที่', 'วัตถุประสงค์', 'เซลล์', 'สถานะ']
    for (const header of headers) {
      const elements = screen.queryAllByText(header)
      expect(elements.length).toBeGreaterThan(0)
    }
  })

  it('renders customer names from plans', async () => {
    render(<CallPlanner />)

    // Wait for plans to load
    const siam = await screen.findByText('บริษัท สยามยนต์ จำกัด')
    expect(siam).toBeInTheDocument()

    const transport = screen.getByText('ห้างหุ้นส่วน เชียงใหม่ขนส่ง')
    expect(transport).toBeInTheDocument()
  })

  it('renders status badges in Thai', async () => {
    render(<CallPlanner />)

    const planned = await screen.findByText('ตามแผน')
    expect(planned).toBeInTheDocument()

    const completed = screen.getByText('สำเร็จ')
    expect(completed).toBeInTheDocument()

    const missed = screen.getByText('พลาด')
    expect(missed).toBeInTheDocument()
  })

  it('renders call purpose labels', async () => {
    render(<CallPlanner />)

    const followup = await screen.findByText('ติดตาม')
    expect(followup).toBeInTheDocument()

    const checkin = screen.getByText('เช็คอิน')
    expect(checkin).toBeInTheDocument()

    const offer = screen.getByText('เสนอขาย')
    expect(offer).toBeInTheDocument()
  })

  it('renders planned dates in Thai format', async () => {
    render(<CallPlanner />)

    const date1 = await screen.findByText('10 ส.ค. 2026')
    expect(date1).toBeInTheDocument()

    const date2 = screen.getByText('15 ส.ค. 2026')
    expect(date2).toBeInTheDocument()
  })

  it('renders sales rep filter with unique names', async () => {
    render(<CallPlanner />)

    // Wait for plans to load
    await screen.findByText('บริษัท สยามยนต์ จำกัด')

    const repFilter = screen.getByLabelText('เซลล์')
    expect(repFilter).toBeInTheDocument()

    // Both reps should appear as options
    expect(screen.getAllByText('สมชาย ใจดี').length).toBeGreaterThan(0)
    expect(screen.getAllByText('สมศรี มั่นคง').length).toBeGreaterThan(0)
  })

  it('handles API error gracefully', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    render(<CallPlanner />)

    const errorMsg = await screen.findByText('Network error')
    expect(errorMsg).toBeInTheDocument()
  })

  it.skip('opens CallForm modal when "บันทึกการโทร" button is clicked', async () => {
    // Mock fetch calls for form
    ;(fetchCustomers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'c1', name: 'บริษัท สยามยนต์ จำกัด' },
    ])
    ;(fetchTeamMembers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'tm1', name: 'สมชาย ใจดี' },
    ])

    render(<CallPlanner />)

    // Click "บันทึกการโทร"
    const btn = screen.getAllByRole('button', { name: 'บันทึกการโทร' })[0]
    fireEvent.click(btn)

    // Modal should open
    const modalTitle = await screen.findByText('บันทึกการโทร')
    expect(modalTitle).toBeInTheDocument()

    // Check that form fields are rendered
    expect(screen.getByText('ส่วนที่ 1: ข้อมูลลูกค้า')).toBeInTheDocument()
  })
})
