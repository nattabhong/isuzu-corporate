import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// --- Team Members ---
export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  phone: text('phone'),
  role: text('role', { enum: ['manager', 'sales_rep'] }).notNull().default('sales_rep'),
  territory: text('territory'),
  avatarUrl: text('avatar_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// --- Customers ---
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  companyType: text('company_type'),
  industry: text('industry'),
  address: text('address'),
  province: text('province'),
  district: text('district'),
  lat: real('lat'),
  lng: real('lng'),
  segment: text('segment', { enum: ['A', 'B', 'C'] }).notNull().default('B'),
  assignedTo: text('assigned_to').references(() => teamMembers.id),
  status: text('status', { enum: ['active', 'inactive', 'prospect'] }).notNull().default('active'),
  fleetContractExpiry: text('fleet_contract_expiry'),
  zone: text('zone'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// --- Customer Contacts ---
export const customerContacts = sqliteTable('customer_contacts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: text('position'),
  phone: text('phone'),
  email: text('email'),
  lineId: text('line_id'),
  isDecisionMaker: integer('is_decision_maker', { mode: 'boolean' }).notNull().default(false),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// --- Visit Plans ---
export const visitPlans = sqliteTable('visit_plans', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  salesRepId: text('sales_rep_id').notNull().references(() => teamMembers.id),
  month: text('month').notNull(), // YYYY-MM
  plannedDate: text('planned_date').notNull(),
  visitType: text('visit_type', { enum: ['first_visit', 'follow_up', 'closing', 'service'] })
    .notNull().default('follow_up'),
  objective: text('objective'),
  status: text('status', { enum: ['planned', 'completed', 'missed', 'rescheduled'] })
    .notNull().default('planned'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// --- Visit Logs ---
export const visitLogs = sqliteTable('visit_logs', {
  id: text('id').primaryKey(),
  visitPlanId: text('visit_plan_id').references(() => visitPlans.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  salesRepId: text('sales_rep_id').notNull().references(() => teamMembers.id),
  visitDate: text('visit_date').notNull(),
  startTime: text('start_time'),
  endTime: text('end_time'),
  gpsLat: real('gps_lat'),
  gpsLng: real('gps_lng'),
  notes: text('notes'),
  nextStep: text('next_step'),
  customerMood: text('customer_mood', { enum: ['positive', 'neutral', 'concerned'] }),
  attachments: text('attachments', { mode: 'json' }).$type<string[]>(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// --- Call Plans ---
export const callPlans = sqliteTable('call_plans', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  salesRepId: text('sales_rep_id').notNull().references(() => teamMembers.id),
  month: text('month').notNull(),
  plannedDate: text('planned_date').notNull(),
  callPurpose: text('call_purpose', { enum: ['check_in', 'offer', 'follow_up', 'reminder'] })
    .notNull().default('check_in'),
  status: text('status', { enum: ['planned', 'completed', 'missed'] }).notNull().default('planned'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// --- Call Logs (10-section form) ---
export const callLogs = sqliteTable('call_logs', {
  id: text('id').primaryKey(),
  callPlanId: text('call_plan_id').references(() => callPlans.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  salesRepId: text('sales_rep_id').notNull().references(() => teamMembers.id),
  // Section 1
  contactName: text('contact_name').notNull(),
  contactPosition: text('contact_position'),
  contactPhone: text('contact_phone'),
  contactLineEmail: text('contact_line_email'),
  callDate: text('call_date').notNull(),
  callTime: text('call_time'),
  notConvenient: integer('not_convenient', { mode: 'boolean' }).notNull().default(false),
  callbackDate: text('callback_date'),
  callbackTime: text('callback_time'),
  durationMinutes: integer('duration_minutes'),
  // Section 3 — Fleet
  fleetIsuzuCount: integer('fleet_isuzu_count'),
  fleetOtherCount: integer('fleet_other_count'),
  fleetPickup: integer('fleet_pickup'),
  fleetTruck: integer('fleet_truck'),
  fleetSuv: integer('fleet_suv'),
  fleetTotal: integer('fleet_total'),
  usageTypes: text('usage_types', { mode: 'json' }).$type<string[]>(),
  // Section 4 — Status
  usageStatusNotes: text('usage_status_notes'),
  hasProblemVehicles: integer('has_problem_vehicles', { mode: 'boolean' }),
  problemCount: integer('problem_count'),
  problemDetails: text('problem_details'),
  serviceLocation: text('service_location'),
  serviceReason: text('service_reason'),
  mainProblems: text('main_problems', { mode: 'json' }).$type<string[]>(),
  // Section 5 — Purchase plan
  purchaseTimeline: text('purchase_timeline'),
  expectedQuantity: integer('expected_quantity'),
  interestedModels: text('interested_models', { mode: 'json' }).$type<string[]>(),
  purchasePurpose: text('purchase_purpose', { mode: 'json' }).$type<string[]>(),
  // Section 6 — Decision
  decisionMakers: text('decision_makers', { mode: 'json' }).$type<{ role: string; namePosition: string }[]>(),
  keyFactors: text('key_factors', { mode: 'json' }).$type<string[]>(),
  // Section 7 — Services
  interestedServices: text('interested_services', { mode: 'json' }).$type<string[]>(),
  // Section 8 — Summary
  leadLevel: text('lead_level'),
  customerNeeds: text('customer_needs'),
  problemsFound: text('problems_found'),
  businessOpportunities: text('business_opportunities', { mode: 'json' }).$type<string[]>(),
  // Section 9 — Next steps
  nextActions: text('next_actions', { mode: 'json' }).$type<string[]>().notNull(),
  nextActionOwner: text('next_action_owner'),
  nextActionDate: text('next_action_date'),
  nextActionDetails: text('next_action_details'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// --- Deals ---
export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  salesRepId: text('sales_rep_id').notNull().references(() => teamMembers.id),
  vehicleModel: text('vehicle_model').notNull(),
  quantity: integer('quantity').notNull().default(1),
  expectedAmount: real('expected_amount'),
  stage: text('stage', { enum: ['lead', 'visit_done', 'quote_sent', 'negotiating', 'won', 'lost'] })
    .notNull().default('lead'),
  expectedCloseDate: text('expected_close_date'),
  wonAmount: real('won_amount'),
  notes: text('notes'),
  lostReason: text('lost_reason'),
  competitorBrand: text('competitor_brand'),
  discountAmount: real('discount_amount'),
  sourceCallLogId: text('source_call_log_id').references(() => callLogs.id),
  sourceVisitLogId: text('source_visit_log_id').references(() => visitLogs.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// --- Monthly Targets ---
export const monthlyTargets = sqliteTable('monthly_targets', {
  id: text('id').primaryKey(),
  salesRepId: text('sales_rep_id').notNull().references(() => teamMembers.id),
  month: text('month').notNull(),
  visitTarget: integer('visit_target').notNull().default(0),
  callTarget: integer('call_target').notNull().default(0),
  dealTarget: integer('deal_target'),
})

// --- Sessions ---
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  teamMemberId: text('team_member_id').notNull().references(() => teamMembers.id),
  token: text('token').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Indexes
export const customersAssignedToIdx = index('idx_customers_assigned_to').on(customers.assignedTo)
export const customerContactsCustomerIdIdx = index('idx_customer_contacts_customer_id').on(customerContacts.customerId)
export const visitPlansCustomerIdIdx = index('idx_visit_plans_customer_id').on(visitPlans.customerId)
export const visitPlansSalesRepIdIdx = index('idx_visit_plans_sales_rep_id').on(visitPlans.salesRepId)
export const visitPlansMonthIdx = index('idx_visit_plans_month').on(visitPlans.month)
export const visitLogsCustomerIdIdx = index('idx_visit_logs_customer_id').on(visitLogs.customerId)
export const visitLogsSalesRepIdIdx = index('idx_visit_logs_sales_rep_id').on(visitLogs.salesRepId)
export const visitLogsVisitDateIdx = index('idx_visit_logs_visit_date').on(visitLogs.visitDate)
export const callPlansCustomerIdIdx = index('idx_call_plans_customer_id').on(callPlans.customerId)
export const callPlansSalesRepIdIdx = index('idx_call_plans_sales_rep_id').on(callPlans.salesRepId)
export const callPlansMonthIdx = index('idx_call_plans_month').on(callPlans.month)
export const callLogsCustomerIdIdx = index('idx_call_logs_customer_id').on(callLogs.customerId)
export const callLogsSalesRepIdIdx = index('idx_call_logs_sales_rep_id').on(callLogs.salesRepId)
export const callLogsCallDateIdx = index('idx_call_logs_call_date').on(callLogs.callDate)
export const callLogsLeadLevelIdx = index('idx_call_logs_lead_level').on(callLogs.leadLevel)
export const dealsCustomerIdIdx = index('idx_deals_customer_id').on(deals.customerId)
export const dealsSalesRepIdIdx = index('idx_deals_sales_rep_id').on(deals.salesRepId)
export const dealsStageIdx = index('idx_deals_stage').on(deals.stage)
export const monthlyTargetsSalesRepIdIdx = index('idx_monthly_targets_sales_rep_id').on(monthlyTargets.salesRepId)
export const monthlyTargetsUnique = uniqueIndex('idx_monthly_targets_rep_month')
  .on(monthlyTargets.salesRepId, monthlyTargets.month)
export const sessionsTeamMemberIdIdx = index('idx_sessions_team_member_id').on(sessions.teamMemberId)
