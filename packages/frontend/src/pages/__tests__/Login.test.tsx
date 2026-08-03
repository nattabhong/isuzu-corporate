import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Login } from '../Login'

const noop = async () => {}

describe('Login', () => {
  it('renders Sala branding', () => {
    render(<Login onLogin={noop} onLineLogin={vi.fn()} onRegister={noop} />)

    expect(screen.getByText('Sala Corporate')).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    render(<Login onLogin={noop} onLineLogin={vi.fn()} onRegister={noop} />)

    expect(screen.getByLabelText('อีเมล')).toBeInTheDocument()
    expect(screen.getByLabelText('รหัสผ่าน')).toBeInTheDocument()
  })

  it('renders LINE login button with Thai text', () => {
    render(<Login onLogin={noop} onLineLogin={vi.fn()} onRegister={noop} />)

    const button = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย LINE/i })
    expect(button).toBeInTheDocument()
  })

  it('calls onLineLogin when LINE login button is clicked', () => {
    const onLineLogin = vi.fn()
    render(<Login onLogin={noop} onLineLogin={onLineLogin} onRegister={noop} />)

    const button = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย LINE/i })
    fireEvent.click(button)

    expect(onLineLogin).toHaveBeenCalledTimes(1)
  })

  it('submits email and password via onLogin', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    render(<Login onLogin={onLogin} onLineLogin={vi.fn()} onRegister={noop} />)

    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'somchai@sala.co.th' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    const form = screen.getByRole('form', { name: 'แบบฟอร์มเข้าสู่ระบบ' })
    fireEvent.submit(form)

    expect(onLogin).toHaveBeenCalledWith('somchai@sala.co.th', 'secret123')
  })

  it('shows error message when login fails', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง'))
    render(<Login onLogin={onLogin} onLineLogin={vi.fn()} onRegister={noop} />)

    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    const form = screen.getByRole('form', { name: 'แบบฟอร์มเข้าสู่ระบบ' })
    fireEvent.submit(form)

    expect(await screen.findByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeInTheDocument()
  })

  it('switches to register mode showing name and invite code fields', () => {
    render(<Login onLogin={noop} onLineLogin={vi.fn()} onRegister={noop} />)

    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }))

    expect(screen.getByLabelText('ชื่อ')).toBeInTheDocument()
    expect(screen.getByLabelText('รหัสเชิญ')).toBeInTheDocument()
  })

  it('submits registration with invite code', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined)
    render(<Login onLogin={noop} onLineLogin={vi.fn()} onRegister={onRegister} />)

    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }))
    fireEvent.change(screen.getByLabelText('ชื่อ'), { target: { value: 'สมชาย ใจดี' } })
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'somchai@sala.co.th' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('รหัสเชิญ'), { target: { value: 'ISUZU2026' } })
    fireEvent.click(screen.getByRole('button', { name: /สมัครสมาชิก/i }))

    expect(onRegister).toHaveBeenCalledWith('สมชาย ใจดี', 'somchai@sala.co.th', 'secret123', 'ISUZU2026')
  })

  it('renders a descriptive subtitle in Thai', () => {
    render(<Login onLogin={noop} onLineLogin={vi.fn()} onRegister={noop} />)

    expect(screen.getByText('ระบบบริหารการขายและการดูแลลูกค้าองค์กร')).toBeInTheDocument()
  })
})
