import type { LeadLevel } from '../constants/lead-levels'

export interface CallPlan {
  id: string
  customerId: string
  salesRepId: string
  month: string
  plannedDate: string
  callPurpose: 'check_in' | 'offer' | 'follow_up' | 'reminder'
  status: 'planned' | 'completed' | 'missed'
  createdAt: string
}

export interface CallLog {
  id: string
  callPlanId: string | null
  customerId: string
  salesRepId: string
  // Section 1
  contactName: string
  contactPosition: string | null
  contactPhone: string | null
  contactLineEmail: string | null
  callDate: string
  callTime: string | null
  notConvenient: boolean
  callbackDate: string | null
  callbackTime: string | null
  durationMinutes: number | null
  // Section 3
  fleetIsuzuCount: number | null
  fleetOtherCount: number | null
  fleetPickup: number | null
  fleetTruck: number | null
  fleetSuv: number | null
  fleetTotal: number | null
  usageTypes: string[] | null
  // Section 4
  usageStatusNotes: string | null
  hasProblemVehicles: boolean | null
  problemCount: number | null
  problemDetails: string | null
  serviceLocation: string | null
  serviceReason: string | null
  mainProblems: string[] | null
  // Section 5
  purchaseTimeline: string | null
  expectedQuantity: number | null
  interestedModels: string[] | null
  purchasePurpose: string[] | null
  // Section 6
  decisionMakers: { role: string; namePosition: string }[] | null
  keyFactors: string[] | null
  // Section 7
  interestedServices: string[] | null
  // Section 8
  leadLevel: LeadLevel | null
  customerNeeds: string | null
  problemsFound: string | null
  businessOpportunities: string[] | null
  // Section 9
  nextActions: string[]
  nextActionOwner: string | null
  nextActionDate: string | null
  nextActionDetails: string | null
  createdAt: string
  updatedAt: string
}
