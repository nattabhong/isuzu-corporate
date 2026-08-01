import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Overview } from './Overview'
import { Customers } from './Customers'
import { CustomerDetail } from './CustomerDetail'
import { Visits } from './Visits'
import { CallPlanner } from './CallPlanner'
import { Deals } from './Deals'
import { Reports } from './Reports'
import { Settings } from './Settings'
import type { AuthUser } from '../hooks/useAuth'

interface DashboardProps {
  user: AuthUser
}

export function Dashboard({ user }: DashboardProps) {
  return (
    <Layout role={user.role}>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview user={user} />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/visits" element={<Visits userRole={user.role} />} />
        <Route path="/calls" element={<CallPlanner />} />
        <Route path="/deals" element={<Deals userRole={user.role} />} />
        {user.role === 'manager' && (
          <>
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </>
        )}
      </Routes>
    </Layout>
  )
}
