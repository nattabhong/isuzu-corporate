import { eq, and, sql as drizzleSql, count } from 'drizzle-orm'
import { createDb } from '../db'
import { customers, visitPlans, callPlans, callLogs, deals, teamMembers } from '../db/schema'
import type { DbClient } from '../db'

type Env = {
  DB: D1Database | DbClient
  LINE_CHANNEL_ACCESS_TOKEN: string
}

function resolveDb(env: Env): DbClient {
  const db = env.DB
  if (db && typeof db === 'object' && 'insert' in db) {
    return db as unknown as DbClient
  }
  return createDb(db as D1Database)
}

/**
 * Send a push message via LINE Messaging API
 */
async function sendLineMessage(
  accessToken: string,
  userId: string,
  messages: Array<{ type: string; text?: string; altText?: string; contents?: unknown }>,
): Promise<boolean> {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error(`LINE push failed (${res.status}): ${errBody}`)
      return false
    }

    return true
  } catch (err) {
    console.error('LINE push error:', err)
    return false
  }
}

/**
 * Send notification to all reps assigned to a customer
 */
async function notifyCustomerReps(
  db: DbClient,
  accessToken: string,
  customerId: string,
  message: string,
  additionalMessages?: Array<{ type: string; text?: string; altText?: string; contents?: unknown }>,
): Promise<string[]> {
  const customer = await db.select().from(customers).where(eq(customers.id, customerId)).get()
  if (!customer) return []

  const sent: string[] = []

  // Find the assigned sales rep
  if (customer.assignedTo) {
    const rep = await db.select().from(teamMembers).where(eq(teamMembers.id, customer.assignedTo)).get()
    if (rep?.lineUserId) {
      const fullMessage = `📋 *Sala Corporate CRM*\n\n${message}\n\nลูกค้า: ${customer.name}\nSegment: ${customer.segment}`
      const ok = await sendLineMessage(accessToken, rep.lineUserId, [
        { type: 'text', text: fullMessage },
      ])
      if (ok) sent.push(rep.id)
    }
  }

  return sent
}

/**
 * Notify about overdue visit plans
 */
export async function notifyOverdueVisits(env: Env): Promise<{ notified: number; errors: number }> {
  const db = resolveDb(env)
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return { notified: 0, errors: 0 }

  const today = new Date().toISOString().split('T')[0]

  const overdue = await db.select().from(visitPlans)
    .where(and(
      eq(visitPlans.status, 'planned'),
      drizzleSql`${visitPlans.plannedDate} < ${today}`,
    ))
    .all()

  let notified = 0
  let errors = 0

  for (const plan of overdue) {
    const customer = await db.select().from(customers).where(eq(customers.id, plan.customerId)).get()
    if (!customer?.assignedTo) continue

    const rep = await db.select().from(teamMembers).where(eq(teamMembers.id, customer.assignedTo)).get()
    if (!rep?.lineUserId) continue

    const message = `⚠️ *แจ้งเตือน: แผนเข้าเยี่ยมเกินกำหนด*\n\nลูกค้า: ${customer.name}\nวันที่วางแผน: ${plan.plannedDate}\nประเภท: ${plan.visitType}\n\nกรุณาดำเนินการหรือปรับเลื่อนแผน`
    const ok = await sendLineMessage(accessToken, rep.lineUserId, [
      { type: 'text', text: message },
    ])
    if (ok) notified++; else errors++
  }

  return { notified, errors }
}

/**
 * Notify about overdue call plans
 */
export async function notifyOverdueCalls(env: Env): Promise<{ notified: number; errors: number }> {
  const db = resolveDb(env)
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return { notified: 0, errors: 0 }

  const today = new Date().toISOString().split('T')[0]

  const overdue = await db.select().from(callPlans)
    .where(and(
      eq(callPlans.status, 'planned'),
      drizzleSql`${callPlans.plannedDate} < ${today}`,
    ))
    .all()

  let notified = 0
  let errors = 0

  for (const plan of overdue) {
    const customer = await db.select().from(customers).where(eq(customers.id, plan.customerId)).get()
    if (!customer?.assignedTo) continue

    const rep = await db.select().from(teamMembers).where(eq(teamMembers.id, customer.assignedTo)).get()
    if (!rep?.lineUserId) continue

    const message = `📞 *แจ้งเตือน: แผนโทรเกินกำหนด*\n\nลูกค้า: ${customer.name}\nวันที่วางแผน: ${plan.plannedDate}\nวัตถุประสงค์: ${plan.callPurpose}\n\nกรุณาดำเนินการหรือปรับเลื่อนแผน`
    const ok = await sendLineMessage(accessToken, rep.lineUserId, [
      { type: 'text', text: message },
    ])
    if (ok) notified++; else errors++
  }

  return { notified, errors }
}

/**
 * Notify when a deal is won
 */
export async function notifyDealWon(env: Env, dealId: string): Promise<string[]> {
  const db = resolveDb(env)
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return []

  const deal = await db.select().from(deals).where(eq(deals.id, dealId)).get()
  if (!deal || deal.stage !== 'won') return []

  const customer = await db.select().from(customers).where(eq(customers.id, deal.customerId)).get()
  if (!customer) return []

  const sent: string[] = []

  // Notify the rep who closed the deal
  const rep = await db.select().from(teamMembers).where(eq(teamMembers.id, deal.salesRepId)).get()
  if (rep?.lineUserId) {
    const message = `🎉 *ปิดดีลสำเร็จ!*\n\nลูกค้า: ${customer.name}\nรุ่น: ${deal.vehicleModel}\nจำนวน: ${deal.quantity} คัน\nมูลค่า: ${(deal.wonAmount || deal.expectedAmount || 0).toLocaleString()} บาท`
    const ok = await sendLineMessage(accessToken, rep.lineUserId, [
      { type: 'text', text: message },
    ])
    if (ok) sent.push(rep.id)
  }

  // Notify managers
  const managers = await db.select().from(teamMembers)
    .where(eq(teamMembers.role, 'manager' as any))
    .all()

  for (const manager of managers) {
    if (manager.lineUserId && !sent.includes(manager.id)) {
      const message = `🎉 *ดีลปิดแล้ว*\n\nผู้ขาย: ${rep?.name || 'ไม่ระบุ'}\nลูกค้า: ${customer.name}\nรุ่น: ${deal.vehicleModel}\nจำนวน: ${deal.quantity} คัน\nมูลค่า: ${(deal.wonAmount || deal.expectedAmount || 0).toLocaleString()} บาท`
      const ok = await sendLineMessage(accessToken, manager.lineUserId, [
        { type: 'text', text: message },
      ])
      if (ok) sent.push(manager.id)
    }
  }

  return sent
}

/**
 * Notify when a lead is upgraded to Hot
 */
export async function notifyLeadUpgradedToHot(
  env: Env,
  customerId: string,
  repId: string,
): Promise<string[]> {
  const db = resolveDb(env)
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return []

  const customer = await db.select().from(customers).where(eq(customers.id, customerId)).get()
  if (!customer) return []

  const sent: string[] = []

  // Notify the rep
  const rep = await db.select().from(teamMembers).where(eq(teamMembers.id, repId)).get()
  if (rep?.lineUserId) {
    const message = `🔥 *Lead อัปเกรดเป็น Hot!*\n\nลูกค้า: ${customer.name}\nSegment: ${customer.segment}\n\nลูกค้ามีแผนซื้อภายใน 3 เดือน — กรุณาติดตามอย่างใกล้ชิด`
    const ok = await sendLineMessage(accessToken, rep.lineUserId, [
      { type: 'text', text: message },
    ])
    if (ok) sent.push(rep.id)
  }

  // Notify managers
  const managers = await db.select().from(teamMembers)
    .where(eq(teamMembers.role, 'manager' as any))
    .all()

  for (const manager of managers) {
    if (manager.lineUserId && !sent.includes(manager.id)) {
      const message = `🔥 *Lead Hot แจ้งเตือน*\n\nผู้ดูแล: ${rep?.name || 'ไม่ระบุ'}\nลูกค้า: ${customer.name}\nSegment: ${customer.segment}`
      const ok = await sendLineMessage(accessToken, manager.lineUserId, [
        { type: 'text', text: message },
      ])
      if (ok) sent.push(manager.id)
    }
  }

  return sent
}

/**
 * Send daily summary to managers
 */
export async function sendDailySummary(env: Env): Promise<{ notified: number; errors: number }> {
  const db = resolveDb(env)
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return { notified: 0, errors: 0 }

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  // Get stats
  const [
    todayVisits,
    todayCalls,
    activeDeals,
    wonDealsThisMonth,
    overdueVisits,
    overdueCalls,
    hotLeads,
  ] = await Promise.all([
    db.select({ count: count() }).from(visitPlans).where(and(
      eq(visitPlans.status, 'completed'),
      drizzleSql`${visitPlans.plannedDate} = ${today}`,
    )).get(),
    db.select({ count: count() }).from(callPlans).where(and(
      eq(callPlans.status, 'completed'),
      drizzleSql`${callPlans.plannedDate} = ${today}`,
    )).get(),
    db.select({ count: count() }).from(deals).where(and(
      drizzleSql`${deals.stage} NOT IN ('won','lost')`,
    )).get(),
    db.select({ count: count() }).from(deals).where(and(
      eq(deals.stage, 'won'),
      drizzleSql`${deals.updatedAt} >= ${currentMonth + '-01'}`,
    )).get(),
    db.select({ count: count() }).from(visitPlans).where(and(
      eq(visitPlans.status, 'planned'),
      drizzleSql`${visitPlans.plannedDate} < ${today}`,
    )).get(),
    db.select({ count: count() }).from(callPlans).where(and(
      eq(callPlans.status, 'planned'),
      drizzleSql`${callPlans.plannedDate} < ${today}`,
    )).get(),
    db.select({ count: count() }).from(callLogs).where(and(
      eq(callLogs.leadLevel, 'hot'),
    )).get(),
  ])

  const message = `📊 *Sala Corporate — สรุปประจำวัน ${today}*\n\n` +
    `✅ วันนี้เข้าเยี่ยม: ${todayVisits?.count ?? 0} ครั้ง\n` +
    `📞 วันนี้โทร: ${todayCalls?.count ?? 0} ครั้ง\n` +
    `💰 ดีลที่กำลังดำเนินการ: ${activeDeals?.count ?? 0} ดีล\n` +
    `🏆 ปิดดีลเดือนนี้: ${wonDealsThisMonth?.count ?? 0} ดีล\n` +
    `🔥 Lead Hot: ${hotLeads?.count ?? 0} ราย\n\n` +
    `⚠️ แผนเข้าเยี่ยมเลยกำหนด: ${overdueVisits?.count ?? 0} รายการ\n` +
    `⚠️ แผนโทรเลยกำหนด: ${overdueCalls?.count ?? 0} รายการ`

  // Send to all managers
  const managers = await db.select().from(teamMembers)
    .where(eq(teamMembers.role, 'manager' as any))
    .all()

  let notified = 0
  let errors = 0

  for (const manager of managers) {
    if (manager.lineUserId) {
      const ok = await sendLineMessage(accessToken, manager.lineUserId, [
        { type: 'text', text: message },
      ])
      if (ok) notified++; else errors++
    }
  }

  return { notified, errors }
}

/**
 * Run all overdue checks and notify
 */
export async function runOverdueChecks(env: Env): Promise<{
  visitResult: { notified: number; errors: number }
  callResult: { notified: number; errors: number }
}> {
  const [visitResult, callResult] = await Promise.all([
    notifyOverdueVisits(env),
    notifyOverdueCalls(env),
  ])
  return { visitResult, callResult }
}
