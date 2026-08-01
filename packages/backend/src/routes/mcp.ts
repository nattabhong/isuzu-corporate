import { Hono } from 'hono'
import { eq, and, sql as drizzleSql, count } from 'drizzle-orm'
import { createDb } from '../db'
import {
  customers,
  customerContacts,
  visitPlans,
  visitLogs,
  callPlans,
  callLogs,
  deals,
  monthlyTargets,
  teamMembers,
} from '../db/schema'
import type { DbClient } from '../db'

// ─── JSON-RPC 2.0 types ───
interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id: string | number | null
}

interface JsonRpcErrorShape {
  code: number
  message: string
  data?: unknown
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  result?: unknown
  error?: JsonRpcErrorShape
  id: string | number | null
}

class JsonRpcError extends Error {
  code: number
  data?: unknown
  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

// Error codes per JSON-RPC 2.0 spec
const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

type Env = {
  DB: D1Database | DbClient
  MCP_API_KEY: string
  LINE_CHANNEL_ACCESS_TOKEN?: string
}

function resolveDb(env: Env): DbClient {
  const db = env.DB
  if (db && typeof db === 'object' && 'insert' in db) {
    return db as unknown as DbClient
  }
  return createDb(db as D1Database)
}

// ─── JSON field helpers ───
const JSON_FIELDS = [
  'usageTypes', 'mainProblems', 'interestedModels', 'purchasePurpose',
  'decisionMakers', 'keyFactors', 'interestedServices', 'businessOpportunities',
  'nextActions', 'attachments',
]

function parseJsonFields(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const field of JSON_FIELDS) {
    const val = out[field]
    if (typeof val === 'string') {
      try { out[field] = JSON.parse(val) } catch { /* keep as-is */ }
    }
  }
  return out
}

// ─── MCP Tool implementations ───

async function listCustomers(db: DbClient, params?: Record<string, unknown>) {
  const segment = (params?.segment as string) || undefined
  const status = (params?.status as string) || undefined
  const province = (params?.province as string) || undefined
  const search = (params?.search as string) || undefined
  const limit = Math.min(Number(params?.limit) || 50, 200)
  const offset = Number(params?.offset) || 0

  // Build query with optional filters
  if (segment && status && province && search) {
    return db.select().from(customers)
      .where(and(
        eq(customers.segment, segment as any),
        eq(customers.status, status as any),
        eq(customers.province, province),
        drizzleSql`${customers.name} LIKE ${'%' + search + '%'}`,
      )).limit(limit).offset(offset).all()
  }
  if (segment && status && search) {
    return db.select().from(customers)
      .where(and(
        eq(customers.segment, segment as any),
        eq(customers.status, status as any),
        drizzleSql`${customers.name} LIKE ${'%' + search + '%'}`,
      )).limit(limit).offset(offset).all()
  }
  if (segment && status && province) {
    return db.select().from(customers)
      .where(and(
        eq(customers.segment, segment as any),
        eq(customers.status, status as any),
        eq(customers.province, province),
      )).limit(limit).offset(offset).all()
  }
  if (segment && status) {
    return db.select().from(customers)
      .where(and(
        eq(customers.segment, segment as any),
        eq(customers.status, status as any),
      )).limit(limit).offset(offset).all()
  }
  if (segment) {
    return db.select().from(customers)
      .where(eq(customers.segment, segment as any))
      .limit(limit).offset(offset).all()
  }
  if (status) {
    return db.select().from(customers)
      .where(eq(customers.status, status as any))
      .limit(limit).offset(offset).all()
  }
  if (province) {
    return db.select().from(customers)
      .where(eq(customers.province, province))
      .limit(limit).offset(offset).all()
  }
  if (search) {
    return db.select().from(customers)
      .where(drizzleSql`${customers.name} LIKE ${'%' + search + '%'}`)
      .limit(limit).offset(offset).all()
  }

  return db.select().from(customers).limit(limit).offset(offset).all()
}

async function getCustomerDetail(db: DbClient, params?: Record<string, unknown>) {
  const id = params?.id as string
  if (!id) throw new JsonRpcError(ERROR_CODES.INVALID_PARAMS, 'id is required')

  const customer = await db.select().from(customers).where(eq(customers.id, id)).get()
  if (!customer) return null

  const [contacts, visits, calls, activeDeals] = await Promise.all([
    db.select().from(customerContacts).where(eq(customerContacts.customerId, id)).all(),
    db.select().from(visitLogs).where(eq(visitLogs.customerId, id)).all(),
    db.select().from(callLogs).where(eq(callLogs.customerId, id)).all(),
    db.select().from(deals).where(
      and(eq(deals.customerId, id), drizzleSql`${deals.stage} NOT IN ('won','lost')`)
    ).all(),
  ])

  return {
    ...customer,
    contacts,
    visitHistory: visits.map((v: any) => ({ ...v, attachments: undefined })),
    callHistory: calls.map((c: any) => parseJsonFields(c as any)),
    activeDeals,
  }
}

async function getVisitHistory(db: DbClient, params?: Record<string, unknown>) {
  const customerId = params?.customer_id as string
  if (!customerId) throw new JsonRpcError(ERROR_CODES.INVALID_PARAMS, 'customer_id is required')

  const logs = await db.select().from(visitLogs)
    .where(eq(visitLogs.customerId, customerId))
    .orderBy(drizzleSql`${visitLogs.visitDate} DESC`)
    .all()

  return logs
}

async function getCallHistory(db: DbClient, params?: Record<string, unknown>) {
  const customerId = params?.customer_id as string
  if (!customerId) throw new JsonRpcError(ERROR_CODES.INVALID_PARAMS, 'customer_id is required')

  const logs = await db.select().from(callLogs)
    .where(eq(callLogs.customerId, customerId))
    .orderBy(drizzleSql`${callLogs.callDate} DESC`)
    .all()

  return logs.map((l: any) => parseJsonFields(l as any))
}

async function summarizeLead(db: DbClient, params?: Record<string, unknown>) {
  const customerId = params?.customer_id as string
  if (!customerId) throw new JsonRpcError(ERROR_CODES.INVALID_PARAMS, 'customer_id is required')

  const customer = await db.select().from(customers).where(eq(customers.id, customerId)).get()
  if (!customer) return null

  const lastCall = await db.select().from(callLogs)
    .where(eq(callLogs.customerId, customerId))
    .orderBy(drizzleSql`${callLogs.callDate} DESC`)
    .limit(1)
    .get()

  const activeDeals = await db.select().from(deals)
    .where(and(
      eq(deals.customerId, customerId),
      drizzleSql`${deals.stage} NOT IN ('won','lost')`,
    ))
    .all()

  const lastVisit = await db.select().from(visitLogs)
    .where(eq(visitLogs.customerId, customerId))
    .orderBy(drizzleSql`${visitLogs.visitDate} DESC`)
    .limit(1)
    .get()

  return {
    customerName: customer.name,
    segment: customer.segment,
    status: customer.status,
    leadLevel: (lastCall as any)?.leadLevel ?? null,
    customerNeeds: (lastCall as any)?.customerNeeds ?? null,
    interestedModels: parseJsonFields(lastCall as any || {})?.interestedModels ?? null,
    purchaseTimeline: (lastCall as any)?.purchaseTimeline ?? null,
    lastCallDate: (lastCall as any)?.callDate ?? null,
    lastVisitDate: lastVisit?.visitDate ?? null,
    activeDeals: activeDeals.length,
    totalVisitCount: (await db.select({ count: count() }).from(visitLogs).where(eq(visitLogs.customerId, customerId)).get())?.count ?? 0,
    totalCallCount: (await db.select({ count: count() }).from(callLogs).where(eq(callLogs.customerId, customerId)).get())?.count ?? 0,
  }
}

async function suggestNextAction(db: DbClient, params?: Record<string, unknown>) {
  const customerId = params?.customer_id as string
  if (!customerId) throw new JsonRpcError(ERROR_CODES.INVALID_PARAMS, 'customer_id is required')

  const lastCall = await db.select().from(callLogs)
    .where(eq(callLogs.customerId, customerId))
    .orderBy(drizzleSql`${callLogs.callDate} DESC`)
    .limit(1)
    .get()

  if (!lastCall) {
    return {
      recommendation: 'ยังไม่มีประวัติการติดต่อ — แนะนำให้โทรติดต่อครั้งแรกเพื่อแนะนำตัวและสอบถามข้อมูลเบื้องต้น',
      priority: 'high',
      reason: 'no_history',
    }
  }

  const parsed = parseJsonFields(lastCall as any) as any
  const leadLevel = parsed.leadLevel
  const nextActions = Array.isArray(parsed.nextActions) ? parsed.nextActions : []
  const nextActionDate = parsed.nextActionDate
  const nextActionOwner = parsed.nextActionOwner

  const overdue = nextActionDate && nextActionDate < new Date().toISOString().split('T')[0]

  const recommendations: string[] = []

  if (leadLevel === 'hot') {
    recommendations.push('Lead ระดับ Hot — ควรนัดหมายเข้าเยี่ยมหรือส่งใบเสนอราคาโดยเร็วที่สุด')
  } else if (leadLevel === 'warm') {
    recommendations.push('Lead ระดับ Warm — ควรโทรติดตามผลอย่างต่อเนื่องทุก 2 สัปดาห์')
  } else if (leadLevel === 'future') {
    recommendations.push('Lead ระดับ Future — ส่งข้อมูลโปรโมชั่นหรือข่าวสารเป็นระยะ')
  } else {
    recommendations.push('ควรโทรติดตามเพื่อประเมินสถานะปัจจุบัน')
  }

  if (overdue) {
    recommendations.push(`⚠️ เลยกำหนดการติดตามครั้งถัดไป (${nextActionDate}) — ควรดำเนินการทันที`)
  }

  if (parsed.purchaseTimeline === 'ภายใน 3 เดือน' && leadLevel !== 'hot') {
    recommendations.push('ลูกค้ามีแผนซื้อภายใน 3 เดือน — ควรยกระดับ Lead เป็น Hot')
  }

  return {
    recommendation: recommendations.join(' | '),
    priority: leadLevel === 'hot' ? 'high' : leadLevel === 'warm' ? 'medium' : 'low',
    reason: `based_on_last_call_${lastCall.callDate}`,
    lastCallDate: lastCall.callDate,
    leadLevel,
    nextActions,
    nextActionDate,
    nextActionOwner: nextActionOwner ?? null,
    overdue,
  }
}

async function getTeamPerformance(db: DbClient, params?: Record<string, unknown>) {
  const month = params?.month as string
  if (!month) throw new JsonRpcError(ERROR_CODES.INVALID_PARAMS, 'month is required (YYYY-MM)')

  const members = await db.select().from(teamMembers).where(eq(teamMembers.isActive, true)).all()

  const results = await Promise.all(members.map(async (member) => {
    const [visitCount, callCount, wonDeals, target] = await Promise.all([
      db.select({ count: count() }).from(visitLogs)
        .where(and(
          eq(visitLogs.salesRepId, member.id),
          drizzleSql`${visitLogs.visitDate} >= ${month + '-01'}`,
          drizzleSql`${visitLogs.visitDate} < ${month + '-32'}`,
        )).get(),
      db.select({ count: count() }).from(callLogs)
        .where(and(
          eq(callLogs.salesRepId, member.id),
          drizzleSql`${callLogs.callDate} >= ${month + '-01'}`,
          drizzleSql`${callLogs.callDate} < ${month + '-32'}`,
        )).get(),
      db.select({ count: count() }).from(deals)
        .where(and(
          eq(deals.salesRepId, member.id),
          eq(deals.stage, 'won'),
        )).get(),
      db.select().from(monthlyTargets)
        .where(and(
          eq(monthlyTargets.salesRepId, member.id),
          eq(monthlyTargets.month, month),
        )).get(),
    ])

    return {
      salesRepId: member.id,
      name: member.name,
      role: member.role,
      visitCount: visitCount?.count ?? 0,
      callCount: callCount?.count ?? 0,
      wonDeals: wonDeals?.count ?? 0,
      target: target ? {
        visitTarget: target.visitTarget,
        callTarget: target.callTarget,
        dealTarget: target.dealTarget,
      } : null,
    }
  }))

  return results
}

async function getOverdueFollowups(db: DbClient, _params?: Record<string, unknown>) {
  const today = new Date().toISOString().split('T')[0]

  // Overdue visit plans
  const overdueVisits = await db.select().from(visitPlans)
    .where(and(
      eq(visitPlans.status, 'planned'),
      drizzleSql`${visitPlans.plannedDate} < ${today}`,
    ))
    .all()

  // Overdue call plans
  const overdueCalls = await db.select().from(callPlans)
    .where(and(
      eq(callPlans.status, 'planned'),
      drizzleSql`${callPlans.plannedDate} < ${today}`,
    ))
    .all()

  // Plans where next action date has passed (from call logs)
  const overdueNextActions = await db.select().from(callLogs)
    .where(and(
      drizzleSql`${callLogs.nextActionDate} < ${today}`,
      drizzleSql`${callLogs.nextActionDate} IS NOT NULL`,
    ))
    .orderBy(drizzleSql`${callLogs.nextActionDate} ASC`)
    .all()

  return {
    overdueVisitPlans: overdueVisits,
    overdueCallPlans: overdueCalls,
    overdueNextActions: overdueNextActions.map((l: any) => parseJsonFields(l as any)),
    checkedAt: new Date().toISOString(),
  }
}

// ─── Tool registry ───
const tools: Record<string, (db: DbClient, params?: Record<string, unknown>) => Promise<unknown>> = {
  list_customers: listCustomers,
  get_customer_detail: getCustomerDetail,
  get_visit_history: getVisitHistory,
  get_call_history: getCallHistory,
  summarize_lead: summarizeLead,
  suggest_next_action: suggestNextAction,
  get_team_performance: getTeamPerformance,
  get_overdue_followups: getOverdueFollowups,
}

// ─── Hono route ───
export const mcpRoutes = new Hono<{ Bindings: Env }>()

// POST /api/mcp — JSON-RPC 2.0 entry point
mcpRoutes.post('/mcp', async (c) => {
  // API Key authentication
  const apiKey = c.env.MCP_API_KEY
  if (!apiKey) {
    return c.json({
      jsonrpc: '2.0',
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'MCP not configured — MCP_API_KEY not set' },
      id: null,
    } as JsonRpcResponse, 500)
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized — invalid or missing API key' },
      id: null,
    } as JsonRpcResponse, 401)
  }

  let body: JsonRpcRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({
      jsonrpc: '2.0',
      error: { code: ERROR_CODES.PARSE_ERROR, message: 'Parse error' },
      id: null,
    } as JsonRpcResponse, 400)
  }

  // Validate JSON-RPC 2.0 envelope
  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return c.json({
      jsonrpc: '2.0',
      error: { code: ERROR_CODES.INVALID_REQUEST, message: 'Invalid Request' },
      id: body.id ?? null,
    } as JsonRpcResponse, 400)
  }

  const handler = tools[body.method]
  if (!handler) {
    return c.json({
      jsonrpc: '2.0',
      error: { code: ERROR_CODES.METHOD_NOT_FOUND, message: `Method not found: ${body.method}` },
      id: body.id,
    } as JsonRpcResponse, 404)
  }

  try {
    const db = resolveDb(c.env)
    const result = await handler(db, body.params)
    return c.json({
      jsonrpc: '2.0',
      result,
      id: body.id,
    } as JsonRpcResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return c.json({
      jsonrpc: '2.0',
      error: { code: ERROR_CODES.INTERNAL_ERROR, message },
      id: body.id,
    } as JsonRpcResponse, 500)
  }
})
