import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, MapPin, Phone, TrendingUp, BarChart3, Settings } from 'lucide-react'

interface SidebarProps {
  role: 'manager' | 'sales_rep'
}

const commonItems = [
  { to: '/overview', label: 'ภาพรวม', icon: LayoutDashboard },
  { to: '/customers', label: 'ลูกค้าองค์กร', icon: Building2 },
  { to: '/visits', label: 'Visit', icon: MapPin },
  { to: '/calls', label: 'Call', icon: Phone },
  { to: '/deals', label: 'Pipeline', icon: TrendingUp },
]

const managerItems = [
  { to: '/reports', label: 'รายงาน', icon: BarChart3 },
  { to: '/settings', label: 'ตั้งค่า', icon: Settings },
]

export function Sidebar({ role }: SidebarProps) {
  const items = role === 'manager' ? [...commonItems, ...managerItems] : commonItems

  return (
    <aside className="sidebar">
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
