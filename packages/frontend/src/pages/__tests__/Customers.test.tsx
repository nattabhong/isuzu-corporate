import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Customers } from '../Customers'
import * as apiModule from '../../lib/api'

vi.mock('../../lib/api', () => ({
  fetchCustomers: vi.fn(),
  createCustomer: vi.fn(),
}))

const mockCustomers = [
  {
    id: '1',
    name: 'บริษัท สยามขนส่ง จำกัด',
    companyType: 'บริษัทจำกัด',
    industry: 'ขนส่ง',
    address: '123 ถนนสุขุมวิท',
    province: 'กรุงเทพมหานคร',
    district: 'คลองเตย',
    lat: null,
    lng: null,
    segment: 'A' as const,
    assignedTo: 'rep-1',
    status: 'active' as const,
    createdAt: '2026-01-01',
    updatedAt: '2026-07-01',
  },
  {
    id: '2',
    name: 'ห้างหุ้นส่วน เชียงใหม่ก่อสร้าง',
    companyType: 'ห้างหุ้นส่วนจำกัด',
    industry: 'ก่อสร้าง',
    address: '456 ถนนห้วยแก้ว',
    province: 'เชียงใหม่',
    district: 'เมือง',
    lat: null,
    lng: null,
    segment: 'B' as const,
    assignedTo: 'rep-2',
    status: 'active' as const,
    createdAt: '2026-02-01',
    updatedAt: '2026-07-01',
  },
  {
    id: '3',
    name: 'ร้านค้า โคราชอะไหล่ยนต์',
    companyType: null,
    industry: 'ค้าปลีก',
    address: null,
    province: 'นครราชสีมา',
    district: null,
    lat: null,
    lng: null,
    segment: 'C' as const,
    assignedTo: null,
    status: 'prospect' as const,
    createdAt: '2026-03-01',
    updatedAt: '2026-07-01',
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <Customers />
    </MemoryRouter>,
  )
}

describe('Customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    expect(screen.getByText('ลูกค้าองค์กร')).toBeInTheDocument()
  })

  it('renders loading state initially', () => {
    vi.mocked(apiModule.fetchCustomers).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
  })

  it('renders empty state when no customers', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ไม่พบข้อมูลลูกค้า')).toBeInTheDocument()
    })
  })

  it('renders error state on fetch failure', async () => {
    vi.mocked(apiModule.fetchCustomers).mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/โหลดข้อมูลไม่สำเร็จ/)).toBeInTheDocument()
    })
  })

  it('renders customers in table', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue(mockCustomers)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('บริษัท สยามขนส่ง จำกัด')).toBeInTheDocument()
    })

    expect(screen.getByText('ห้างหุ้นส่วน เชียงใหม่ก่อสร้าง')).toBeInTheDocument()
    expect(screen.getByText('ร้านค้า โคราชอะไหล่ยนต์')).toBeInTheDocument()
  })

  it('renders segment badges with correct text', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue(mockCustomers)
    renderPage()

    await waitFor(() => {
      const badges = screen.getAllByText(/^(A|B|C)$/)
      expect(badges).toHaveLength(3)
      expect(badges[0]).toHaveTextContent('A')
      expect(badges[1]).toHaveTextContent('B')
      expect(badges[2]).toHaveTextContent('C')
    })
  })

  it('renders status badges', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue(mockCustomers)
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Prospect')).toBeInTheDocument()
    })
  })

  it('renders search input', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('ค้นหาชื่อบริษัท...')).toBeInTheDocument()
    })
  })

  it('renders segment filter tabs: ทั้งหมด, A, B, C', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'ทั้งหมด' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'A' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'B' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'C' })).toBeInTheDocument()
    })
  })

  it('refetches when segment tab is clicked', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue(mockCustomers)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('บริษัท สยามขนส่ง จำกัด')).toBeInTheDocument()
    })

    vi.clearAllMocks()
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([mockCustomers[0]])

    fireEvent.click(screen.getByRole('tab', { name: 'A' }))

    await waitFor(() => {
      expect(apiModule.fetchCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ segment: 'A' }),
      )
    })
  })

  it('filters by search term', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue(mockCustomers)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('บริษัท สยามขนส่ง จำกัด')).toBeInTheDocument()
    })

    vi.clearAllMocks()
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([mockCustomers[0]])

    const searchInput = screen.getByPlaceholderText('ค้นหาชื่อบริษัท...')
    fireEvent.change(searchInput, { target: { value: 'สยาม' } })

    await waitFor(() => {
      expect(apiModule.fetchCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'สยาม' }),
      )
    })
  })

  it('renders Add Customer button', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /เพิ่มลูกค้า/i })).toBeInTheDocument()
    })
  })

  it('opens modal when Add Customer is clicked', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /เพิ่มลูกค้า/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มลูกค้า/i }))

    await waitFor(() => {
      expect(screen.getByText('เพิ่มลูกค้าใหม่')).toBeInTheDocument()
      expect(screen.getByLabelText('ชื่อบริษัท')).toBeInTheDocument()
    })
  })

  it('closes modal when cancel is clicked', async () => {
    vi.mocked(apiModule.fetchCustomers).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /เพิ่มลูกค้า/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มลูกค้า/i }))
    await waitFor(() => {
      expect(screen.getByText('เพิ่มลูกค้าใหม่')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ยกเลิก/i }))
    await waitFor(() => {
      expect(screen.queryByText('เพิ่มลูกค้าใหม่')).not.toBeInTheDocument()
    })
  })
})
