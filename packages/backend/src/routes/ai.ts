import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { COMPETITOR_BATTLECARDS, DEFAULT_BATTLECARD } from '@sala-corporate/shared'
import type { AISummarizeLogResponse } from '@sala-corporate/shared'

export const aiRoutes = new Hono<{ Bindings: { AI?: any } }>()

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

// POST /api/ai/chat — contextual AI chat assistant
aiRoutes.post('/chat', authMiddleware, async (c) => {
  let body: { message?: string; pageContext?: { path?: string; title?: string } } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400)
  }

  const userMsg = (body.message || '').trim()
  const path = body.pageContext?.path || '/overview'
  const currentUser = c.get('user')

  if (!userMsg) {
    return c.json({ success: false, error: 'กรุณากรอกข้อความ' }, 400)
  }

  const lower = userMsg.toLowerCase()
  let reply = ''
  let suggestedPrompts: string[] = []

  // 1. Try Cloudflare Worker AI Provider if binding exists
  if (c.env.AI && typeof c.env.AI.run === 'function') {
    try {
      const systemPrompt = `คุณเป็น AI Assistant ประจำระบบบริหารการขายฟลีทองค์กร Sala Corporate (บริษัท ศาลาเชียงใหม่ จำกัด ตัวแทนจำหน่ายรถยนต์ Isuzu)
บริบทปัจจุบันที่ผู้ใช้อยู่คือหน้า: "${body.pageContext?.title || path}" (Path: ${path})
ผู้ใช้งานคือคุณ ${currentUser?.name || 'ทีมขาย'} (ตำแหน่ง: ${currentUser?.role || 'sales'})

หน้าที่ของคุณ:
1. ตอบคำถามภาษาไทยอย่างสุภาพ กระชับ ถูกต้อง และเป็นมืออาชีพ
2. ช่วยเหลือเรื่องสเปครถยนต์ Isuzu (D-MAX, MU-X, รถบรรทุก ELF, FORWARD, GIGA), การเปรียบเทียบกับคู่แข่ง (Toyota Revo, Ford Ranger), การบริหารดีล และการดูแลลูกค้าฟลีท
3. ให้คำแนะนำที่สอดคล้องกับบริบทของหน้าที่เปิดอยู่`

      const aiRes: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 512,
      })

      const rawReply = aiRes?.response || aiRes?.reply || aiRes?.description
      if (rawReply && typeof rawReply === 'string' && rawReply.trim().length > 0) {
        reply = rawReply.trim()
        if (path.includes('/customers')) suggestedPrompts = ['วิธีจัดกลุ่มลูกค้าเกรด A/B/C', 'สคริปต์โทรติดตามลูกค้ารายใหญ่']
        else if (path.includes('/deals')) suggestedPrompts = ['วิธีเปรียบเทียบ TCO กับ Toyota Revo', 'เทคนิคเสนอราคาไม่ตัดราคาแข่ง']
        else if (path.includes('/reports')) suggestedPrompts = ['สรุป KPI ของทีมขายเดือนนี้', 'กลยุทธ์เพิ่ม Conversion Rate']
        else suggestedPrompts = ['เปรียบเทียบจุดเด่น Isuzu กับ Toyota Revo', 'หลักการคำนวณค่างวด & ดอกเบี้ยฟลีท']

        return c.json({
          success: true,
          data: {
            reply,
            suggestedPrompts,
            provider: 'cloudflare-worker-ai',
          },
        })
      }
    } catch {
      // Fallback to domain intelligence engine below
    }
  }

  // 1. Path-based & Keyword Intelligence Engine
  if (lower.includes('revo') || lower.includes('โตโยต้า') || lower.includes('toyota')) {
    reply = `🚗 **เปรียบเทียบ ISUZU D-MAX vs Toyota Hilux Revo (สำหรับลูกค้าราชการ/ฟลีท)**:

1. **ประหยัดน้ำมัน & ค่าบำรุงรักษา (TCO)**: เครื่องยนต์ 1.9 Ddi Blue Power ประหยัดน้ำมันกว่า Revo 2.4 ประมาณ 12-15% และมีค่าอะไหล่/ค่าเช็คระยะต่ำกว่าในระยะยาว 5 ปี
2. **ราคาขายต่อ (Resale Value)**: Isuzu ครองตลาดมือสองในภาคเหนือ (เชียงใหม่/ลำพูน) ราคาสูงที่สุด
3. **การรับประกัน Fleet Service**: ศาลาเชียงใหม่ มีศูนย์บริการ Mobile Service ซ่อมถึงที่สำหรับลูกค้าร่องฟลีท

💡 *ข้อเสนอแนะ*: ยื่นข้อเสนอแพ็กเกจ Sala Care ฟรีค่าแรงเช็คระยะ 5 ปี เพื่อเอาชนะดีล Revo ครับ`
    suggestedPrompts = ['ขอตารางเปรียบเทียบ TCO 5 ปี', 'สคริปต์พูดเจรจากับลูกค้าที่เทใจไป Revo', 'คำนวณค่างวด D-MAX สเปคเทียบเท่า']
  } else if (lower.includes('ford') || lower.includes('ฟอร์ด') || lower.includes('ranger')) {
    reply = `🚘 **เปรียบเทียบ ISUZU D-MAX vs Ford Ranger**:

1. **ความทนทานและความน่าเชื่อถือ**: เครื่องยนต์ Isuzu Blue Power 3.0 & 1.9 ได้รับการยอมรับเรื่องความทนทาน ไม่จุกจิก ศูนย์บริการครอบคลุม อะไหล่หาง่าย
2. **ค่าบำรุงรักษา**: ค่าอะไหล่ศูนย์ Ford สูงกว่า Isuzu ประมาณ 25-30%
3. **จุดแข็ง D-MAX V-Cross**: ระบบขับเคลื่อน 4WD Terrain Command ตอบโจทย์การใช้งานลุยสวน/ดอยในเชียงใหม่ได้อย่างมั่นใจ

💡 *ข้อเสนอแนะ*: หากลูกค้าเน้นความคุ้มค่าระยะยาว แนะนำชูจุดเด่นเรื่องบริการหลังการขายของศาลาเชียงใหม่ครับ`
    suggestedPrompts = ['จุดเด่น Isuzu V-Cross 4x4 บนดอย', 'เปรียบเทียบค่าอะไหล่ศูนย์ Isuzu vs Ford']
  } else if (lower.includes('คำนวณ') || lower.includes('ค่างวด') || lower.includes('ไฟแนนซ์') || lower.includes('ดาวน์')) {
    reply = `📊 **หลักการคำนวณไฟแนนซ์ & ดอกเบี้ยฟลีทองค์กร**:

- **ดาวน์ 15-20%**: ไม่ต้องใช้ผู้ค้ำประกัน (สำหรับนิติบุคคลที่มีงบการเงินกำไร 2 ปีซ้อน)
- **ดอกเบี้ยฟลีทพิเศษ**: ดอกเบี้ยเริ่มต้น 1.79% - 2.19% สำหรับซื้อ 3 คันขึ้นไป
- **ระยะเวลาผ่อน**: 48 - 84 เดือน

💡 *ต้องการให้คำนวณค่างวดรุ่นไหนเป็นพิเศษ สามารถระบุรุ่นและเงินดาวน์ได้เลยครับ*`
    suggestedPrompts = ['คำนวณค่างวด D-MAX Cab4 ดาวน์ 20%', 'เงื่อนไขซื้อรถฟลีทในนามนิติบุคคล', 'อัตราดอกเบี้ยโปรโมชั่นเดือนนี้']
  } else if (path.includes('/customers')) {
    reply = `👥 **คำแนะนำสำหรับระบบจัดการลูกค้า (Customers)** (คุณกำลังอยู่ในหน้าลูกค้า):

- **เกรด A (Hot Lead)**: ติดตามภายใน 24 ชม., มีความต้องการชัดเจน พร้อมซื้อภายใน 30 วัน
- **เกรด B (Warm Lead)**: ติดตามทุก 3-5 วัน, กำลังเปรียบเทียบราคาหรือรออนุมัติงบ
- **เกรด C (Maintain)**: วางแผนส่งแคตตาล็อกและติดตามผลทุกเดือน

💡 *Tip*: สามารถกดปุ่ม "บันทึกการพบ" เพื่อให้ระบบ AI สรุปโน้ตและประเมิน Lead Level ให้อัตโนมัติได้ทันทีครับ`
    suggestedPrompts = ['วิธีจัดกลุ่มลูกค้าองค์กร', 'สคริปต์โทรติดตามลูกค้ารายใหญ่', 'สรุปจำนวนลูกค้าเกรด A ทั้งหมด']
  } else if (path.includes('/deals')) {
    reply = `💼 **คำแนะนำการบริหารดีลการขาย (Sales Deals)** (คุณกำลังอยู่ในหน้าบริหารดีล):

1. **ขั้นตอนเสนอราคา (Proposal)**: ควรส่งใบเสนอราคาพร้อมตารางเปรียบเทียบ TCO และโบร์ชัวร์ภายใน 2 ชม. หลังรับเรื่อง
2. **ขั้นตอนเจรจาเงื่อนไข (Negotiation)**: เน้นเสนอของแถมบริการหลังการขาย (Sala Care, ประกันภัยชั้น 1) แทนการตัดราคาแข่ง
3. **ดีลที่ใกล้ปิดขาย**: ลิสต์รายการดีลที่มีโอกาสปิดสูงในเดือนนี้เพื่อเร่งยื่นไฟแนนซ์

💡 *Tip*: คลิกเลือกดีลเพื่อดูรายละเอียดและประวัติการติดต่อย้อนหลังได้เลยครับ`
    suggestedPrompts = ['ขอเทคนิคปิดดีลฟลีท 5 คันขึ้นไป', 'วิธีติดตามดีลที่ค้างในขั้นตอนเสนอราคา', 'สรุปมูลค่าดีลใน Pipeline']
  } else if (path.includes('/reports')) {
    reply = `📈 **วิเคราะห์รายงานและประสิทธิภาพการขาย (Reports)** (คุณกำลังอยู่ในหน้ารายงาน):

- **Conversion Rate**: อัตราเปลี่ยนจาก Lead เป็นยอดขาย ควรอยู่ที่อย่างน้อย 25-30%
- **Average Deal Time**: ระยะเวลาปิดดีลเฉลี่ยของทีมอยู่ที่ 14-21 วัน
- **ยอดขายตามรุ่น**: Isuzu D-MAX Cab4 ครองสัดส่วนยอดขายสูงสุดในองค์กร

💡 *Tip*: เลือกกรองตามไตรมาสหรือตามทีมขายเพื่อดูเปรียบเทียบเป้าหมาย (Sales Target) ได้เลยครับ`
    suggestedPrompts = ['สรุป KPI รายบุคคลของทีมขาย', 'กลยุทธ์เพิ่ม Conversion Rate ให้ถึงเป้า', 'รายงานยอดขายเปรียบเทียบไตรมาส']
  } else if (path.includes('/calendar') || path.includes('/visits') || path.includes('/calls')) {
    reply = `📅 **คำแนะนำการวางแผนงานนัดหมาย & การพบลูกค้า**:

1. **เตรียมตัวก่อนพบลูกค้า**: ตรวจสอบประวัติการซื้อรุ่นเดิม, ปัญหาที่เคยเจอ, และสเปครถที่ลูกค้าสนใจ
2. **การลงบันทึกการพบ (Visit Log)**: บันทึกข้อมูลทันทีหลังพบลููกค้าเสร็จเพื่อให้ทีมสนับสนุนงานขายประสานงานต่อได้ทันที
3. **ติดตามผล**: ตั้งแจ้งเตือน Follow-up ภายใน 3 วันหลังพบลููกค้า

💡 *ต้องการให้เตรียมสคริปต์เปิดการขาย หรือคำถามเปิดใจลูกค้าธุรกิจแบบไหน ถามเพิ่มได้เลยครับ*`
    suggestedPrompts = ['สคริปต์เปิดการขายลูกค้า Fleet รายใหม่', 'เทคนิคถามความต้องการซื้อรถองค์กร', 'รายการเอกสารที่ต้องเตรียมไปพบลููกค้า']
  } else {
    reply = `สวัสดีครับคุณ ${currentUser?.name || 'ผู้ใช้งาน'} 👋 ผมเป็น **AI Assistant ประจำระบบ Sala Corporate**

ยินดีช่วยเหลือเรื่อง:
1. **ข้อมูลสเปครถ Isuzu** (D-MAX, MU-X, รถบรรทุก ELF/FORWARD/GIGA)
2. **กลยุทธ์การขาย & รับมือคู่แข่ง** (Toyota, Ford, Mitsubishi, Nissan)
3. **คำนวณเงื่อนไขไฟแนนซ์ & ข้อเสนอองค์กร**
4. **คำแนะนำขั้นตอนการขายตามบริบทหน้าที่คุณเปิดอยู่**

มีอะไรให้ผมช่วยเหลือในหน้านี้เพิ่มเติมไหมครับ?`
    suggestedPrompts = ['สรุปสเปครถ Isuzu D-MAX 2026', 'เปรียบเทียบจุดเด่น Isuzu กับ Toyota', 'แนะนำวิธีเพิ่มยอดขายเดือนนี้']
  }

  return c.json({
    success: true,
    data: {
      reply,
      suggestedPrompts,
    },
  })
})
