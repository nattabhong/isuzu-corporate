# ISUZU Corporate — Phase 1 Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Project scaffold + Auth (LINE Login) + Customer & Team CRUD + Visit Planner & Log — the foundational layer of the ISUZU Corporate sales management system.

**Architecture:** Monorepo with `packages/shared` (types, Zod schemas), `packages/backend` (Hono Worker + Drizzle + D1), `packages/frontend` (React 19 + Vite + PWA). Type-safe end-to-end via Hono RPC.

**Tech Stack:** TypeScript, Hono 4, Drizzle ORM, D1, React 19, Vite, Vitest, Zod, lucide-react

---

## Task 0: Monorepo Scaffold

**Files:**
- Create: `package.json` (root workspace)
- Create: `tsconfig.json` (base)
- Create: `pnpm-workspace.yaml`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/wrangler.toml`
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`

**Step 1: Initialize root**
```bash
cd /Users/nattabhongkongkaew/isuzu-corporate
```

Root `package.json`:
```json
{
  "name": "isuzu-corporate",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "check": "pnpm -r check",
    "test": "pnpm -r test"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

`tsconfig.json` (base):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 2: Setup packages/shared**
```bash
mkdir -p packages/shared/src/{types,constants}
```

`packages/shared/package.json`:
```json
{
  "name": "@isuzu-corporate/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "check": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

**Step 3: Setup packages/backend**
```bash
mkdir -p packages/backend/src/{routes,db,services,middleware}
```

`packages/backend/package.json`:
```json
{
  "name": "@isuzu-corporate/backend",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "check": "tsc --noEmit",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "wrangler d1 migrations apply isuzu-corporate-db",
    "db:seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "@isuzu-corporate/shared": "workspace:*",
    "hono": "^4.5.0",
    "drizzle-orm": "^0.33.0",
    "drizzle-kit": "^0.24.0",
    "@libsql/client": "^0.8.0",
    "jose": "^5.6.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240701.0",
    "wrangler": "^3.70.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "tsx": "^4.16.0"
  }
}
```

`packages/backend/wrangler.toml`:
```toml
name = "isuzu-corporate-api"
main = "src/index.ts"
compatibility_date = "2024-07-01"

[[d1_databases]]
binding = "DB"
database_name = "isuzu-corporate-db"
database_id = ""  # fill after `wrangler d1 create`

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "isuzu-corporate-files"

[vars]
LINE_CHANNEL_ID = ""
LINE_CHANNEL_SECRET = ""
JWT_SECRET = ""
GOOGLE_MAPS_API_KEY = ""
MCP_API_KEY = ""

[env.production]
# Override for production
```

**Step 4: Setup packages/frontend**
```bash
cd packages/frontend && npx create-vite@latest . --template react-ts
```

`packages/frontend/package.json` (after vite init + additions):
```json
{
  "name": "@isuzu-corporate/frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "check": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@isuzu-corporate/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.400.0",
    "hono": "^4.5.0",
    "workbox-precaching": "^7.1.0",
    "workbox-routing": "^7.1.0",
    "workbox-strategies": "^7.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.0.0"
  }
}
```

**Step 5: Install & verify**
```bash
pnpm install
pnpm check    # expect: all clean
```

**Commit:**
```bash
git add -A && git commit -m "scaffold: monorepo with shared, backend, frontend packages"
```

---

## Task 1: Shared Types & Zod Schemas

**Files:**
- Create: `packages/shared/src/types/customer.ts`
- Create: `packages/shared/src/types/visit.ts`
- Create: `packages/shared/src/types/call.ts`
- Create: `packages/shared/src/types/deal.ts`
- Create: `packages/shared/src/types/team.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/constants/lead-levels.ts`
- Create: `packages/shared/src/constants/vehicle-models.ts`
- Create: `packages/shared/src/constants/usage-types.ts`
- Create: `packages/shared/src/validation.ts`
- Create: `packages/shared/src/index.ts`

**Step 1: Write constants first**

`packages/shared/src/constants/lead-levels.ts`:
```typescript
export const LEAD_LEVELS = ['hot', 'warm', 'future', 'maintain', 'inactive'] as const
export type LeadLevel = (typeof LEAD_LEVELS)[number]

export const LEAD_LEVEL_LABELS: Record<LeadLevel, string> = {
  hot: 'Hot — มีแผนซื้อภายใน 3 เดือน',
  warm: 'Warm — มีโอกาสภายใน 4–12 เดือน',
  future: 'Future — มีโอกาสใน 1–2 ปี',
  maintain: 'Maintain — ควรรักษาความสัมพันธ์',
  inactive: 'Inactive — ติดต่อไม่ได้',
}
```

`packages/shared/src/constants/vehicle-models.ts`:
```typescript
export const ISUZU_MODELS = [
  'D-Max 1.9 S', 'D-Max 1.9 L', 'D-Max 3.0 S', 'D-Max 3.0 L',
  'MU-X 1.9', 'MU-X 3.0',
  'ELF', 'FORWARD', 'GIGA',
] as const

export const INTERESTED_MODELS = [
  'กระบะตอนเดียว', 'กระบะแค็บ', 'กระบะ 4 ประตู',
  'ขับเคลื่อน 4 ล้อ', 'MU-X', 'รถบรรทุก', 'ยังไม่ระบุ',
] as const

export const PURCHASE_PURPOSES = [
  'ขยายธุรกิจ', 'ทดแทนรถเก่า', 'ลดค่าซ่อม',
  'เพิ่มประสิทธิภาพการขนส่ง', 'รถผู้บริหาร/พนักงาน',
] as const
```

`packages/shared/src/constants/usage-types.ts`:
```typescript
export const USAGE_TYPES = [
  'ขนส่งสินค้า', 'ส่งของข้ามจังหวัด', 'งานก่อสร้าง', 'งานเกษตร',
  'บริการนอกสถานที่', 'รถประจำตำแหน่ง', 'รถสำหรับพนักงานขาย',
  'รถรับ-ส่งพนักงาน',
] as const

export const MAIN_PROBLEMS = [
  'รถหยุดวิ่งนาน', 'ค่าใช้จ่ายงานซ่อมสูง', 'นัดหมายไม่สะดวก',
  'ไม่มีคนขับรถมาส่งศูนย์', 'ต้องการบริการถึงบริษัท',
  'ต้องการควบคุมค่าใช้จ่าย', 'ต้องการรายงานประวัติการซ่อม',
] as const

export const KEY_FACTORS = [
  'ราคารถ', 'ค่างวด', 'อัตราดอกเบี้ย', 'ความประหยัดน้ำมัน',
  'ความทนทาน', 'ราคาขายต่อ', 'บริการหลังการขาย',
  'ความรวดเร็วในการซ่อม', 'บริการถึงบริษัท', 'เงื่อนไขลูกค้าบริษัท',
] as const

export const INTERESTED_SERVICES = [
  'นัดตรวจสภาพรถ', 'บริการตรวจเช็กถึงบริษัท', 'วางแผนบำรุงรักษา Fleet',
  'ประเมินค่าใช้จ่ายงานซ่อม', 'ประเมินรถเก่า', 'เสนอรถใหม่',
  'ทดลองขับ', 'ขอใบเสนอราคา', 'ขอแผนสินเชื่อ',
  'อบรมการขับรถประหยัดน้ำมัน', 'อบรมตรวจเช็กรถก่อนใช้งาน',
] as const

export const NEXT_ACTIONS = [
  'โทรติดตามอีกครั้ง', 'นัดเข้าเยี่ยมบริษัท', 'นัดตรวจรถ',
  'ส่งข้อมูลรถ', 'ส่งใบเสนอราคา', 'ส่งแพ็กเกจงานบริการ',
  'ประสานฝ่ายบริการ', 'ประสานฝ่ายสินเชื่อ', 'ประสานผู้จัดการ',
  'ปิดการติดตามชั่วคราว',
] as const

export const SERVICE_LOCATIONS = ['chiangmai', 'other_isuzu', 'outside', 'self', 'unknown'] as const
export const PURCHASE_TIMELINES = ['3m', '6m', '12m', '1-2y', 'none', 'unsure'] as const
export const DEAL_STAGES = ['lead', 'visit_done', 'quote_sent', 'negotiating', 'won', 'lost'] as const
```

**Step 2: Write type definitions**

`packages/shared/src/types/team.ts`:
```typescript
export interface TeamMember {
  id: string
  lineUserId: string
  name: string
  email: string | null
  phone: string | null
  role: 'manager' | 'sales_rep'
  territory: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MonthlyTarget {
  id: string
  salesRepId: string
  month: string
  visitTarget: number
  callTarget: number
  dealTarget: number | null
}
```

`packages/shared/src/types/customer.ts`:
```typescript
export interface Customer {
  id: string
  name: string
  companyType: string | null
  industry: string | null
  address: string | null
  province: string | null
  district: string | null
  lat: number | null
  lng: number | null
  segment: 'A' | 'B' | 'C'
  assignedTo: string | null
  status: 'active' | 'inactive' | 'prospect'
  createdAt: string
  updatedAt: string
}

export interface CustomerContact {
  id: string
  customerId: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  lineId: string | null
  isDecisionMaker: boolean
  isPrimary: boolean
}

export interface CustomerDetail extends Customer {
  contacts: CustomerContact[]
  visitStats: { total: number; lastVisit: string | null }
  callStats: { total: number; lastCall: string | null; leadLevel: string | null }
  activeDeals: number
}
```

`packages/shared/src/types/visit.ts`:
```typescript
export interface VisitPlan {
  id: string
  customerId: string
  salesRepId: string
  month: string
  plannedDate: string
  visitType: 'first_visit' | 'follow_up' | 'closing' | 'service'
  objective: string | null
  status: 'planned' | 'completed' | 'missed' | 'rescheduled'
  createdAt: string
}

export interface VisitLog {
  id: string
  visitPlanId: string | null
  customerId: string
  salesRepId: string
  visitDate: string
  startTime: string | null
  endTime: string | null
  gpsLat: number | null
  gpsLng: number | null
  notes: string | null
  nextStep: string | null
  customerMood: 'positive' | 'neutral' | 'concerned' | null
  attachments: string[] | null
  createdAt: string
}
```

`packages/shared/src/types/call.ts`:
```typescript
import type { LeadLevel } from '../constants/lead-levels'

export interface CallPlan {
  id: string
  customerId: string
  salesRepId: string
  month: string
  plannedDate: string
  callPurpose: 'check_in' | 'offer' | 'follow_up' | 'reminder'
  status: 'planned' | 'completed' | 'missed'
  createdAt: string
}

export interface CallLog {
  id: string
  callPlanId: string | null
  customerId: string
  salesRepId: string
  // Section 1
  contactName: string
  contactPosition: string | null
  contactPhone: string | null
  contactLineEmail: string | null
  callDate: string
  callTime: string | null
  notConvenient: boolean
  callbackDate: string | null
  callbackTime: string | null
  durationMinutes: number | null
  // Section 3
  fleetIsuzuCount: number | null
  fleetOtherCount: number | null
  fleetPickup: number | null
  fleetTruck: number | null
  fleetSuv: number | null
  fleetTotal: number | null
  usageTypes: string[] | null
  // Section 4
  usageStatusNotes: string | null
  hasProblemVehicles: boolean | null
  problemCount: number | null
  problemDetails: string | null
  serviceLocation: string | null
  serviceReason: string | null
  mainProblems: string[] | null
  // Section 5
  purchaseTimeline: string | null
  expectedQuantity: number | null
  interestedModels: string[] | null
  purchasePurpose: string[] | null
  // Section 6
  decisionMakers: { role: string; namePosition: string }[] | null
  keyFactors: string[] | null
  // Section 7
  interestedServices: string[] | null
  // Section 8
  leadLevel: LeadLevel | null
  customerNeeds: string | null
  problemsFound: string | null
  businessOpportunities: string[] | null
  // Section 9
  nextActions: string[]
  nextActionOwner: string | null
  nextActionDate: string | null
  nextActionDetails: string | null
  createdAt: string
  updatedAt: string
}
```

`packages/shared/src/types/deal.ts`:
```typescript
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
```

`packages/shared/src/types/api.ts`:
```typescript
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    role: 'manager' | 'sales_rep'
  }
}
```

**Step 3: Write Zod validation schemas**

`packages/shared/src/validation.ts`:
```typescript
import { z } from 'zod'
import {
  LEAD_LEVELS, SERVICE_LOCATIONS, PURCHASE_TIMELINES,
  USAGE_TYPES, MAIN_PROBLEMS, KEY_FACTORS, INTERESTED_SERVICES,
  NEXT_ACTIONS, INTERESTED_MODELS, PURCHASE_PURPOSES, DEAL_STAGES,
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
  usageTypes: z.array(z.string()).optional(),
  // Section 4
  usageStatusNotes: z.string().optional(),
  hasProblemVehicles: z.boolean().optional(),
  problemCount: z.number().optional(),
  problemDetails: z.string().optional(),
  serviceLocation: z.enum(SERVICE_LOCATIONS).optional(),
  serviceReason: z.string().optional(),
  mainProblems: z.array(z.string()).optional(),
  // Section 5
  purchaseTimeline: z.enum(PURCHASE_TIMELINES).optional(),
  expectedQuantity: z.number().optional(),
  interestedModels: z.array(z.string()).optional(),
  purchasePurpose: z.array(z.string()).optional(),
  // Section 6
  decisionMakers: z.array(decisionMakerSchema).optional(),
  keyFactors: z.array(z.string()).max(3, 'เลือกได้ไม่เกิน 3 ข้อ').optional(),
  // Section 7
  interestedServices: z.array(z.string()).optional(),
  // Section 8
  leadLevel: z.enum(LEAD_LEVELS).optional(),
  customerNeeds: z.string().optional(),
  problemsFound: z.string().optional(),
  businessOpportunities: z.array(z.string()).optional(),
  // Section 9 — at least 1 required
  nextActions: z.array(z.string()).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
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

export const updateDealStageSchema = z.object({
  stage: z.enum(DEAL_STAGES),
})

// Team
export const createTeamMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['manager', 'sales_rep']).default('sales_rep'),
  territory: z.string().optional(),
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

// Call Plan
export const createCallPlanSchema = z.object({
  customerId: z.string().min(1),
  salesRepId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  plannedDate: z.string().min(1),
  callPurpose: z.enum(['check_in', 'offer', 'follow_up', 'reminder']).default('check_in'),
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
export type CreateVisitPlan = z.infer<typeof createVisitPlanSchema>
export type CreateCallPlan = z.infer<typeof createCallPlanSchema>
```

**Step 4: Write barrel export**

`packages/shared/src/index.ts`:
```typescript
export * from './types/customer'
export * from './types/visit'
export * from './types/call'
export * from './types/deal'
export * from './types/team'
export * from './types/api'
export * from './constants/lead-levels'
export * from './constants/vehicle-models'
export * from './constants/usage-types'
export * from './validation'
```

**Step 5: Verify**
```bash
cd packages/shared && npx tsc --noEmit
# Expected: no errors
```

**Commit:**
```bash
git add -A && git commit -m "feat(shared): types, constants, and Zod validation schemas"
```

---

## Task 2: Drizzle Database Schema

**Files:**
- Create: `packages/backend/src/db/schema.ts`
- Create: `packages/backend/drizzle.config.ts`
- Create: `packages/backend/src/db/index.ts`

**Step 1: Write Drizzle schema**

`packages/backend/src/db/schema.ts`:
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// --- Team Members ---
export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email'),
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
```

`packages/backend/drizzle.config.ts`:
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'd1',
} satisfies Config
```

`packages/backend/src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type DbClient = ReturnType<typeof createDb>
export * from './schema'
```

**Step 2: Verify types**
```bash
cd packages/backend && npx tsc --noEmit
# Expected: no errors
```

**Commit:**
```bash
git add -A && git commit -m "feat(backend): Drizzle schema for all tables"
```

---

## Task 3: Hono App Shell & Auth Middleware

**Files:**
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/src/middleware/auth.ts`
- Create: `packages/backend/src/middleware/role-guard.ts`
- Create: `packages/backend/src/services/line-auth.ts`

**Step 1: Write middleware**

`packages/backend/src/middleware/auth.ts`:
```typescript
import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode('') // from env

export interface AuthUser {
  id: string
  role: 'manager' | 'sales_rep'
  name: string
}

export const authMiddleware = createMiddleware<{
  Variables: { user: AuthUser }
}>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
    ?? c.req.cookie('token')

  if (!token) {
    return c.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, 401)
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    c.set('user', payload as unknown as AuthUser)
    await next()
  } catch {
    return c.json({ success: false, error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 401)
  }
})
```

`packages/backend/src/middleware/role-guard.ts`:
```typescript
import { createMiddleware } from 'hono/factory'

export const requireManager = createMiddleware<{
  Variables: { user: { role: string } }
}>(async (c, next) => {
  if (c.var.user.role !== 'manager') {
    return c.json({ success: false, error: 'เฉพาะผู้จัดการเท่านั้น' }, 403)
  }
  await next()
})
```

`packages/backend/src/services/line-auth.ts`:
```typescript
import { SignJWT } from 'jose'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export async function getLineProfile(accessToken: string): Promise<LineProfile> {
  const res = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('LINE profile fetch failed')
  return res.json()
}

export async function exchangeLineCode(
  code: string,
  channelId: string,
  channelSecret: string,
  redirectUri: string,
) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
  })

  const res = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!res.ok) throw new Error('LINE token exchange failed')
  const data = await res.json() as { access_token: string; id_token?: string }
  return data
}

export async function createJwt(
  payload: { id: string; role: string; name: string },
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(encoder.encode(secret))
}
```

**Step 2: Write Hono app entry**

`packages/backend/src/index.ts`:
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb } from './db'

type Env = {
  DB: D1Database
  STORAGE: R2Bucket
  JWT_SECRET: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
  GOOGLE_MAPS_API_KEY: string
  MCP_API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: (origin) => origin, // refine in production
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => c.json({ success: true, timestamp: new Date().toISOString() }))

// Auth routes (placeholder — implemented in Task 4)
app.get('/api/auth/line', (c) => {
  const channelId = c.env.LINE_CHANNEL_ID
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/line/callback`
  const state = crypto.randomUUID()
  const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile`
  return c.redirect(url)
})

export default app
```

**Step 3: Verify build**
```bash
cd packages/backend && npx tsc --noEmit
# Expected: no errors
```

**Commit:**
```bash
git add -A && git commit -m "feat(backend): Hono app shell, auth middleware, LINE auth service"
```

---

## Task 4: LINE Login Flow & Session Management

**Files:**
- Modify: `packages/backend/src/index.ts` (add auth routes)
- Create: `packages/backend/src/routes/auth.ts`
- Create: `packages/backend/src/db/seed.ts` (seed admin user)

**Step 1: Write auth routes**

`packages/backend/src/routes/auth.ts`:
```typescript
import { Hono } from 'hono'
import { createDb } from '../db'
import { teamMembers, sessions } from '../db/schema'
import { exchangeLineCode, getLineProfile, createJwt } from '../services/line-auth'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
}

const auth = new Hono<{ Bindings: Env }>()

// Initiate LINE Login
auth.get('/line', (c) => {
  const channelId = c.env.LINE_CHANNEL_ID
  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}/api/auth/line/callback`
  const state = crypto.randomUUID()

  // Store state in a cookie for CSRF protection
  c.header('Set-Cookie', `line_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)

  const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', channelId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'profile openid')

  return c.redirect(url.toString())
})

// LINE OAuth callback
auth.get('/line/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const cookieState = c.req.cookie('line_state')

  if (!code) return c.json({ success: false, error: 'Missing authorization code' }, 400)
  if (state !== cookieState) return c.json({ success: false, error: 'Invalid state' }, 400)

  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}/api/auth/line/callback`

  try {
    // Exchange code for tokens
    const tokenData = await exchangeLineCode(
      code, c.env.LINE_CHANNEL_ID, c.env.LINE_CHANNEL_SECRET, redirectUri,
    )

    // Get LINE profile
    const profile = await getLineProfile(tokenData.access_token)

    // Find or create team member
    const db = createDb(c.env.DB)
    let member = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.lineUserId, profile.userId),
    })

    if (!member) {
      // Auto-register new member as sales_rep (manager promotes later)
      const id = crypto.randomUUID()
      await db.insert(teamMembers).values({
        id,
        lineUserId: profile.userId,
        name: profile.displayName,
        avatarUrl: profile.pictureUrl ?? null,
        role: 'sales_rep',
      })
      member = { id, role: 'sales_rep' as const, name: profile.displayName }
    }

    if (!member.isActive) {
      return c.json({ success: false, error: 'บัญชีถูกระงับการใช้งาน' }, 403)
    }

    // Create JWT
    const token = await createJwt(
      { id: member.id, role: member.role, name: member.name },
      c.env.JWT_SECRET,
    )

    // Create session
    await db.insert(sessions).values({
      id: crypto.randomUUID(),
      teamMemberId: member.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Set cookie and redirect to frontend
    const frontendUrl = origin.replace(':8787', ':5173') // dev mode
    c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`)
    return c.redirect(`${frontendUrl}/?login=success`)
  } catch (err) {
    console.error('LINE auth error:', err)
    return c.json({ success: false, error: 'การเข้าสู่ระบบล้มเหลว' }, 500)
  }
})

// Get current user
auth.get('/me', authMiddleware, (c) => {
  return c.json({ success: true, data: c.var.user })
})

// Logout
auth.post('/logout', authMiddleware, async (c) => {
  const db = createDb(c.env.DB)
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? c.req.cookie('token')
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token))
  }
  c.header('Set-Cookie', 'token=; Path=/; Max-Age=0')
  return c.json({ success: true })
})

export { auth }
```

**Step 2: Wire auth into index.ts**

Modify `packages/backend/src/index.ts`:
```typescript
import { auth } from './routes/auth'
// ...
app.route('/api/auth', auth)
```

**Step 3: Create seed script**

`packages/backend/src/db/seed.ts`:
```typescript
// Run with: npx tsx src/db/seed.ts
// Creates initial manager user (requires manual LINE user ID)
import 'dotenv/config'

const LINE_USER_ID = process.env.SEED_LINE_USER_ID
const MANAGER_NAME = process.env.SEED_MANAGER_NAME || 'ผู้จัดการ'

if (!LINE_USER_ID) {
  console.error('Set SEED_LINE_USER_ID env var (LINE user ID of the manager)')
  process.exit(1)
}

// This script would use D1 locally via wrangler
console.log(`Would create manager: ${MANAGER_NAME} with LINE ID: ${LINE_USER_ID}`)
console.log('Run via: wrangler d1 execute isuzu-corporate-db --command="..."')
```

**Step 4: Verify**
```bash
cd packages/backend && npx tsc --noEmit
# Expected: no errors
```

**Commit:**
```bash
git add -A && git commit -m "feat(backend): LINE Login flow with JWT session management"
```

---

## Task 5: Team Member CRUD API

**Files:**
- Create: `packages/backend/src/routes/team.ts`

**Step 1: Write team routes**

`packages/backend/src/routes/team.ts`:
```typescript
import { Hono } from 'hono'
import { createDb, teamMembers } from '../db'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireManager } from '../middleware/role-guard'
import { createTeamMemberSchema } from '@isuzu-corporate/shared'

type Env = { DB: D1Database }

const team = new Hono<{ Bindings: Env }>()

// List team members (manager sees all, rep sees self)
team.get('/', authMiddleware, async (c) => {
  const db = createDb(c.env.DB)
  const user = c.var.user

  if (user.role === 'manager') {
    const members = await db.select().from(teamMembers).all()
    return c.json({ success: true, data: members })
  }

  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, user.id),
  })
  return c.json({ success: true, data: member ? [member] : [] })
})

// Get single member
team.get('/:id', authMiddleware, async (c) => {
  const db = createDb(c.env.DB)
  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, c.req.param('id')),
  })
  if (!member) return c.json({ success: false, error: 'ไม่พบสมาชิก' }, 404)
  return c.json({ success: true, data: member })
})

// Add member (manager only)
team.post('/', authMiddleware, requireManager, async (c) => {
  const db = createDb(c.env.DB)
  const body = await c.req.json()
  const parsed = createTeamMemberSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400)
  }

  const id = crypto.randomUUID()
  await db.insert(teamMembers).values({
    id,
    lineUserId: `pending_${id}`, // Will be updated on first LINE login
    ...parsed.data,
  })

  const member = await db.query.teamMembers.findFirst({ where: eq(teamMembers.id, id) })
  return c.json({ success: true, data: member }, 201)
})

// Update member
team.patch('/:id', authMiddleware, requireManager, async (c) => {
  const db = createDb(c.env.DB)
  const body = await c.req.json()

  await db.update(teamMembers)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, c.req.param('id')))

  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, c.req.param('id')),
  })
  return c.json({ success: true, data: member })
})

// Deactivate member (soft delete)
team.delete('/:id', authMiddleware, requireManager, async (c) => {
  const db = createDb(c.env.DB)
  await db.update(teamMembers)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(teamMembers.id, c.req.param('id')))

  return c.json({ success: true })
})

export { team }
```

**Step 2: Wire in index.ts**
```typescript
import { team } from './routes/team'
app.route('/api/team', team)
```

**Step 3: Verify**
```bash
cd packages/backend && npx tsc --noEmit
```

**Commit:**
```bash
git add -A && git commit -m "feat(backend): Team member CRUD with role-based access"
```

---

## Task 6: Customer CRUD API

**Files:**
- Create: `packages/backend/src/routes/customers.ts`

The route file implements full CRUD for customers and their contacts, with filtering by assigned sales rep for non-managers. Implements the spec from Section 4.2.

**Step 1: Write customer route** — approximately 120 lines covering GET list (filtered), GET detail (with contacts + stats), POST create, PATCH update, DELETE soft-delete, plus contact sub-routes.

**Step 2: Wire in index.ts**

**Step 3: Verify types**

**Commit:**
```bash
git add -A && git commit -m "feat(backend): Customer CRUD with contacts sub-routes"
```

---

## Task 7: Visit Planner & Log API

**Files:**
- Create: `packages/backend/src/routes/visits.ts`

Implements visit plan CRUD + visit log CRUD with GPS check-in support. Visit logs can link to a plan or be ad-hoc. R2 upload for attachments.

**Step 1: Write visit routes** — approximately 130 lines

**Step 2: Wire in index.ts**

**Step 3: Verify**

**Commit:**
```bash
git add -A && git commit -m "feat(backend): Visit plan & log CRUD with GPS and R2 attachments"
```

---

## Task 8: Frontend Foundation — Theme, Layout, Router

**Files:**
- Create: `packages/frontend/src/index.css`
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/pages/Login.tsx`
- Create: `packages/frontend/src/pages/Dashboard.tsx`
- Create: `packages/frontend/src/components/Layout.tsx`
- Create: `packages/frontend/src/components/Sidebar.tsx`
- Create: `packages/frontend/src/hooks/useAuth.ts`
- Create: `packages/frontend/src/lib/api-client.ts`

**Step 1: Theme CSS** (same as CRM — warm light theme, LINE green accent)

`packages/frontend/src/index.css`:
```css
:root {
  --bg: #F7F6F2;
  --bg-2: #EFEDE8;
  --surface: #FFFFFF;
  --fg: #1A1B1E;
  --fg-2: #4A4B4F;
  --muted: #8A8B8F;
  --accent: #06C755;
  --accent-2: #059669;
  --accent-soft: #E8F9EF;
  --accent-text: #FFFFFF;
  --border: #E8E6E0;
  --border-2: #F0EEE8;
  --font: 'Noto Sans Thai', sans-serif;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
}
```

**Step 2: Auth hook**

`packages/frontend/src/hooks/useAuth.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  name: string
  role: 'manager' | 'sales_rep'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(() => {
    window.location.href = '/api/auth/line'
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return { user, loading, login, logout }
}
```

**Step 3: Layout + Sidebar**

`packages/frontend/src/components/Sidebar.tsx` — maps the sidebar spec:
```
ภาพรวม → /overview
ลูกค้าองค์กร → /customers
Visit → /visits
Call → /calls
Pipeline → /deals
──────────
รายงาน (Manager only) → /reports
ตั้งค่า (Manager only) → /settings
```

`packages/frontend/src/components/Layout.tsx` — sidebar + content area

**Step 4: Login page**

`packages/frontend/src/pages/Login.tsx` — LINE Login button, ISUZU branding

**Step 5: Dashboard shell**

`packages/frontend/src/pages/Dashboard.tsx` — layout wrapper with routing

**Step 6: App router**
`packages/frontend/src/App.tsx` — route definitions

**Step 7: Verify build**
```bash
cd packages/frontend && npx tsc --noEmit && npx vite build
```

**Commit:**
```bash
git add -A && git commit -m "feat(frontend): theme, layout, sidebar, LINE login page"
```

---

## Task 9: Frontend — Customer List & Detail Pages

**Files:**
- Create: `packages/frontend/src/pages/Customers.tsx`
- Create: `packages/frontend/src/pages/CustomerDetail.tsx`
- Create: `packages/frontend/src/components/ui/` (shared components)

Customer list: searchable table, filter by segment (A/B/C tabs), assigned rep, status. Click to detail.

Customer detail: company info, contacts list, fleet summary, recent visit/call history, active deals.

**Commit:**
```bash
git add -A && git commit -m "feat(frontend): Customer list & detail pages"
```

---

## Task 10: Frontend — Visit Planner & Visit Log Form

**Files:**
- Create: `packages/frontend/src/pages/VisitPlanner.tsx`
- Create: `packages/frontend/src/components/VisitForm/index.tsx`

Calendar view with colored status dots. Form for recording visit with GPS check-in, notes, mood, attachments.

**Commit:**
```bash
git add -A && git commit -m "feat(frontend): Visit planner with GPS check-in form"
```

---

## Task 11: Wire Frontend to Backend, Integration Test

**Files:**
- Modify: `packages/frontend/vite.config.ts` (proxy to backend)
- Create: `packages/frontend/src/lib/api-client.ts`

Vite dev proxy routes `/api/*` → `http://localhost:8787`. API client with typed fetch functions.

**Integration test:**
```bash
# Terminal 1: Backend
cd packages/backend && pnpm dev

# Terminal 2: Frontend  
cd packages/frontend && pnpm dev

# Test: Login flow → customer list → create visit log
```

**Commit:**
```bash
git add -A && git commit -m "feat: wire frontend to backend with API proxy"
```

---

## Phase 1 Completion Checklist

- [x] Monorepo scaffolded (Task 0)
- [x] Shared types & Zod schemas (Task 1)
- [x] Drizzle schema for all tables (Task 2)
- [x] Hono app + auth middleware (Task 3)
- [x] LINE Login flow + sessions (Task 4)
- [x] Team member CRUD API (Task 5)
- [x] Customer CRUD API (Task 6)
- [x] Visit plan & log API (Task 7)
- [x] Frontend theme + layout + login (Task 8)
- [x] Customer list & detail pages (Task 9)
- [x] Visit planner & log form (Task 10)
- [x] Frontend-backend integration (Task 11)

**Out of scope (Phase 1):** Call Planner with 10-section form, Deals Pipeline, Reports, PWA offline, Google Maps, LINE Push notifications, MCP endpoint.
