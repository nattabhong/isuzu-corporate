import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  role: 'manager' | 'sales_rep'
  children: ReactNode
}

export function Layout({ role, children }: LayoutProps) {
  return (
    <div className="layout">
      <Sidebar role={role} />
      <main className="content">
        {children}
      </main>
    </div>
  )
}
