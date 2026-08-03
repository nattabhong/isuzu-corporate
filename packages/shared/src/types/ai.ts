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

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  suggestedActions?: string[]
}

export interface PageContext {
  path: string
  title?: string
  entityId?: string
  entityType?: 'customer' | 'deal' | 'report' | 'visit' | 'call' | 'general'
}

export interface AIChatRequest {
  message: string
  pageContext: PageContext
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface AIChatResponse {
  reply: string
  suggestedPrompts?: string[]
  suggestedActions?: { label: string; action: string }[]
}
