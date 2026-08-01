import { LogIn, Truck } from 'lucide-react'

interface LoginProps {
  onLogin: () => void
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="login-page">
      <div className="login-card panel">
        <div className="login-branding">
          <div className="login-logo">
            <Truck size={48} strokeWidth={1.5} color="var(--accent)" />
          </div>
          <h1>ISUZU Corporate</h1>
          <p>ระบบบริหารการขายและการดูแลลูกค้าองค์กร</p>
        </div>

        <button
          type="button"
          className="login-button"
          onClick={onLogin}
        >
          <LogIn size={20} />
          <span>เข้าสู่ระบบด้วย LINE</span>
        </button>

        <p className="login-footer">สำหรับทีมขายองค์กร อีซูซุ</p>
      </div>
    </div>
  )
}
