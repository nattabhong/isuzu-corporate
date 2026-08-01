import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { AuthUser } from '../hooks/useAuth'

interface LayoutProps {
  user?: AuthUser
  role?: 'manager' | 'sales_rep'
  onLogout?: () => void
  children: ReactNode
}

export function Layout({ user, role, onLogout = () => {}, children }: LayoutProps) {
  const activeUser: AuthUser = user ?? {
    id: 'user-1',
    name: 'ผู้ใช้งาน',
    role: role ?? 'sales_rep',
  }

  return (
    <div className="dashboard-layout">
      <Sidebar role={activeUser.role} />
      <main className="main-content">
        <TopBar user={activeUser} onLogout={onLogout} />
        <div className="page-wrapper">
          {children}
        </div>
      </main>
    </div>
  )
}
