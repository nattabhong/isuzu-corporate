import { User, LogOut, ShieldCheck, UserCheck } from 'lucide-react'
import type { AuthUser } from '../hooks/useAuth'

interface TopBarProps {
  user: AuthUser
  onLogout: () => void
}

export function TopBar({ user, onLogout }: TopBarProps) {
  const roleLabel = user.role === 'manager' ? 'ผู้จัดการ (Manager)' : 'พนักงานขาย (Sales Rep)'

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
          <div className="user-name">{user.name}</div>
          <div className="user-meta">
            {user.email && <span className="user-email">{user.email}</span>}
            <span className={`user-role-tag ${user.role}`}>
              {user.role === 'manager' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
              <span>{roleLabel}</span>
            </span>
          </div>
        </div>
        <button type="button" className="btn-logout" onClick={onLogout} title="ออกจากระบบ">
          <LogOut size={16} />
          <span className="logout-text">ออกจากระบบ</span>
        </button>
      </div>
    </header>
  )
}
