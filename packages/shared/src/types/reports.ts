export interface VisitCompletion {
  salesRepId: string
  salesRepName: string
  planned: number
  completed: number
  missed: number
}

export interface CallCompletion {
  salesRepId: string
  salesRepName: string
  planned: number
  completed: number
  missed: number
}

export interface LeadHeatmap {
  hot: number
  warm: number
  future: number
  maintain: number
  inactive: number
}

export interface SalesPerformance {
  salesRepId: string
  salesRepName: string
  totalDeals: number
  dealsWon: number
  totalValue: number
  winRate: number
}

export interface CoverageGap {
  customerId: string
  customerName: string
  segment: string
  salesRepId: string | null
  salesRepName: string
  daysOverdue: number
}

export interface TeamLeaderboardEntry {
  salesRepId: string
  salesRepName: string
  territory: string | null
  visitCompleted: number
  callCompleted: number
  dealsWon: number
  score: number
}
