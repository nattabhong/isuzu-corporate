import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CustomerDetail } from '../CustomerDetail'
import * as apiModule from '../../lib/api'

vi.mock('../../lib/api', () => ({
  fetchCustomerDetail: vi.fn(),
  addContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
}))

const mockCustomerDetail = {
  id: '1',
  name: 'บริษัท สยามขนส่ง จำกัด',
  companyType: 'บริษัทจำกัด',
  industry: 'ขนส่ง',
  address: '123 ถนนสุขุมวิท แขวงคลองเตย',
  province: 'กรุงเทพมหานคร',
  district: 'คลองเตย',
  lat: 13.7563,
  lng: 100.565,
  segment: 'A' as const,
  assignedTo: 'คุณสมชาย ใจดี',
  status: 'active' as const,
  createdAt: '2026-01-01',
  updatedAt: '2026-07-01',
  contacts: [
    {
      id: 'c1',
      customerId: '1',
      name: 'คุณวิชัย มั่นคง',
      position: 'กรรมการผู้จัดการ',
      phone: '081-234-5678',
      email: 'wichai@siamlogistics.co.th',
      lineId: 'wichai_line',
      isDecisionMaker: true,
      isPrimary: true,
    },
    {
      id: 'c2',
      customerId: '1',
      name: 'คุณสมหญิง ใจดี',
      position: 'ผู้จัดการฝ่ายจัดซื้อ',
      phone: '089-876-5432',
      email: null,
      lineId: null,
      isDecisionMaker: false,
      isPrimary: false,
    },
  ],
  visitStats: { total: 12, lastVisit: '2026-07-28' },
  callStats: { total: 25, lastCall: '2026-07-30', leadLevel: 'warm' },
  activeDeals: 3,
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/customers/${id}`]}>
      <Routes>
        <Route path="/customers/:id" element={<CustomerDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CustomerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
  })

  it('renders error state on fetch failure', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockRejectedValue(new Error('Not found'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/โหลดข้อมูลไม่สำเร็จ/)).toBeInTheDocument()
    })
  })

  it('renders company name in header', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('บริษัท สยามขนส่ง จำกัด')).toBeInTheDocument()
    })
  })

  it('renders company type and address', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('บริษัทจำกัด')).toBeInTheDocument()
      expect(screen.getByText(/123 ถนนสุขุมวิท/)).toBeInTheDocument()
    })
  })

  it('renders segment badge in header', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      const badge = screen.getByText('A')
      expect(badge).toBeInTheDocument()
    })
  })

  it('renders assigned rep', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/คุณสมชาย ใจดี/)).toBeInTheDocument()
    })
  })

  it('renders contacts section with contact names', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('ผู้ติดต่อ')).toBeInTheDocument()
      expect(screen.getByText('คุณวิชัย มั่นคง')).toBeInTheDocument()
      expect(screen.getByText('คุณสมหญิง ใจดี')).toBeInTheDocument()
    })
  })

  it('renders contact positions', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('กรรมการผู้จัดการ')).toBeInTheDocument()
      expect(screen.getByText('ผู้จัดการฝ่ายจัดซื้อ')).toBeInTheDocument()
    })
  })

  it('renders fleet summary section', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('ข้อมูล Fleet')).toBeInTheDocument()
    })
  })

  it('renders recent visits section', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('การเข้าเยี่ยมล่าสุด')).toBeInTheDocument()
    })
  })

  it('renders visit stats', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      const timesElements = screen.getAllByText(/ครั้ง/)
      expect(timesElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders recent calls section', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('การติดต่อล่าสุด')).toBeInTheDocument()
    })
  })

  it('renders call stats with lead level', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText(/Warm/)).toBeInTheDocument()
    })
  })

  it('renders active deals count', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('ดีลที่กำลังดำเนินการ')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('renders back button', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /กลับ/i })).toBeInTheDocument()
    })
  })

  it('renders add contact button and opens inline form', async () => {
    vi.mocked(apiModule.fetchCustomerDetail).mockResolvedValue(mockCustomerDetail)
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /เพิ่มผู้ติดต่อ/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มผู้ติดต่อ/i }))
    await waitFor(() => {
      expect(screen.getByLabelText('ชื่อ-นามสกุล')).toBeInTheDocument()
    })
  })
})
