export interface TeamMember {
  id: string
  lineUserId: string
  name: string
  email: string | null
  phone: string | null
  role: 'manager' | 'sales_rep'
  territory: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MonthlyTarget {
  id: string
  salesRepId: string
  month: string
  visitTarget: number
  callTarget: number
  dealTarget: number | null
}
