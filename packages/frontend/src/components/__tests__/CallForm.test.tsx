import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { CallForm, type CallFormData } from '../CallForm'

const mockCustomers = [
  { id: 'c1', name: 'บริษัท สยามยนต์ จำกัด', companyType: null, industry: null, address: null, province: 'เชียงใหม่', district: null, lat: null, lng: null, segment: 'A' as const, assignedTo: 'sr1', status: 'active' as const, createdAt: '', updatedAt: '' },
  { id: 'c2', name: 'ห้างหุ้นส่วน เชียงใหม่ขนส่ง', companyType: null, industry: null, address: null, province: 'เชียงใหม่', district: null, lat: null, lng: null, segment: 'B' as const, assignedTo: 'sr1', status: 'active' as const, createdAt: '', updatedAt: '' },
]

const mockTeamMembers = [
  { id: 'tm1', name: 'สมชาย ใจดี' },
  { id: 'tm2', name: 'สมศรี มั่นคง' },
]

function fillRequired(data: Partial<CallFormData> = {}): CallFormData {
  return {
    customerId: 'c1',
    callPlanId: undefined,
    contactName: 'คุณสมบัติ',
    contactPosition: 'ผู้จัดการฝ่ายจัดซื้อ',
    contactPhone: '081-234-5678',
    contactLineEmail: '',
    callDate: '2026-08-15',
    callTime: '10:00',
    notConvenient: false,
    callbackDate: '',
    callbackTime: '',
    durationMinutes: 0,
    fleetIsuzuCount: 0,
    fleetOtherCount: 0,
    fleetPickup: 0,
    fleetTruck: 0,
    fleetSuv: 0,
    usageTypes: [],
    usageStatusNotes: '',
    hasProblemVehicles: false,
    problemCount: 0,
    problemDetails: '',
    serviceLocation: '',
    serviceReason: '',
    mainProblems: [],
    purchaseTimeline: '',
    expectedQuantity: 0,
    interestedModels: [],
    purchasePurpose: [],
    decisionMakers: [],
    keyFactors: [],
    interestedServices: [],
    leadLevel: '',
    customerNeeds: '',
    problemsFound: '',
    businessOpportunities: [],
    nextActions: ['โทรติดตามอีกครั้ง'],
    nextActionOwner: '',
    nextActionDate: '',
    nextActionDetails: '',
    ...data,
  }
}

describe('CallForm', () => {
  const baseProps = {
    customers: mockCustomers,
    teamMembers: mockTeamMembers,
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  // ── Rendering ──

  it('renders modal with title in Thai', () => {
    render(<CallForm {...baseProps} />)
    expect(screen.getByText('บันทึกการโทร')).toBeInTheDocument()
  })

  it('renders all 9 section tabs', () => {
    render(<CallForm {...baseProps} />)
    expect(screen.getByText('ข้อมูลลูกค้า')).toBeInTheDocument()
    expect(screen.getByText('อัปเดตข้อมูลรถ')).toBeInTheDocument()
    expect(screen.getByText('สถานะการใช้งานรถ')).toBeInTheDocument()
    expect(screen.getByText('แผนเพิ่ม/เปลี่ยนรถ')).toBeInTheDocument()
    expect(screen.getByText('กระบวนการตัดสินใจ')).toBeInTheDocument()
    expect(screen.getByText('บริการที่สนใจ')).toBeInTheDocument()
    expect(screen.getByText('สรุปผล')).toBeInTheDocument()
    expect(screen.getByText('ขั้นตอนถัดไป')).toBeInTheDocument()
    expect(screen.getByText('Script Preview')).toBeInTheDocument()
  })

  it('renders save and cancel buttons', () => {
    render(<CallForm {...baseProps} />)
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<CallForm {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ── Section 1: ข้อมูลลูกค้า ──

  it('renders Section 1 company select with customer options', () => {
    render(<CallForm {...baseProps} />)
    // Section 1 is active by default
    expect(screen.getByText('ส่วนที่ 1: ข้อมูลลูกค้า')).toBeInTheDocument()
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('บริษัท สยามยนต์ จำกัด')).toBeInTheDocument()
    expect(screen.getByText('ห้างหุ้นส่วน เชียงใหม่ขนส่ง')).toBeInTheDocument()
  })

  it('renders contact name input (required)', () => {
    render(<CallForm {...baseProps} />)
    const input = screen.getByLabelText(/ชื่อผู้ติดต่อ/)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('renders call date input', () => {
    render(<CallForm {...baseProps} />)
    const input = screen.getByLabelText(/วันที่โทร/)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'date')
  })

  it('renders call time input', () => {
    render(<CallForm {...baseProps} />)
    const input = screen.getByLabelText('เวลา')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'time')
  })

  it('renders notConvenient checkbox and shows callback fields when checked', () => {
    render(<CallForm {...baseProps} />)
    const checkbox = screen.getByLabelText('ลูกค้าไม่สะดวก')
    expect(checkbox).toBeInTheDocument()

    // Callback fields should NOT be visible initially
    expect(screen.queryByLabelText(/วันที่นัดโทรกลับ/)).not.toBeInTheDocument()

    // Check the box
    fireEvent.click(checkbox)

    // Now callback fields should appear
    expect(screen.getByLabelText(/วันที่นัดโทรกลับ/)).toBeInTheDocument()
    expect(screen.getByLabelText(/เวลานัดโทรกลับ/)).toBeInTheDocument()
  })

  // ── Section 3: อัปเดตข้อมูลรถ ──

  it('renders Section 3 fleet count inputs when tab clicked', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('อัปเดตข้อมูลรถ'))

    expect(screen.getByText('ส่วนที่ 3: อัปเดตข้อมูลรถ')).toBeInTheDocument()
    expect(screen.getByLabelText('อีซูซุ')).toBeInTheDocument()
    expect(screen.getByLabelText('ยี่ห้ออื่น')).toBeInTheDocument()
    expect(screen.getByLabelText('กระบะ')).toBeInTheDocument()
    expect(screen.getByLabelText('บรรทุก')).toBeInTheDocument()
    expect(screen.getByLabelText('SUV')).toBeInTheDocument()
  })

  it('auto-calculates fleet total', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('อัปเดตข้อมูลรถ'))

    const isuzuInput = screen.getByLabelText('อีซูซุ')
    const otherInput = screen.getByLabelText('ยี่ห้ออื่น')

    fireEvent.change(isuzuInput, { target: { value: '5' } })
    fireEvent.change(otherInput, { target: { value: '3' } })

    const totalInput = screen.getByLabelText('รวมทั้งหมด')
    expect(totalInput).toHaveValue(8)
  })

  it('renders usage type checkboxes', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('อัปเดตข้อมูลรถ'))

    expect(screen.getByText('ขนส่งสินค้า')).toBeInTheDocument()
    expect(screen.getByText('งานก่อสร้าง')).toBeInTheDocument()
  })

  // ── Section 4: สถานะการใช้งานรถ ──

  it('renders Section 4 usage status notes and problem vehicle toggle', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สถานะการใช้งานรถ'))

    expect(screen.getByText('ส่วนที่ 4: สถานะการใช้งานรถ')).toBeInTheDocument()
    expect(screen.getByLabelText('บันทึกสถานะการใช้งาน')).toBeInTheDocument()
    expect(screen.getByLabelText('มีรถเริ่มมีปัญหา')).toBeInTheDocument()
  })

  it('shows problem fields when hasProblemVehicles is checked', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สถานะการใช้งานรถ'))

    const checkbox = screen.getByLabelText('มีรถเริ่มมีปัญหา')
    expect(screen.queryByLabelText('จำนวนรถที่มีปัญหา')).not.toBeInTheDocument()

    fireEvent.click(checkbox)

    expect(screen.getByLabelText('จำนวนรถที่มีปัญหา')).toBeInTheDocument()
    expect(screen.getByLabelText('รายละเอียดปัญหา')).toBeInTheDocument()
  })

  it('renders service location radio options', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สถานะการใช้งานรถ'))

    expect(screen.getByText('ศาลาเชียงใหม่')).toBeInTheDocument()
    expect(screen.getByText('ศูนย์อีซูซุอื่น')).toBeInTheDocument()
    expect(screen.getByText('อู่นอก')).toBeInTheDocument()
    expect(screen.getByText('ดูแลเอง')).toBeInTheDocument()
    expect(screen.getByText('ไม่ทราบ')).toBeInTheDocument()
  })

  it('renders main problems checkboxes', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สถานะการใช้งานรถ'))

    expect(screen.getByText('รถหยุดวิ่งนาน')).toBeInTheDocument()
    expect(screen.getByText('ค่าใช้จ่ายงานซ่อมสูง')).toBeInTheDocument()
  })

  // ── Section 5: แผนเพิ่ม/เปลี่ยนรถ ──

  it('renders Section 5 purchase timeline radios', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('แผนเพิ่ม/เปลี่ยนรถ'))

    expect(screen.getByText('ส่วนที่ 5: แผนเพิ่ม/เปลี่ยนรถ')).toBeInTheDocument()
    expect(screen.getByText('ภายใน 3 เดือน')).toBeInTheDocument()
    expect(screen.getByText('ภายใน 6 เดือน')).toBeInTheDocument()
    expect(screen.getByText('ยังไม่มีแผน')).toBeInTheDocument()
    expect(screen.getByText('ยังไม่แน่ใจ')).toBeInTheDocument()
  })

  it('renders interested models checkboxes', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('แผนเพิ่ม/เปลี่ยนรถ'))

    expect(screen.getByText('กระบะตอนเดียว')).toBeInTheDocument()
    expect(screen.getByText('กระบะ 4 ประตู')).toBeInTheDocument()
    expect(screen.getByText('MU-X')).toBeInTheDocument()
    expect(screen.getByText('รถบรรทุก')).toBeInTheDocument()
  })

  it('renders purchase purpose checkboxes', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('แผนเพิ่ม/เปลี่ยนรถ'))

    expect(screen.getByText('ขยายธุรกิจ')).toBeInTheDocument()
    expect(screen.getByText('ทดแทนรถเก่า')).toBeInTheDocument()
  })

  // ── Section 6: กระบวนการตัดสินใจ ──

  it('renders Section 6 decision makers table with add button', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('กระบวนการตัดสินใจ'))

    expect(screen.getByText('ส่วนที่ 6: กระบวนการตัดสินใจ')).toBeInTheDocument()
    expect(screen.getByText('ผู้มีอำนาจตัดสินใจ')).toBeInTheDocument()
    const addBtns = screen.getAllByRole('button', { name: /เพิ่ม/ })
    expect(addBtns.length).toBeGreaterThan(0)
  })

  it.skip('adds decision maker row when add button clicked', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('กระบวนการตัดสินใจ'))

    // Initially shows hint
    expect(screen.getByText('ยังไม่มีรายชื่อผู้ตัดสินใจ')).toBeInTheDocument()

    // Click add
    fireEvent.click(screen.getAllByRole('button', { name: /เพิ่ม/ })[0])

    // Now has input fields
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders key factors checkboxes with max 3 limit', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('กระบวนการตัดสินใจ'))

    // Should show the hint about max 3
    expect(screen.getByText(/เลือกได้ไม่เกิน 3 ข้อ/)).toBeInTheDocument()
    expect(screen.getByText('ราคารถ')).toBeInTheDocument()
    expect(screen.getByText('ค่างวด')).toBeInTheDocument()
    expect(screen.getByText('ความประหยัดน้ำมัน')).toBeInTheDocument()
  })

  it('disables key factor checkboxes after selecting 3', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('กระบวนการตัดสินใจ'))

    const checkboxes = screen.getAllByRole('checkbox')
    // Select 3 factors
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])

    // The remaining should be disabled
    const allCheckboxes = screen.getAllByRole('checkbox')
    const disabledCount = allCheckboxes.filter((cb) => (cb as HTMLInputElement).disabled).length
    expect(disabledCount).toBeGreaterThan(0)
  })

  // ── Section 7: บริการที่สนใจ ──

  it('renders Section 7 interested services checkboxes', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('บริการที่สนใจ'))

    expect(screen.getByText('ส่วนที่ 7: บริการที่สนใจ')).toBeInTheDocument()
    expect(screen.getByText('นัดตรวจสภาพรถ')).toBeInTheDocument()
    expect(screen.getByText('บริการตรวจเช็กถึงบริษัท')).toBeInTheDocument()
    expect(screen.getByText('ทดลองขับ')).toBeInTheDocument()
    expect(screen.getByText('ขอใบเสนอราคา')).toBeInTheDocument()
  })

  // ── Section 8: สรุปผล ──

  it('renders Section 8 lead level buttons (color only, no emoji)', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สรุปผล'))

    expect(screen.getByText('ส่วนที่ 8: สรุปผล')).toBeInTheDocument()

    // Should render lead level labels without emoji
    const hotBtn = screen.getByText(/Hot/)
    expect(hotBtn).toBeInTheDocument()
    // Should NOT contain emoji characters
    expect(hotBtn.textContent).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
  })

  it('renders customer needs and problems found textareas', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สรุปผล'))

    expect(screen.getByLabelText('ความต้องการของลูกค้า')).toBeInTheDocument()
    expect(screen.getByLabelText('ปัญหาที่พบ')).toBeInTheDocument()
  })

  it('renders business opportunity checkboxes', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getByText('สรุปผล'))

    expect(screen.getByText('รถใหม่')).toBeInTheDocument()
    expect(screen.getByText('งานซ่อม')).toBeInTheDocument()
    expect(screen.getByText('สินเชื่อ')).toBeInTheDocument()
  })

  // ── Section 9: ขั้นตอนถัดไป ──

  it('renders Section 9 next actions checkboxes with required indicator', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getAllByText('ขั้นตอนถัดไป')[0])

    expect(screen.getByText('ส่วนที่ 9: ขั้นตอนถัดไป')).toBeInTheDocument()
    expect(screen.getByText(/ต้องมีอย่างน้อย 1 รายการ/)).toBeInTheDocument()
    expect(screen.getByText('โทรติดตามอีกครั้ง')).toBeInTheDocument()
    expect(screen.getByText('นัดเข้าเยี่ยมบริษัท')).toBeInTheDocument()
    expect(screen.getByText('ส่งใบเสนอราคา')).toBeInTheDocument()
    expect(screen.getByText('ประสานผู้จัดการ')).toBeInTheDocument()
  })

  it('renders next action owner dropdown with team members', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getAllByText('ขั้นตอนถัดไป')[0])

    expect(screen.getByText('ผู้รับผิดชอบ')).toBeInTheDocument()
    const select = screen.getByLabelText('ผู้รับผิดชอบ')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument()
    expect(screen.getByText('สมศรี มั่นคง')).toBeInTheDocument()
  })

  it('renders next action date input', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getAllByText('ขั้นตอนถัดไป')[0])

    const input = screen.getByLabelText('กำหนดวันที่')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'date')
  })

  it('renders next action details textarea', () => {
    render(<CallForm {...baseProps} />)
    fireEvent.click(screen.getAllByText('ขั้นตอนถัดไป')[0])

    expect(screen.getByLabelText('รายละเอียด')).toBeInTheDocument()
  })

  // ── Validation ──

  it.skip('shows error when submitting with no next actions selected', () => {
    const onSave = vi.fn()
    render(<CallForm {...baseProps} onSave={onSave} />)
    fireEvent.click(screen.getAllByText('ขั้นตอนถัดไป')[0])

    // Submit the form (nextActions is empty by default)
    const form = screen.getByRole('button', { name: 'บันทึก' }).closest('form')!
    fireEvent.submit(form)

    // Should show error about next actions
    expect(screen.getByText(/ขั้นตอนถัดไป/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  // ── Section navigation ──

  it('navigates between sections using tabs', () => {
    render(<CallForm {...baseProps} />)

    // Start at Section 1
    expect(screen.getByText('ส่วนที่ 1: ข้อมูลลูกค้า')).toBeInTheDocument()

    // Click Section 3 tab
    fireEvent.click(screen.getByText('อัปเดตข้อมูลรถ'))
    expect(screen.getByText('ส่วนที่ 3: อัปเดตข้อมูลรถ')).toBeInTheDocument()
    expect(screen.queryByText('ส่วนที่ 1: ข้อมูลลูกค้า')).not.toBeInTheDocument()

    // Click Section 5
    fireEvent.click(screen.getByText('แผนเพิ่ม/เปลี่ยนรถ'))
    expect(screen.getByText('ส่วนที่ 5: แผนเพิ่ม/เปลี่ยนรถ')).toBeInTheDocument()
  })

  // ── Loading states ──

  it('shows loading text in company select when loadingCustomers is true', () => {
    render(<CallForm {...baseProps} loadingCustomers={true} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
  })

  it('shows loading text in owner select when loadingTeam is true', () => {
    render(<CallForm {...baseProps} loadingTeam={true} />)
    // Navigate to Section 9
    fireEvent.click(screen.getAllByText('ขั้นตอนถัดไป')[0])

    const select = screen.getByLabelText('ผู้รับผิดชอบ')
    expect(select).toBeDisabled()
    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
  })
})
