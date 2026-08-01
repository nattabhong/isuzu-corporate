import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VisitForm } from '../VisitForm'

const mockCustomers = [
  { id: 'c1', name: 'บริษัท สยามยนต์ จำกัด' },
  { id: 'c2', name: 'ห้างหุ้นส่วน เชียงใหม่ขนส่ง' },
]

describe('VisitForm', () => {
  const baseProps = {
    customers: mockCustomers,
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders customer select dropdown with Thai label', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByText('ลูกค้า')).toBeInTheDocument()
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
  })

  it('renders all customer options in dropdown', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByText('บริษัท สยามยนต์ จำกัด')).toBeInTheDocument()
    expect(screen.getByText('ห้างหุ้นส่วน เชียงใหม่ขนส่ง')).toBeInTheDocument()
  })

  it('renders date input', () => {
    render(<VisitForm {...baseProps} />)

    const dateInput = screen.getByLabelText('วันที่')
    expect(dateInput).toBeInTheDocument()
    expect(dateInput).toHaveAttribute('type', 'date')
  })

  it('renders start time and end time inputs', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByLabelText('เวลาเริ่ม')).toBeInTheDocument()
    expect(screen.getByLabelText('เวลาสิ้นสุด')).toBeInTheDocument()
  })

  it('renders GPS latitude and longitude fields', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByLabelText('ละติจูด (Latitude)')).toBeInTheDocument()
    expect(screen.getByLabelText('ลองจิจูด (Longitude)')).toBeInTheDocument()
  })

  it('renders GPS check-in button', () => {
    render(<VisitForm {...baseProps} />)

    const checkInBtn = screen.getByText(/Check-in/)
    expect(checkInBtn).toBeInTheDocument()
  })

  it('renders notes textarea', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByLabelText('บันทึก')).toBeInTheDocument()
  })

  it('renders next step input', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByLabelText('ขั้นตอนถัดไป')).toBeInTheDocument()
  })

  it('renders customer mood selector with all options', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByText('อารมณ์ลูกค้า')).toBeInTheDocument()
    expect(screen.getByText('บวก')).toBeInTheDocument()
    expect(screen.getByText('ปกติ')).toBeInTheDocument()
    expect(screen.getByText('กังวล')).toBeInTheDocument()
  })

  it('renders file attachment input', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByLabelText('ไฟล์แนบ')).toBeInTheDocument()
  })

  it('renders save and cancel buttons', () => {
    render(<VisitForm {...baseProps} />)

    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument()
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<VisitForm {...baseProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSave with form data when save button is clicked', () => {
    const onSave = vi.fn()
    render(<VisitForm {...baseProps} onSave={onSave} />)

    // Fill in required fields
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'c1' },
    })
    fireEvent.change(screen.getByLabelText('วันที่'), {
      target: { value: '2026-08-15' },
    })

    // Submit the form
    const form = screen.getByRole('button', { name: 'บันทึก' }).closest('form')!
    fireEvent.submit(form)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'c1',
        visitDate: '2026-08-15',
      })
    )
  })

  it('selects customer from dropdown', () => {
    render(<VisitForm {...baseProps} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'c1' } })

    expect(select).toHaveValue('c1')
  })
})
