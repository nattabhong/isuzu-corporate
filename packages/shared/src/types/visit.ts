export interface VisitPlan {
  id: string
  customerId: string
  salesRepId: string
  month: string
  plannedDate: string
  visitType: 'first_visit' | 'follow_up' | 'closing' | 'service'
  objective: string | null
  status: 'planned' | 'completed' | 'missed' | 'rescheduled'
  createdAt: string
}

export interface VisitLog {
  id: string
  visitPlanId: string | null
  customerId: string
  salesRepId: string
  visitDate: string
  startTime: string | null
  endTime: string | null
  gpsLat: number | null
  gpsLng: number | null
  notes: string | null
  nextStep: string | null
  customerMood: 'positive' | 'neutral' | 'concerned' | null
  attachments: string[] | null
  createdAt: string
}
