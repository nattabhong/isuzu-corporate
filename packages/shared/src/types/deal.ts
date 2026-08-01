export interface Deal {
  id: string
  customerId: string
  salesRepId: string
  vehicleModel: string
  quantity: number
  expectedAmount: number | null
  stage: string
  expectedCloseDate: string | null
  wonAmount: number | null
  notes: string | null
  sourceCallLogId: string | null
  sourceVisitLogId: string | null
  createdAt: string
  updatedAt: string
}
