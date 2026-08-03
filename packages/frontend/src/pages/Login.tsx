import { useState, type FormEvent } from 'react'
import { LogIn, Mail, Lock, User, KeyRound, Eye, EyeOff } from 'lucide-react'

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<unknown>
  onLineLogin: () => void
  onRegister: (name: string, email: string, password: string, inviteCode: string) => Promise<unknown>
}

export function Login({ onLogin, onLineLogin, onRegister }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password.trim())
      } else {
        await onRegister(name.trim(), email.trim(), password, inviteCode.trim())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card panel">
        <div className="login-branding">
          <div className="login-logo-container">
            <img src="/logo.png" alt="Sala Corporate Logo" className="login-logo-img" />
          </div>
          <h1>Sala Corporate</h1>
          <p>ระบบบริหารการขายและการดูแลลูกค้าองค์กร</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} aria-label="แบบฟอร์มเข้าสู่ระบบ">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="login-name">ชื่อ</label>
              <div className="login-input">
                <User size={16} />
                <input
                  id="login-name"
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email">อีเมล</label>
            <div className="login-input">
              <Mail size={16} />
              <input
                id="login-email"
                type="email"
                placeholder="you@company.co.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">รหัสผ่าน</label>
            <div className="login-input" style={{ position: 'relative' }}>
              <Lock size={16} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="login-invite">รหัสเชิญ</label>
              <div className="login-input">
                <KeyRound size={16} />
                <input
                  id="login-invite"
                  type="text"
                  placeholder="รหัสเชิญจากผู้จัดการ"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={submitting}>
            <LogIn size={18} />
            <span>{submitting ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</span>
          </button>
        </form>

        <div className="login-divider">
          <span>หรือ</span>
        </div>

        <button type="button" className="login-button-line" onClick={onLineLogin}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 5.84 2 10.57c0 2.72 1.46 5.13 3.76 6.72-.15.57-.56 2.06-.64 2.36-.1.42-.38.52-.13.65.24.13 1.95-1.3 2.62-1.84.98.26 2.02.4 3.1.4.02 0 .05 0 .07-.01.08-.42.08-2.39-.01-2.88-3.61-.45-6.32-2.24-6.32-4.93 0-2.72 3.24-4.92 7.24-4.92s7.24 2.2 7.24 4.92c0 2.69-2.7 4.48-6.32 4.93.09.51.07 2.47-.02 2.89.02.01.05.01.07.01 1.09 0 2.14-.14 3.12-.41.67.54 2.37 1.97 2.61 1.84.25-.13.02-.65-.13-1.28-.08-.3-.49-1.79-.64-2.36C20.54 15.7 22 13.29 22 10.57 22 5.84 17.52 2 12 2z"/>
          </svg>
          <span>เข้าสู่ระบบด้วย LINE</span>
        </button>

        <p className="login-switch" style={{ color: '#6B7280', fontSize: '0.875rem' }}>
          หากยังไม่มีบัญชีเข้าใช้งาน กรุณาติดต่อผู้จัดการ (Manager) เพื่อรับรหัสเข้าใช้งาน
        </p>

        <p className="login-footer">สำหรับทีมขายองค์กร ศาลาเชียงใหม่</p>
      </div>
    </div>
  )
}
