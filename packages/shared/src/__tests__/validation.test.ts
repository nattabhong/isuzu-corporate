import { describe, it, expect } from 'vitest'
import {
  createCustomerSchema,
  createVisitLogSchema,
  createCallLogSchema,
  createDealSchema,
  updateDealStageSchema,
  createTeamMemberSchema,
  createVisitPlanSchema,
  createCallPlanSchema,
  upsertMonthlyTargetSchema,
  decisionMakerSchema,
} from '../validation'

// ============================================================
// createCustomerSchema
// ============================================================
describe('createCustomerSchema', () => {
  it('accepts valid customer with name only', () => {
    const result = createCustomerSchema.safeParse({ name: 'Isuzu Chiang Mai' })
    expect(result.success).toBe(true)
  })

  it('defaults segment to "B"', () => {
    const result = createCustomerSchema.parse({ name: 'Isuzu Chiang Mai' })
    expect(result.segment).toBe('B')
  })

  it('accepts full customer data', () => {
    const result = createCustomerSchema.safeParse({
      name: 'บริษัท อีซูซุเชียงใหม่ จำกัด',
      companyType: 'ผู้แทนจำหน่าย',
      industry: 'ยานยนต์',
      address: '123 ถ.ห้วยแก้ว',
      province: 'เชียงใหม่',
      district: 'เมือง',
      segment: 'A',
      assignedTo: 'user-1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects customer without name (empty object)', () => {
    const result = createCustomerSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true)
    }
  })

  it('rejects customer with empty name', () => {
    const result = createCustomerSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('กรุณากรอกชื่อบริษัท')
    }
  })

  it('rejects invalid segment', () => {
    const result = createCustomerSchema.safeParse({ name: 'Test', segment: 'X' })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// createVisitLogSchema
// ============================================================
describe('createVisitLogSchema', () => {
  it('accepts valid visit log with minimum fields', () => {
    const result = createVisitLogSchema.safeParse({
      customerId: 'cust-1',
      visitDate: '2026-08-01',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full visit log', () => {
    const result = createVisitLogSchema.safeParse({
      customerId: 'cust-1',
      visitPlanId: 'plan-1',
      visitDate: '2026-08-01',
      startTime: '09:00',
      endTime: '10:30',
      gpsLat: 18.7877,
      gpsLng: 98.9931,
      notes: 'ลูกค้าสนใจ D-Max 3.0',
      nextStep: 'ส่งใบเสนอราคา',
      customerMood: 'positive',
    })
    expect(result.success).toBe(true)
  })

  it('rejects visit log without customerId', () => {
    const result = createVisitLogSchema.safeParse({ visitDate: '2026-08-01' })
    expect(result.success).toBe(false)
  })

  it('rejects visit log without visitDate', () => {
    const result = createVisitLogSchema.safeParse({ customerId: 'cust-1' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid customerMood', () => {
    const result = createVisitLogSchema.safeParse({
      customerId: 'cust-1',
      visitDate: '2026-08-01',
      customerMood: 'angry',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// decisionMakerSchema
// ============================================================
describe('decisionMakerSchema', () => {
  it('accepts valid decision maker', () => {
    const result = decisionMakerSchema.safeParse({
      role: 'MD',
      namePosition: 'คุณสมชาย — Managing Director',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    const result = decisionMakerSchema.safeParse({ role: 'MD' })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// createCallLogSchema
// ============================================================
describe('createCallLogSchema', () => {
  it('accepts minimum valid call log', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
    })
    expect(result.success).toBe(true)
  })

  it('defaults notConvenient to false', () => {
    const result = createCallLogSchema.parse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
    })
    expect(result.notConvenient).toBe(false)
  })

  it('accepts full 10-section call log', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      callPlanId: 'plan-1',
      contactName: 'คุณสมชาย',
      contactPosition: 'MD',
      contactPhone: '0812345678',
      contactLineEmail: 'somchai@example.com',
      callDate: '2026-08-01',
      callTime: '14:00',
      notConvenient: true,
      callbackDate: '2026-08-03',
      callbackTime: '10:00',
      durationMinutes: 15,
      fleetIsuzuCount: 5,
      fleetOtherCount: 2,
      fleetPickup: 3,
      fleetTruck: 2,
      fleetSuv: 0,
      usageTypes: ['ขนส่งสินค้า', 'ส่งของข้ามจังหวัด'],
      usageStatusNotes: 'ใช้งานปกติ',
      hasProblemVehicles: true,
      problemCount: 2,
      problemDetails: 'รถเสียบ่อย',
      serviceLocation: 'chiangmai',
      serviceReason: 'ใกล้บริษัท',
      mainProblems: ['รถหยุดวิ่งนาน', 'ค่าใช้จ่ายงานซ่อมสูง'],
      purchaseTimeline: '3m',
      expectedQuantity: 2,
      interestedModels: ['กระบะ 4 ประตู (Cab4 / Hi-Lander)', 'มิว-เอ็กซ์ (MU-X)'],
      purchasePurpose: ['ขยายธุรกิจ'],
      decisionMakers: [{ role: 'MD', namePosition: 'คุณสมชาย — MD' }],
      keyFactors: ['ราคารถ', 'ความประหยัดน้ำมัน', 'บริการหลังการขาย'],
      interestedServices: ['เสนอรถใหม่', 'ขอใบเสนอราคา'],
      leadLevel: 'hot',
      customerNeeds: 'ต้องการรถใหม่',
      problemsFound: 'รถเก่าเสียบ่อย',
      businessOpportunities: ['เสนอ D-Max 3.0'],
      nextActions: ['ส่งใบเสนอราคา', 'นัดเข้าเยี่ยมบริษัท'],
      nextActionOwner: 'user-1',
      nextActionDate: '2026-08-05',
      nextActionDetails: 'เตรียมใบเสนอราคา D-Max',
    })
    expect(result.success).toBe(true)
  })

  it('rejects call log without contactName', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('contactName'))).toBe(true)
    }
  })

  it('rejects call log with empty contactName', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: '',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.message === 'กรุณากรอกชื่อผู้ติดต่อ')).toBe(true)
    }
  })

  it('rejects call log without nextActions', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty nextActions array', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.message === 'ต้องมีอย่างน้อย 1 รายการ')).toBe(true)
    }
  })

  it('rejects more than 3 keyFactors', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
      keyFactors: ['ราคารถ', 'ค่างวด', 'อัตราดอกเบี้ย', 'ความประหยัดน้ำมัน'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.message === 'เลือกได้ไม่เกิน 3 ข้อ')).toBe(true)
    }
  })

  it('rejects invalid leadLevel', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
      leadLevel: 'super_hot',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid serviceLocation', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
      serviceLocation: 'bangkok',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid purchaseTimeline', () => {
    const result = createCallLogSchema.safeParse({
      customerId: 'cust-1',
      contactName: 'คุณสมชาย',
      callDate: '2026-08-01',
      nextActions: ['โทรติดตามอีกครั้ง'],
      purchaseTimeline: 'next_week',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// createDealSchema
// ============================================================
describe('createDealSchema', () => {
  it('accepts valid deal with minimum fields', () => {
    const result = createDealSchema.safeParse({
      customerId: 'cust-1',
      vehicleModel: 'D-Max 3.0 L',
      quantity: 1,
    })
    expect(result.success).toBe(true)
  })

  it('defaults stage to "lead"', () => {
    const result = createDealSchema.parse({
      customerId: 'cust-1',
      vehicleModel: 'D-Max 3.0 L',
      quantity: 1,
    })
    expect(result.stage).toBe('lead')
  })

  it('rejects deal without customerId', () => {
    const result = createDealSchema.safeParse({
      vehicleModel: 'D-Max 3.0 L',
      quantity: 1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero quantity', () => {
    const result = createDealSchema.safeParse({
      customerId: 'cust-1',
      vehicleModel: 'D-Max 3.0 L',
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = createDealSchema.safeParse({
      customerId: 'cust-1',
      vehicleModel: 'D-Max 3.0 L',
      quantity: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid stage', () => {
    const result = createDealSchema.safeParse({
      customerId: 'cust-1',
      vehicleModel: 'D-Max 3.0 L',
      quantity: 1,
      stage: 'completed',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// updateDealStageSchema
// ============================================================
describe('updateDealStageSchema', () => {
  it('accepts valid stage', () => {
    const result = updateDealStageSchema.safeParse({ stage: 'won' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid stage', () => {
    const result = updateDealStageSchema.safeParse({ stage: 'completed' })
    expect(result.success).toBe(false)
  })

  it('rejects missing stage', () => {
    const result = updateDealStageSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================================
// createTeamMemberSchema
// ============================================================
describe('createTeamMemberSchema', () => {
  it('accepts valid team member with name only', () => {
    const result = createTeamMemberSchema.safeParse({ name: 'คุณสมชาย' })
    expect(result.success).toBe(true)
  })

  it('defaults role to "sales_rep"', () => {
    const result = createTeamMemberSchema.parse({ name: 'คุณสมชาย' })
    expect(result.role).toBe('sales_rep')
  })

  it('accepts full team member', () => {
    const result = createTeamMemberSchema.safeParse({
      name: 'คุณสมชาย',
      email: 'somchai@isuzu.co.th',
      phone: '0812345678',
      role: 'manager',
      territory: 'เชียงใหม่',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = createTeamMemberSchema.safeParse({
      name: 'คุณสมชาย',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = createTeamMemberSchema.safeParse({
      name: 'คุณสมชาย',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createTeamMemberSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// createVisitPlanSchema
// ============================================================
describe('createVisitPlanSchema', () => {
  it('accepts valid visit plan with minimum fields', () => {
    const result = createVisitPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
    })
    expect(result.success).toBe(true)
  })

  it('defaults visitType to "follow_up"', () => {
    const result = createVisitPlanSchema.parse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
    })
    expect(result.visitType).toBe('follow_up')
  })

  it('rejects invalid month format', () => {
    const result = createVisitPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '08-2026',
      plannedDate: '2026-08-15',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid YYYY-MM month', () => {
    const result = createVisitPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-01',
      plannedDate: '2026-08-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid visitType', () => {
    const result = createVisitPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
      visitType: 'casual',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing salesRepId', () => {
    const result = createVisitPlanSchema.safeParse({
      customerId: 'cust-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// createCallPlanSchema
// ============================================================
describe('createCallPlanSchema', () => {
  it('accepts valid call plan with minimum fields', () => {
    const result = createCallPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
    })
    expect(result.success).toBe(true)
  })

  it('defaults callPurpose to "check_in"', () => {
    const result = createCallPlanSchema.parse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
    })
    expect(result.callPurpose).toBe('check_in')
  })

  it('rejects invalid callPurpose', () => {
    const result = createCallPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: '2026-08',
      plannedDate: '2026-08-15',
      callPurpose: 'casual',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid month format', () => {
    const result = createCallPlanSchema.safeParse({
      customerId: 'cust-1',
      salesRepId: 'user-1',
      month: 'August',
      plannedDate: '2026-08-15',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// upsertMonthlyTargetSchema
// ============================================================
describe('upsertMonthlyTargetSchema', () => {
  it('accepts valid target', () => {
    const result = upsertMonthlyTargetSchema.safeParse({
      salesRepId: 'user-1',
      month: '2026-08',
      visitTarget: 20,
      callTarget: 50,
    })
    expect(result.success).toBe(true)
  })

  it('accepts target with optional dealTarget', () => {
    const result = upsertMonthlyTargetSchema.safeParse({
      salesRepId: 'user-1',
      month: '2026-08',
      visitTarget: 20,
      callTarget: 50,
      dealTarget: 5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative visitTarget', () => {
    const result = upsertMonthlyTargetSchema.safeParse({
      salesRepId: 'user-1',
      month: '2026-08',
      visitTarget: -1,
      callTarget: 50,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative callTarget', () => {
    const result = upsertMonthlyTargetSchema.safeParse({
      salesRepId: 'user-1',
      month: '2026-08',
      visitTarget: 20,
      callTarget: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid month format', () => {
    const result = upsertMonthlyTargetSchema.safeParse({
      salesRepId: 'user-1',
      month: 'not-a-month',
      visitTarget: 20,
      callTarget: 50,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = upsertMonthlyTargetSchema.safeParse({
      month: '2026-08',
      visitTarget: 20,
    })
    expect(result.success).toBe(false)
  })
})
