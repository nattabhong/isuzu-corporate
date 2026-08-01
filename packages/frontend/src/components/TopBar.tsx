import { User, LogOut, ShieldCheck, UserCheck } from 'lucide-react'
import type { AuthUser } from '../hooks/useAuth'

interface TopBarProps {
  user: AuthUser
  onLogout: () => void
}

export function TopBar({ user, onLogout }: TopBarProps) {
  const roleLabelShort = user.role === 'manager' ? 'ผู้จัดการ' : 'พนักงานขาย'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-brand-title">ISUZU Corporate CRM</span>
      </div>
      <div className="topbar-user">
        <div className="user-avatar-badge">
          <User size={16} />
        </div>
        <div className="user-info">
          <div className="user-name-row">
            <span className="user-name">{user.name}</span>
            <span className={`user-role-tag ${user.role}`}>
              {user.role === 'manager' ? <ShieldCheck size={11} /> : <UserCheck size={11} />}
              <span>{roleLabelShort}</span>
            </span>
          </div>
          {user.email && <div className="user-email">{user.email}</div>}
        </div>
        <button type="button" className="btn-logout" onClick={onLogout} title="ออกจากระบบ">
          <LogOut size={15} />
          <span className="logout-text">ออกจากระบบ</span>
        </button>
      </div>
    </header>
  )
}
