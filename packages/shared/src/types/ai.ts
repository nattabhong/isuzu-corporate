export interface AIBattlecardRequest {
  competitorBrand: string
  vehicleModel?: string
}

export interface ObjectionItem {
  objection: string
  response: string
}

export interface AIBattlecardResponse {
  competitorBrand: string
  isuzuModel: string
  keyAdvantages: string[]
  objectionHandling: ObjectionItem[]
  tcoComparison: string
  salaServiceHighlights: string[]
}

export interface AISummarizeLogRequest {
  rawText: string
}

export interface AISummarizeLogResponse {
  customerNeeds: string
  leadLevel: 'hot' | 'warm' | 'future' | 'maintain' | 'inactive'
  nextAction: string
  suggestedModel?: string
}
