export interface Customer {
  id: string
  name: string
  companyType: string | null
  industry: string | null
  address: string | null
  province: string | null
  district: string | null
  lat: number | null
  lng: number | null
  segment: 'A' | 'B' | 'C'
  assignedTo: string | null
  status: 'active' | 'inactive' | 'prospect'
  createdAt: string
  updatedAt: string
}

export interface CustomerContact {
  id: string
  customerId: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  lineId: string | null
  isDecisionMaker: boolean
  isPrimary: boolean
}

export interface CustomerDetail extends Customer {
  contacts: CustomerContact[]
  visitStats: { total: number; lastVisit: string | null }
  callStats: { total: number; lastCall: string | null; leadLevel: string | null }
  activeDeals: number
}
