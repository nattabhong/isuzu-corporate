import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Deals } from '../Deals'

// Mock the api module — spread real exports, override only what we need
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
    fetchDeals: vi.fn(),
    fetchTeamMembers: vi.fn(),
    fetchCustomers: vi.fn(),
    createDeal: vi.fn(),
    updateDealStage: vi.fn(),
    fetchDealsSummary: vi.fn(),
  }
})

import { api } from '../../lib/api'

const mockDeals = [
  {
    id: 'deal-1',
    customer_id: 'cust-a',
    customer_name: 'บริษัท สยามยนต์ จำกัด',
    sales_rep_id: 'rep-1',
    sales_rep_name: 'สมชาย ใจดี',
    vehicle_model: 'D-Max 1.9 S',
    quantity: 3,
    expected_amount: 1500000,
    stage: 'lead',
    notes: null,
    expected_close_date: null,
    won_amount: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    source_call_log_id: null,
    source_visit_log_id: null,
  },
  {
    id: 'deal-2',
    customer_id: 'cust-b',
    customer_name: 'ห้างหุ้นส่วน เชียงใหม่ขนส่ง',
    sales_rep_id: 'rep-1',
    sales_rep_name: 'สมชาย ใจดี',
    vehicle_model: 'MU-X 3.0',
    quantity: 1,
    expected_amount: 800000,
    stage: 'negotiating',
    notes: null,
    expected_close_date: null,
    won_amount: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    source_call_log_id: null,
    source_visit_log_id: null,
  },
  {
    id: 'deal-3',
    customer_id: 'cust-c',
    customer_name: 'บริษัท นอร์ทเทิร์นโลจิสติกส์',
    sales_rep_id: 'rep-2',
    sales_rep_name: 'สมศรี มั่นคง',
    vehicle_model: 'ELF',
    quantity: 2,
    expected_amount: 2000000,
    stage: 'won',
    notes: null,
    expected_close_date: null,
    won_amount: 1900000,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    source_call_log_id: null,
    source_visit_log_id: null,
  },
]

const mockTeamMembers = [
  { id: 'rep-1', name: 'สมชาย ใจดี', role: 'sales_rep' },
  { id: 'rep-2', name: 'สมศรี มั่นคง', role: 'sales_rep' },
]

const mockCustomers = [
  { id: 'cust-a', name: 'บริษัท สยามยนต์ จำกัด' },
  { id: 'cust-b', name: 'ห้างหุ้นส่วน เชียงใหม่ขนส่ง' },
  { id: 'cust-c', name: 'บริษัท นอร์ทเทิร์นโลจิสติกส์' },
]

function setupMocks() {
  (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/api/deals') {
      return Promise.resolve({ success: true, data: mockDeals, error: undefined })
    }
    if (url === '/api/team') {
      return Promise.resolve({ success: true, data: mockTeamMembers, error: undefined })
    }
    if (url === '/api/customers') {
      return Promise.resolve({ success: true, data: mockCustomers, error: undefined })
    }
    return Promise.resolve({ success: true, data: [], error: undefined })
  })
}

async function waitForLoad() {
  // Wait for loading to finish by checking for the page heading AND some content
  await screen.findByText('Pipeline ดีล')
  // The page should transition from loading to content
  await waitFor(() => {
    expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument()
  })
}

describe('Deals Kanban', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  describe('Page rendering', () => {
    it('renders page heading in Thai', async () => {
      render(<Deals />)
      expect(screen.getByText('Pipeline ดีล')).toBeInTheDocument()
    })

    it('renders "สร้าง Deal" button after loading', async () => {
      render(<Deals />)
      await waitForLoad()
      const btn = screen.getByRole('button', { name: 'สร้าง Deal' })
      expect(btn).toBeInTheDocument()
    })

    it('renders all 6 stage columns', async () => {
      render(<Deals />)
      await waitForLoad()

      const stages = ['Lead', 'Visit Done', 'Quote Sent', 'Negotiating', 'Won', 'Lost']
      for (const stage of stages) {
        expect(screen.getByText(stage)).toBeInTheDocument()
      }
    })
  })

  describe('Deal cards', () => {
    it('renders customer names on cards', async () => {
      render(<Deals />)
      await waitForLoad()

      expect(screen.getByText('บริษัท สยามยนต์ จำกัด')).toBeInTheDocument()
      expect(screen.getByText('ห้างหุ้นส่วน เชียงใหม่ขนส่ง')).toBeInTheDocument()
    })

    it('renders vehicle model and quantity on cards', async () => {
      render(<Deals />)
      await waitForLoad()

      expect(screen.getByText('D-Max 1.9 S × 3')).toBeInTheDocument()
    })

    it('renders formatted value in ฿ on cards', async () => {
      render(<Deals />)
      await waitForLoad()

      expect(screen.getByText('฿1,500,000')).toBeInTheDocument()
    })

    it('renders sales rep name on cards', async () => {
      render(<Deals />)
      await waitForLoad()

      // Should find the sales rep name on at least one card
      const repNames = screen.getAllByText('สมชาย ใจดี')
      expect(repNames.length).toBeGreaterThan(0)
    })
  })

  describe('Color bars by stage', () => {
    it('renders cards with stage-specific color bars', async () => {
      const { container } = render(<Deals />)
      await waitForLoad()

      const colorBars = container.querySelectorAll('.kanban-card-bar')
      expect(colorBars.length).toBeGreaterThanOrEqual(3)

      // Lead card should have grey bar
      const leadBar = colorBars[0] as HTMLElement
      expect(leadBar.className).toContain('bar-lead')
    })
  })

  describe('Empty state', () => {
    it('renders empty columns when no deals', async () => {
      (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url === '/api/deals') {
          return Promise.resolve({ success: true, data: [], error: undefined })
        }
        if (url === '/api/team') {
          return Promise.resolve({ success: true, data: [], error: undefined })
        }
        if (url === '/api/customers') {
          return Promise.resolve({ success: true, data: [], error: undefined })
        }
        return Promise.resolve({ success: true, data: [], error: undefined })
      })

      render(<Deals />)

      // Should render Lead column
      const leadCol = await screen.findByText('Lead')
      expect(leadCol).toBeInTheDocument()

      // Should show empty messages in columns
      const emptyMsgs = screen.getAllByText('ไม่มีดีล')
      expect(emptyMsgs.length).toBe(6)
    })
  })

  describe('Modal form', () => {
    it('opens modal when "สร้าง Deal" is clicked', async () => {
      render(<Deals />)
      await waitForLoad()

      const btn = screen.getByRole('button', { name: 'สร้าง Deal' })
      fireEvent.click(btn)

      const modalTitle = await screen.findByText('สร้าง Deal ใหม่')
      expect(modalTitle).toBeInTheDocument()
    })

    it('renders form fields in modal', async () => {
      render(<Deals />)
      await waitForLoad()

      fireEvent.click(screen.getByRole('button', { name: 'สร้าง Deal' }))

      await screen.findByText('สร้าง Deal ใหม่')
      expect(screen.getByText('ลูกค้า')).toBeInTheDocument()
      expect(screen.getByText('รุ่นรถอีซูซุ (Official Lineup)')).toBeInTheDocument()
      expect(screen.getByText('จำนวน (คัน)')).toBeInTheDocument()
    })

    it('closes modal when cancel is clicked', async () => {
      render(<Deals />)
      await waitForLoad()

      fireEvent.click(screen.getByRole('button', { name: 'สร้าง Deal' }))
      await screen.findByText('สร้าง Deal ใหม่')

      const cancelBtn = screen.getByText('ยกเลิก')
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByText('สร้าง Deal ใหม่')).not.toBeInTheDocument()
      })
    })
  })

  describe('Sales rep filter (manager)', () => {
    it('does not show filter for sales rep', async () => {
      render(<Deals userRole="sales_rep" />)
      await waitForLoad()

      // No sales rep filter select
      expect(screen.queryByText('ทั้งหมด')).not.toBeInTheDocument()
    })

    it('shows filter for manager', async () => {
      render(<Deals userRole="manager" />)
      await waitForLoad()

      // Should have "ทั้งหมด" option in filter
      const allOption = await screen.findByText('ทั้งหมด')
      expect(allOption).toBeInTheDocument()
    })
  })
})
