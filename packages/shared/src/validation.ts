import { z } from 'zod'
import {
  LEAD_LEVELS, SERVICE_LOCATIONS, PURCHASE_TIMELINES,
  USAGE_TYPES, MAIN_PROBLEMS, KEY_FACTORS, INTERESTED_SERVICES,
  NEXT_ACTIONS, INTERESTED_MODELS, PURCHASE_PURPOSES, DEAL_STAGES,
  ISUZU_MODELS,
} from './constants'

// Customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อบริษัท'),
  companyType: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  segment: z.enum(['A', 'B', 'C']).default('B'),
  assignedTo: z.string().optional(),
  fleetContractExpiry: z.string().optional(),
  zone: z.string().optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

// Visit Log
export const createVisitLogSchema = z.object({
  customerId: z.string().min(1),
  visitPlanId: z.string().optional(),
  visitDate: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  notes: z.string().optional(),
  nextStep: z.string().optional(),
  customerMood: z.enum(['positive', 'neutral', 'concerned']).optional(),
})

// Call Log (10-section validation)
export const decisionMakerSchema = z.object({
  role: z.string(),
  namePosition: z.string(),
})

export const createCallLogSchema = z.object({
  customerId: z.string().min(1),
  callPlanId: z.string().optional(),
  // Section 1
  contactName: z.string().min(1, 'กรุณากรอกชื่อผู้ติดต่อ'),
  contactPosition: z.string().optional(),
  contactPhone: z.string().optional(),
  contactLineEmail: z.string().optional(),
  callDate: z.string().min(1),
  callTime: z.string().optional(),
  notConvenient: z.boolean().default(false),
  callbackDate: z.string().optional(),
  callbackTime: z.string().optional(),
  durationMinutes: z.number().optional(),
  // Section 3
  fleetIsuzuCount: z.number().optional(),
  fleetOtherCount: z.number().optional(),
  fleetPickup: z.number().optional(),
  fleetTruck: z.number().optional(),
  fleetSuv: z.number().optional(),
  usageTypes: z.array(z.enum(USAGE_TYPES)).optional(),
  // Section 4
  usageStatusNotes: z.string().optional(),
  hasProblemVehicles: z.boolean().optional(),
  problemCount: z.number().optional(),
  problemDetails: z.string().optional(),
  serviceLocation: z.enum(SERVICE_LOCATIONS).optional(),
  serviceReason: z.string().optional(),
  mainProblems: z.array(z.enum(MAIN_PROBLEMS)).optional(),
  // Section 5
  purchaseTimeline: z.enum(PURCHASE_TIMELINES).optional(),
  expectedQuantity: z.number().optional(),
  interestedModels: z.array(z.enum(INTERESTED_MODELS)).optional(),
  purchasePurpose: z.array(z.enum(PURCHASE_PURPOSES)).optional(),
  // Section 6
  decisionMakers: z.array(decisionMakerSchema).optional(),
  keyFactors: z.array(z.enum(KEY_FACTORS)).max(3, 'เลือกได้ไม่เกิน 3 ข้อ').optional(),
  // Section 7
  interestedServices: z.array(z.enum(INTERESTED_SERVICES)).optional(),
  // Section 8
  leadLevel: z.enum(LEAD_LEVELS).optional(),
  customerNeeds: z.string().optional(),
  problemsFound: z.string().optional(),
  businessOpportunities: z.array(z.string()).optional(),
  // Section 9 — at least 1 required
  nextActions: z.array(z.enum(NEXT_ACTIONS)).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
  nextActionOwner: z.string().optional(),
  nextActionDate: z.string().optional(),
  nextActionDetails: z.string().optional(),
})

// Deal
export const createDealSchema = z.object({
  customerId: z.string().min(1),
  vehicleModel: z.string().min(1),
  quantity: z.number().min(1),
  expectedAmount: z.number().optional(),
  stage: z.enum(DEAL_STAGES).default('lead'),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  sourceCallLogId: z.string().optional(),
  sourceVisitLogId: z.string().optional(),
})

export const updateDealSchema = z.object({
  customerId: z.string().optional(),
  vehicleModel: z.string().optional(),
  quantity: z.number().min(1).optional(),
  expectedAmount: z.number().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  salesRepId: z.string().optional(),
  lostReason: z.string().optional(),
  competitorBrand: z.string().optional(),
  discountAmount: z.number().optional(),
})

export const updateDealStageSchema = z.object({
  stage: z.enum(DEAL_STAGES),
  lostReason: z.string().optional(),
  competitorBrand: z.string().optional(),
})

// Team
export const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง').optional().or(z.literal('')),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['manager', 'sales_rep']).default('sales_rep'),
  territory: z.string().optional(),
  salesTarget: z.number().optional(),
})

// Auth
export const loginSchema = z.object({
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})

export const registerSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  inviteCode: z.string().min(1, 'กรุณากรอกรหัสเชิญ'),
})

export const setPasswordSchema = z.object({
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})

// Visit Plan
export const createVisitPlanSchema = z.object({
  customerId: z.string().min(1),
  salesRepId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบ: YYYY-MM'),
  plannedDate: z.string().min(1),
  visitType: z.enum(['first_visit', 'follow_up', 'closing', 'service']).default('follow_up'),
  objective: z.string().optional(),
})

export const updateVisitPlanSchema = z.object({
  status: z.enum(['planned', 'completed', 'missed', 'rescheduled']).optional(),
  plannedDate: z.string().optional(),
  visitType: z.enum(['first_visit', 'follow_up', 'closing', 'service']).optional(),
  objective: z.string().optional(),
})

export const generateVisitPlansSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบ: YYYY-MM'),
})

// Visit Log — update
export const updateVisitLogSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  notes: z.string().optional(),
  nextStep: z.string().optional(),
  customerMood: z.enum(['positive', 'neutral', 'concerned']).optional(),
})

// Call Plan
export const createCallPlanSchema = z.object({
  customerId: z.string().min(1),
  salesRepId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  plannedDate: z.string().min(1),
  callPurpose: z.enum(['check_in', 'offer', 'follow_up', 'reminder']).default('check_in'),
})

export const updateCallPlanSchema = z.object({
  status: z.enum(['planned', 'completed', 'missed']).optional(),
  plannedDate: z.string().optional(),
  callPurpose: z.enum(['check_in', 'offer', 'follow_up', 'reminder']).optional(),
})

export const generateCallPlansSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบ: YYYY-MM'),
})

// Call Log — update (all fields optional except id-based identification)
export const updateCallLogSchema = z.object({
  contactName: z.string().optional(),
  contactPosition: z.string().optional(),
  contactPhone: z.string().optional(),
  contactLineEmail: z.string().optional(),
  callDate: z.string().optional(),
  callTime: z.string().optional(),
  notConvenient: z.boolean().optional(),
  callbackDate: z.string().optional(),
  callbackTime: z.string().optional(),
  durationMinutes: z.number().optional(),
  fleetIsuzuCount: z.number().optional(),
  fleetOtherCount: z.number().optional(),
  fleetPickup: z.number().optional(),
  fleetTruck: z.number().optional(),
  fleetSuv: z.number().optional(),
  usageTypes: z.array(z.enum(USAGE_TYPES)).optional(),
  usageStatusNotes: z.string().optional(),
  hasProblemVehicles: z.boolean().optional(),
  problemCount: z.number().optional(),
  problemDetails: z.string().optional(),
  serviceLocation: z.enum(SERVICE_LOCATIONS).optional(),
  serviceReason: z.string().optional(),
  mainProblems: z.array(z.enum(MAIN_PROBLEMS)).optional(),
  purchaseTimeline: z.enum(PURCHASE_TIMELINES).optional(),
  expectedQuantity: z.number().optional(),
  interestedModels: z.array(z.enum(INTERESTED_MODELS)).optional(),
  purchasePurpose: z.array(z.enum(PURCHASE_PURPOSES)).optional(),
  decisionMakers: z.array(decisionMakerSchema).optional(),
  keyFactors: z.array(z.enum(KEY_FACTORS)).optional(),
  interestedServices: z.array(z.enum(INTERESTED_SERVICES)).optional(),
  leadLevel: z.enum(LEAD_LEVELS).optional(),
  customerNeeds: z.string().optional(),
  problemsFound: z.string().optional(),
  businessOpportunities: z.array(z.string()).optional(),
  nextActions: z.array(z.enum(NEXT_ACTIONS)).optional(),
  nextActionOwner: z.string().optional(),
  nextActionDate: z.string().optional(),
  nextActionDetails: z.string().optional(),
})

// Customer Contact
export const createContactSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1, 'กรุณากรอกชื่อผู้ติดต่อ'),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  lineId: z.string().optional(),
  isDecisionMaker: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
})

export const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  lineId: z.string().optional(),
  isDecisionMaker: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
})

// Target
export const upsertMonthlyTargetSchema = z.object({
  salesRepId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  visitTarget: z.number().min(0),
  callTarget: z.number().min(0),
  dealTarget: z.number().optional(),
})

// Type inference
export type CreateCustomer = z.infer<typeof createCustomerSchema>
export type CreateVisitLog = z.infer<typeof createVisitLogSchema>
export type CreateCallLog = z.infer<typeof createCallLogSchema>
export type CreateDeal = z.infer<typeof createDealSchema>
export type CreateTeamMember = z.infer<typeof createTeamMemberSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type SetPasswordInput = z.infer<typeof setPasswordSchema>
export type CreateVisitPlan = z.infer<typeof createVisitPlanSchema>
export type CreateCallPlan = z.infer<typeof createCallPlanSchema>
export type CreateContact = z.infer<typeof createContactSchema>
export type UpdateContact = z.infer<typeof updateContactSchema>
