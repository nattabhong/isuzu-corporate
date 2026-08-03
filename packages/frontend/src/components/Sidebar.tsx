import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, Building2, MapPin, Phone, TrendingUp, BarChart3, Users, Settings } from 'lucide-react'

interface SidebarProps {
  role: 'admin' | 'manager' | 'sales_rep'
}

const commonItems = [
  { to: '/overview', label: 'ภาพรวม', icon: LayoutDashboard },
  { to: '/calendar', label: 'ปฏิทิน', icon: Calendar },
  { to: '/customers', label: 'ลูกค้าองค์กร', icon: Building2 },
  { to: '/visits', label: 'Visit', icon: MapPin },
  { to: '/calls', label: 'Call', icon: Phone },
  { to: '/deals', label: 'Pipeline', icon: TrendingUp },
]

const managerItems = [
  { to: '/team', label: 'ทีมงาน', icon: Users },
  { to: '/reports', label: 'รายงาน', icon: BarChart3 },
  { to: '/settings', label: 'ตั้งค่า', icon: Settings },
]

export function Sidebar({ role }: SidebarProps) {
  const items = (role === 'manager' || role === 'admin') ? [...commonItems, ...managerItems] : commonItems

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Sala Corporate Logo" className="sidebar-logo-img" />
      </div>
      <nav>
        <ul>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
