import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Reports } from '../Reports'

// Mock the API module — spread real exports, override only what we need
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return {
    ...actual,
    fetchVisitCompletion: vi.fn().mockResolvedValue([]),
    fetchCallCompletion: vi.fn().mockResolvedValue([]),
    fetchLeadHeatmap: vi.fn().mockResolvedValue({ hot: 0, warm: 0, future: 0, maintain: 0, inactive: 0 }),
    fetchSalesPerformance: vi.fn().mockResolvedValue([]),
    fetchCoverageGaps: vi.fn().mockResolvedValue([]),
    fetchTeamLeaderboard: vi.fn().mockResolvedValue([]),
  }
})

describe('Reports', () => {
  it('renders page heading in Thai', () => {
    render(<Reports />)

    expect(screen.getByText('รายงาน')).toBeInTheDocument()
  })

  it('renders tab navigation with Thai labels', () => {
    render(<Reports />)

    expect(screen.getByText('รายงานการเข้าเยี่ยม')).toBeInTheDocument()
    expect(screen.getByText('รายงานการโทร')).toBeInTheDocument()
    expect(screen.getByText('Lead Heatmap')).toBeInTheDocument()
    expect(screen.getByText('ผลการขาย')).toBeInTheDocument()
    expect(screen.getByText('ลูกค้าที่ยังไม่ได้รับการติดต่อ')).toBeInTheDocument()
    expect(screen.getByText('การจัดอันดับทีม')).toBeInTheDocument()
  })

  it('renders month selector', () => {
    render(<Reports />)

    const monthInput = screen.getByLabelText('เดือน')
    expect(monthInput).toBeInTheDocument()
    expect(monthInput).toHaveAttribute('type', 'month')
  })

  it('switches tabs on click', async () => {
    render(<Reports />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument()
    })

    // Click the second tab
    fireEvent.click(screen.getByText('รายงานการโทร'))
    expect(screen.getByText('รายงานการโทร — Call Completion')).toBeInTheDocument()

    // Click lead heatmap tab
    fireEvent.click(screen.getByText('Lead Heatmap'))
    expect(screen.getByText('Lead Heatmap — การกระจายตัวของ Lead')).toBeInTheDocument()

    // Click sales performance tab
    fireEvent.click(screen.getByText('ผลการขาย'))
    expect(screen.getByText('ผลการขาย — Sales Performance')).toBeInTheDocument()

    // Click coverage gaps
    fireEvent.click(screen.getByText('ลูกค้าที่ยังไม่ได้รับการติดต่อ'))
    expect(screen.getByText('ลูกค้าที่ยังไม่ได้รับการติดต่อ — Coverage Gaps')).toBeInTheDocument()

    // Back to visit report
    fireEvent.click(screen.getByText('รายงานการเข้าเยี่ยม'))
    expect(screen.getByText('รายงานการเข้าเยี่ยม — Visit Completion')).toBeInTheDocument()
  })

  it('renders leaderboard tab', () => {
    render(<Reports />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(6)
  })

  it('shows empty state messages when no data', async () => {
    render(<Reports />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('กำลังโหลด...')).not.toBeInTheDocument()
    })

    // Initially on visit report tab — should show empty state
    expect(screen.getByText('ไม่มีข้อมูล')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<Reports />)

    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
  })
})
