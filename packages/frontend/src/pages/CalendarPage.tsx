import { VisitPlanner } from './VisitPlanner'

interface CalendarPageProps {
  userRole: 'admin' | 'manager' | 'sales_rep'
}

export function CalendarPage({ userRole }: CalendarPageProps) {
  return <VisitPlanner userRole={userRole} />
}
