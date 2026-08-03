import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { COMPETITOR_BATTLECARDS, DEFAULT_BATTLECARD } from '@sala-corporate/shared'
import type { AISummarizeLogResponse } from '@sala-corporate/shared'

export const aiRoutes = new Hono()

// POST /api/ai/battlecard — get competitive battlecard for competitor brand
aiRoutes.post('/battlecard', authMiddleware, async (c) => {
  let body: { competitorBrand?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    // Default fallback if no JSON body
  }

  const brand = (body.competitorBrand || '').toLowerCase()

  let matchedKey = 'toyota'
  if (brand.includes('ford') || brand.includes('ฟอร์ด') || brand.includes('ranger')) {
    matchedKey = 'ford'
  } else if (brand.includes('mitsubishi') || brand.includes('มิตซู') || brand.includes('triton')) {
    matchedKey = 'mitsubishi'
  } else if (brand.includes('nissan') || brand.includes('นิสสัน') || brand.includes('navara')) {
    matchedKey = 'nissan'
  } else if (brand.includes('none') || brand.includes('ไม่มีคู่แข่ง') || brand.includes('ยกเลิก')) {
    matchedKey = 'none'
  } else if (brand.includes('toyota') || brand.includes('โตโยต้า') || brand.includes('revo')) {
    matchedKey = 'toyota'
  }

  const battlecard = COMPETITOR_BATTLECARDS[matchedKey] || DEFAULT_BATTLECARD
  return c.json({ success: true, data: battlecard })
})

// POST /api/ai/summarize-log — extract structured data from raw Thai meeting notes
aiRoutes.post('/summarize-log', authMiddleware, async (c) => {
  let body: { rawText?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400)
  }

  const raw = (body.rawText || '').trim()
  if (!raw) {
    return c.json({ success: false, error: 'กรุณากรอกข้อความที่ต้องการให้ AI สรุป' }, 400)
  }

  const textLower = raw.toLowerCase()

  // 1. Detect Lead Level
  let leadLevel: AISummarizeLogResponse['leadLevel'] = 'warm'
  if (
    textLower.includes('ด่วน') ||
    textLower.includes('พร้อมเซ็น') ||
    textLower.includes('ซื้อเดือนนี้') ||
    textLower.includes('ภายในเดือน') ||
    textLower.includes('อนุมัติแล้ว') ||
    textLower.includes('มัดจำ')
  ) {
    leadLevel = 'hot'
  } else if (
    textLower.includes('ปีหน้า') ||
    textLower.includes('ไตรมาส') ||
    textLower.includes('ยังไม่มีงบ') ||
    textLower.includes('รอแผนปีหน้า')
  ) {
    leadLevel = 'future'
  } else if (
    textLower.includes('ชะลอ') ||
    textLower.includes('ยังไม่สนใจ') ||
    textLower.includes('ยกเลิก')
  ) {
    leadLevel = 'maintain'
  }

  // 2. Detect Suggested Vehicle Model
  let suggestedModel = 'ISUZU D-MAX CAB4 1.9 Ddi S'
  if (textLower.includes('mu-x') || textLower.includes('มิวเอกซ์')) {
    suggestedModel = 'ISUZU MU-X 1.9 Ddi Elegant'
  } else if (textLower.includes('elf') || textLower.includes('หกล้อ') || textLower.includes('บรรทุกเล็ก')) {
    suggestedModel = 'ISUZU ELF NLR 130'
  } else if (textLower.includes('forward') || textLower.includes('10 ล้อ') || textLower.includes('สิบล้อ')) {
    suggestedModel = 'ISUZU FORWARD FTR 240'
  } else if (textLower.includes('v-cross') || textLower.includes('4x4') || textLower.includes('โฟร์วิล')) {
    suggestedModel = 'ISUZU D-MAX V-CROSS 4x4 3.0 Ddi'
  } else if (textLower.includes('spark') || textLower.includes('ตอนเดียว')) {
    suggestedModel = 'ISUZU D-MAX SPARK 1.9 Ddi S'
  }

  // 3. Extract Customer Needs & Action Items
  const customerNeeds = `ความต้องการ: ${raw.slice(0, 180)}${raw.length > 180 ? '...' : ''}`
  const nextAction = leadLevel === 'hot'
    ? 'ส่งใบเสนอราคาอย่างเป็นทางการและนัดเซ็นสัญญาซื้อขายฟลีท'
    : 'ส่งแคตตาล็อก ตารางเปรียบเทียบสเปค และติดตามผลภายใน 3 วัน'

  const result: AISummarizeLogResponse = {
    customerNeeds,
    leadLevel,
    nextAction,
    suggestedModel,
  }

  return c.json({ success: true, data: result })
})
