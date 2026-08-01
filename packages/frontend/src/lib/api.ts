import { createApiClient } from './api-client'
import type { ApiResponse, PaginatedResponse } from '@isuzu-corporate/shared'
import type {
  Customer,
  CustomerDetail,
  VisitPlan,
  VisitLog,
  CallLog,
  Deal,
  TeamMember,
  MonthlyTarget,
  VisitCompletion,
  CallCompletion,
  LeadHeatmap,
  SalesPerformance,
  CoverageGap,
  TeamLeaderboardEntry,
} from '@isuzu-corporate/shared'

export const api = createApiClient()

export async function fetchCustomers(params?: {
  search?: string
  segment?: string
  status?: string
}): Promise<Customer[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.segment && params.segment !== 'all') searchParams.set('segment', params.segment)
  if (params?.status) searchParams.set('status', params.status)

  const qs = searchParams.toString()
  const url = `/api/customers${qs ? `?${qs}` : ''}`
  const res = await api.get<ApiResponse<Customer[]>>(url)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch customers')
  return res.data
}

export async function fetchCustomerDetail(id: string): Promise<CustomerDetail> {
  const res = await api.get<ApiResponse<CustomerDetail>>(`/api/customers/${id}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch customer')
  return res.data
}

export async function createCustomer(data: {
  name: string
  segment: string
  province?: string
  status?: string
}): Promise<Customer> {
  const res = await api.post<ApiResponse<Customer>>('/api/customers', data)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to create customer')
  return res.data
}

export async function addContact(
  customerId: string,
  data: {
    name: string
    position?: string
    phone?: string
    email?: string
    lineId?: string
    isDecisionMaker?: boolean
    isPrimary?: boolean
  },
): Promise<void> {
  const res = await api.post<ApiResponse<unknown>>(
    `/api/customers/${customerId}/contacts`,
    data,
  )
  if (!res.success) throw new Error(res.error || 'Failed to add contact')
}

export async function updateContact(
  customerId: string,
  contactId: string,
  data: {
    name?: string
    position?: string | null
    phone?: string | null
    email?: string | null
    lineId?: string | null
    isDecisionMaker?: boolean
    isPrimary?: boolean
  },
): Promise<void> {
  const res = await api.patch<ApiResponse<unknown>>(
    `/api/customers/${customerId}/contacts/${contactId}`,
    data,
  )
  if (!res.success) throw new Error(res.error || 'Failed to update contact')
}

export async function deleteContact(
  customerId: string,
  contactId: string,
): Promise<void> {
  const res = await api.delete<ApiResponse<unknown>>(
    `/api/customers/${customerId}/contacts/${contactId}`,
  )
  if (!res.success) throw new Error(res.error || 'Failed to delete contact')
}

// ===== Visit Plans =====

export async function fetchVisitPlans(month?: string): Promise<VisitPlan[]> {
  const qs = month ? `?month=${month}` : ''
  const res = await api.get<ApiResponse<VisitPlan[]>>(`/api/visit-plans${qs}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch visit plans')
  return res.data
}

// ===== Visit Logs =====

export async function fetchVisitLogs(): Promise<VisitLog[]> {
  const res = await api.get<ApiResponse<VisitLog[]>>('/api/visit-logs')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch visit logs')
  return res.data
}

// ===== Call Logs =====

export async function fetchCallLogs(): Promise<CallLog[]> {
  const res = await api.get<ApiResponse<CallLog[]>>('/api/call-logs')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch call logs')
  return res.data
}

// ===== Deals =====

export async function fetchDeals(): Promise<Deal[]> {
  const res = await api.get<ApiResponse<Deal[]>>('/api/deals')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch deals')
  return res.data
}

export async function createDeal(data: {
  customerId: string
  vehicleModel: string
  quantity: number
  expectedAmount?: number
  expectedCloseDate?: string
  notes?: string
  sourceCallLogId?: string
  sourceVisitLogId?: string
}): Promise<Deal> {
  const res = await api.post<ApiResponse<Deal>>('/api/deals', data)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to create deal')
  return res.data
}

export async function updateDealStage(dealId: string, stage: string): Promise<Deal> {
  const res = await api.patch<ApiResponse<Deal>>(`/api/deals/${dealId}/stage`, { stage })
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to update deal stage')
  return res.data
}

export async function fetchDealsSummary(): Promise<Array<{ stage: string; count: number; total_value: number }>> {
  const res = await api.get<ApiResponse<Array<{ stage: string; count: number; total_value: number }>>>('/api/deals/summary')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch deals summary')
  return res.data
}

// ===== Team Members =====

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await api.get<ApiResponse<TeamMember[]>>('/api/team')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch team members')
  return res.data
}

// ===== Monthly Targets =====

export async function fetchMonthlyTargets(month: string): Promise<MonthlyTarget[]> {
  const res = await api.get<ApiResponse<MonthlyTarget[]>>(`/api/targets/summary?month=${month}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch targets')
  return res.data
}

// ===== Reports (Manager only) =====

export async function fetchVisitCompletion(month: string): Promise<VisitCompletion[]> {
  const res = await api.get<ApiResponse<VisitCompletion[]>>(`/api/reports/visit-completion?month=${month}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch visit completion')
  return res.data
}

export async function fetchCallCompletion(month: string): Promise<CallCompletion[]> {
  const res = await api.get<ApiResponse<CallCompletion[]>>(`/api/reports/call-completion?month=${month}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch call completion')
  return res.data
}

export async function fetchLeadHeatmap(): Promise<LeadHeatmap> {
  const res = await api.get<ApiResponse<LeadHeatmap>>('/api/reports/lead-heatmap')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch lead heatmap')
  return res.data
}

export async function fetchSalesPerformance(): Promise<SalesPerformance[]> {
  const res = await api.get<ApiResponse<SalesPerformance[]>>('/api/reports/sales-performance')
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch sales performance')
  return res.data
}

export async function fetchCoverageGaps(month: string): Promise<CoverageGap[]> {
  const res = await api.get<ApiResponse<CoverageGap[]>>(`/api/reports/coverage-gaps?month=${month}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch coverage gaps')
  return res.data
}

export async function fetchTeamLeaderboard(month: string): Promise<TeamLeaderboardEntry[]> {
  const res = await api.get<ApiResponse<TeamLeaderboardEntry[]>>(`/api/reports/team-leaderboard?month=${month}`)
  if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch leaderboard')
  return res.data
}
