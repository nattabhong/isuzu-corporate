import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Login } from '../Login'

describe('Login', () => {
  it('renders ISUZU branding', () => {
    render(<Login onLogin={vi.fn()} />)

    expect(screen.getByText('ISUZU Corporate')).toBeInTheDocument()
  })

  it('renders LINE login button with Thai text', () => {
    render(<Login onLogin={vi.fn()} />)

    const button = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย LINE/i })
    expect(button).toBeInTheDocument()
  })

  it('calls onLogin when LINE login button is clicked', () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)

    const button = screen.getByRole('button', { name: /เข้าสู่ระบบด้วย LINE/i })
    fireEvent.click(button)

    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it('renders a descriptive subtitle in Thai', () => {
    render(<Login onLogin={vi.fn()} />)

    expect(screen.getByText('ระบบบริหารการขายและการดูแลลูกค้าองค์กร')).toBeInTheDocument()
  })
})
