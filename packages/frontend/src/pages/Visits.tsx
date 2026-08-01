import { VisitPlanner } from './VisitPlanner'

interface VisitsProps {
  userRole: 'manager' | 'sales_rep'
}

export function Visits({ userRole }: VisitsProps) {
  return <VisitPlanner userRole={userRole} />
}
