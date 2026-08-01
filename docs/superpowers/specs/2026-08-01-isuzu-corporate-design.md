# ISUZU Corporate Call & Visit — System Design Spec

**Date:** 2026-08-01
**Status:** Approved — Approach B
**Author:** Hermes Agent + Nattabhong

---

## 1. Overview

**Purpose:** Web application for ISUZU dealership corporate sales teams to manage fleet customers, track monthly visits and phone calls, manage vehicle sales pipeline, and generate performance reports.

**Target Users:**
- **Sales Manager** — Oversees team, assigns customers, views reports
- **Sales Representative** — Manages own customer portfolio, records visits/calls, manages deals

**Domain:** `isuzu-corporate.it-addict.com` (TBD — custom domain or subdomain)

---

## 2. Architecture Decision

**Approach B: Hono RPC + Drizzle ORM — Type-Safe Monorepo**

```
packages/shared/     → Types, validation schemas (Zod), constants
packages/backend/    → Hono Worker on Cloudflare Workers
packages/frontend/   → React 19 SPA + PWA on Cloudflare Pages
```

**Key Decisions:**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Cloudflare Workers | Same infra as it-addict CRM; D1 for SQL |
| API Framework | Hono | RPC mode for type-safe client generation |
| ORM | Drizzle | Type-safe, lightweight, good D1 support |
| Auth | LINE Login | Same as existing CRM; team uses LINE |
| Frontend | React 19 + Vite | PWA with Workbox for offline support |
| CSS | CSS Variables + index.css | Same theme as CRM: `#F7F6F2` bg, `#06C755` accent |
| Mobile | PWA (installable, offline, GPS) | No native app needed |

---

## 3. Data Model (Drizzle Schema)

### 3.1 Teams & Users

```typescript
// team_members
{
  id:            string (UUID)
  line_user_id:  string       // from LINE Login
  name:          string
  email:         string?
  phone:         string?
  role:          'manager' | 'sales_rep'
  territory:     string?      // e.g. "เชียงใหม่", "ลำพูน"
  avatar_url:    string?
  is_active:     boolean
  created_at:    datetime
  updated_at:    datetime
}
```

### 3.2 Customers

```typescript
// customers
{
  id:              string (UUID)
  name:            string        // Company name
  company_type:    string?       // e.g. "ขนส่ง", "ก่อสร้าง", "เกษตร"
  industry:        string?
  address:         string?
  province:        string?
  district:        string?
  lat:             number?       // from Google Maps Geocoding
  lng:             number?
  segment:         'A' | 'B' | 'C'  // Potential tier
  assigned_to:     string?       // → team_members.id
  status:          'active' | 'inactive' | 'prospect'
  created_at:      datetime
  updated_at:      datetime
}

// customer_contacts
{
  id:                string (UUID)
  customer_id:       string → customers.id
  name:              string
  position:          string?
  phone:             string?
  email:             string?
  line_id:           string?
  is_decision_maker: boolean (default: false)
  is_primary:        boolean (default: false)
  created_at:        datetime
}
```

### 3.3 Visit Plans & Logs

```typescript
// visit_plans
{
  id:            string (UUID)
  customer_id:   string → customers.id
  sales_rep_id:  string → team_members.id
  month:         string      // "YYYY-MM"
  planned_date:  date
  visit_type:    'first_visit' | 'follow_up' | 'closing' | 'service'
  objective:     string?
  status:        'planned' | 'completed' | 'missed' | 'rescheduled'
  created_at:    datetime
}

// visit_logs
{
  id:              string (UUID)
  visit_plan_id:   string? → visit_plans.id (nullable — ad-hoc visits)
  customer_id:     string → customers.id
  sales_rep_id:    string → team_members.id
  visit_date:      date
  start_time:      string?     // "HH:mm"
  end_time:        string?
  gps_lat:         number?     // GPS check-in
  gps_lng:         number?
  notes:           string?
  next_step:       string?
  customer_mood:   'positive' | 'neutral' | 'concerned'?
  attachments:     string[]?   // R2 URLs
  created_at:      datetime
}
```

### 3.4 Call Plans & Logs (10-Section Form)

This maps directly to the ศาลาเชียงใหม่ call script form.

```typescript
// call_plans
{
  id:            string (UUID)
  customer_id:   string → customers.id
  sales_rep_id:  string → team_members.id
  month:         string      // "YYYY-MM"
  planned_date:  date
  call_purpose:  'check_in' | 'offer' | 'follow_up' | 'reminder'
  status:        'planned' | 'completed' | 'missed'
  created_at:    datetime
}

// call_logs — Core table mapping the 10-section form
{
  // [1] Customer Info
  id:                  string (UUID)
  call_plan_id:        string? → call_plans.id
  customer_id:         string → customers.id
  sales_rep_id:        string → team_members.id
  contact_name:        string
  contact_position:    string?
  contact_phone:       string?
  contact_line_email:  string?
  call_date:           date
  call_time:           string?       // "HH:mm"
  not_convenient:      boolean (default: false)
  callback_date:       date?
  callback_time:       string?
  duration_minutes:    number?

  // [3] Vehicle Fleet Update
  fleet_isuzu_count:   number?
  fleet_other_count:   number?
  fleet_pickup:        number?
  fleet_truck:         number?
  fleet_suv:           number?
  fleet_total:         number?
  usage_types:         string[]?     // JSON array

  // [4] Vehicle Usage Status
  usage_status_notes:  string?
  has_problem_vehicles: boolean?
  problem_count:        number?
  problem_details:      string?
  service_location:     'chiangmai' | 'other_isuzu' | 'outside' | 'self' | 'unknown'?
  service_reason:       string?
  main_problems:        string[]?    // JSON array

  // [5] Purchase/Replacement Plans
  purchase_timeline:    '3m' | '6m' | '12m' | '1-2y' | 'none' | 'unsure'?
  expected_quantity:    number?
  interested_models:    string[]?    // JSON array
  purchase_purpose:     string[]?    // JSON array

  // [6] Decision Process
  decision_makers:      json?        // [{role, name_position}]
  key_factors:          string[]?    // JSON array (max 3)

  // [7] Interested Services
  interested_services:  string[]?    // JSON array

  // [8] Summary
  lead_level:           'hot' | 'warm' | 'future' | 'maintain' | 'inactive'?
  customer_needs:       string?
  problems_found:       string?
  business_opportunities: string[]?  // JSON array

  // [9] Next Steps (at least 1 required)
  next_actions:         string[]     // non-empty in validation
  next_action_owner:    string?
  next_action_date:     date?
  next_action_details:  string?

  created_at:           datetime
  updated_at:           datetime
}
```

### 3.5 Deals (Pipeline)

```typescript
// deals
{
  id:                  string (UUID)
  customer_id:         string → customers.id
  sales_rep_id:        string → team_members.id
  vehicle_model:       string      // e.g. "D-Max 1.9 S", "ELF", "MU-X 3.0"
  quantity:            number
  expected_amount:     number?     // estimated value
  stage:               'lead' | 'visit_done' | 'quote_sent'
                       | 'negotiating' | 'won' | 'lost'
  expected_close_date: date?
  won_amount:          number?
  notes:               string?
  source_call_log_id:  string?     // link to the call that generated this deal
  source_visit_log_id: string?     // link to the visit that generated this deal
  created_at:          datetime
  updated_at:          datetime
}
```

### 3.6 Monthly Targets

```typescript
// monthly_targets
{
  id:            string (UUID)
  sales_rep_id:  string → team_members.id
  month:         string        // "YYYY-MM"
  visit_target:  number
  call_target:   number
  deal_target:   number?       // number of vehicles
}
```

### 3.7 LINE Auth Sessions

```typescript
// sessions
{
  id:            string (UUID)
  team_member_id: string → team_members.id
  token:         string        // JWT
  expires_at:    datetime
  created_at:    datetime
}
```

---

## 4. API Routes (Hono)

### 4.1 Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/line` | None | Redirect to LINE OAuth |
| GET | `/api/auth/line/callback` | None | LINE OAuth callback → JWT |
| POST | `/api/auth/refresh` | JWT | Refresh token |
| POST | `/api/auth/logout` | JWT | Invalidate session |

### 4.2 Customers (`/api/customers`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/customers` | JWT | List (filtered by rep for sales_rep role) |
| GET | `/api/customers/:id` | JWT | Detail + contacts + fleet + recent activity |
| POST | `/api/customers` | JWT | Create company |
| PATCH | `/api/customers/:id` | JWT | Update |
| DELETE | `/api/customers/:id` | Manager | Soft delete |
| POST | `/api/customers/:id/contacts` | JWT | Add contact |
| PATCH | `/api/customers/:id/contacts/:contactId` | JWT | Update contact |
| DELETE | `/api/customers/:id/contacts/:contactId` | JWT | Remove contact |

### 4.3 Visits (`/api/visits`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/visit-plans` | JWT | List plans (by month, rep) |
| POST | `/api/visit-plans` | JWT | Create plan |
| POST | `/api/visit-plans/generate` | Manager | Auto-generate monthly plans |
| PATCH | `/api/visit-plans/:id` | JWT | Update status |
| GET | `/api/visit-logs` | JWT | List logs |
| POST | `/api/visit-logs` | JWT | Record visit (with GPS check-in) |
| PATCH | `/api/visit-logs/:id` | JWT | Update log |
| POST | `/api/visit-logs/upload` | JWT | Upload attachment (to R2) |

### 4.4 Calls (`/api/calls`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/call-plans` | JWT | List plans |
| POST | `/api/call-plans` | JWT | Create plan |
| POST | `/api/call-plans/generate` | Manager | Auto-generate monthly plans |
| PATCH | `/api/call-plans/:id` | JWT | Update status |
| GET | `/api/call-logs` | JWT | List logs (with full 10-section data) |
| GET | `/api/call-logs/:id` | JWT | Single call log detail |
| POST | `/api/call-logs` | JWT | Record call (full 10-section form) |
| PATCH | `/api/call-logs/:id` | JWT | Update call log |
| GET | `/api/call-logs/:id/script` | JWT | Generate opening/closing script (auto-fill from data) |

### 4.5 Deals (`/api/deals`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/deals` | JWT | List deals (kanban view) |
| POST | `/api/deals` | JWT | Create deal |
| PATCH | `/api/deals/:id` | JWT | Update stage, details |
| PATCH | `/api/deals/:id/stage` | JWT | Kanban drag → stage change |

### 4.6 Team (`/api/team`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/team` | Manager | List team members |
| POST | `/api/team` | Manager | Add member |
| PATCH | `/api/team/:id` | Manager | Update member |
| DELETE | `/api/team/:id` | Manager | Deactivate member |

### 4.7 Targets (`/api/targets`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/targets` | JWT | Get monthly targets (rep sees own) |
| POST | `/api/targets` | Manager | Set/update monthly target |
| GET | `/api/targets/summary` | JWT | Target vs actual for current month |

### 4.8 Reports (`/api/reports`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports/visit-completion` | Manager | Visit completion by rep/month |
| GET | `/api/reports/call-completion` | Manager | Call completion by rep/month |
| GET | `/api/reports/lead-heatmap` | Manager | Lead distribution (Hot/Warm/...) |
| GET | `/api/reports/sales-performance` | Manager | Deals won, value, win rate |
| GET | `/api/reports/coverage-gaps` | Manager | Customers not visited 2+ months |
| GET | `/api/reports/export` | Manager | Export to CSV/Excel |

### 4.9 MCP (`/api/mcp`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/mcp` | API Key | JSON-RPC 2.0 MCP endpoint |

**MCP Tools:**
- `list_customers(filters)` — Search/filter customer list
- `get_customer_detail(id)` — Full customer profile
- `get_visit_history(customer_id)` — All visit logs for a customer
- `get_call_history(customer_id)` — All call logs for a customer
- `summarize_lead(customer_id)` — AI summary of customer status
- `suggest_next_action(customer_id)` — AI-recommended next step
- `get_team_performance(month)` — Team KPI dashboard data
- `get_overdue_followups()` — Customers needing urgent attention

### 4.10 Sync (PWA Offline) (`/api/sync`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sync` | JWT | Batch upload queued offline records |
| GET | `/api/sync/status` | JWT | Check sync status |

---

## 5. Frontend Structure

### 5.1 Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | Login.tsx | LINE Login screen |
| `/` | Dashboard.tsx | Main layout + sidebar (redirects to /overview) |
| `/overview` | Overview.tsx | Dashboard — completion rates, lead heatmap, overdue alerts |
| `/customers` | Customers.tsx | Customer list with search, filter, segment tabs |
| `/customers/:id` | CustomerDetail.tsx | Full customer profile with tabs |
| `/visits` | VisitPlanner.tsx | Calendar + list view of visit plans |
| `/visits/new` | VisitForm.tsx | Record new visit log |
| `/calls` | CallPlanner.tsx | Call plan list + schedule |
| `/calls/new` | CallForm.tsx | 10-section call form |
| `/calls/:id` | CallDetail.tsx | View/print call record |
| `/deals` | Deals.tsx | Kanban pipeline board |
| `/reports` | Reports.tsx | Manager reports (hidden from sales_rep sidebar) |
| `/settings` | Settings.tsx | Team management, targets, import |

### 5.2 Sidebar Items

```
ภาพรวม              → /overview
ลูกค้าองค์กร         → /customers
Visit               → /visits
Call                → /calls
Pipeline            → /deals
──────────
รายงาน (Manager)    → /reports
ตั้งค่า (Manager)    → /settings
```

### 5.3 Theme Tokens (CSS Variables)

```css
--bg: #F7F6F2
--bg-2: #EFEDE8
--surface: #FFFFFF
--fg: #1A1B1E
--fg-2: #4A4B4F
--muted: #8A8B8F
--accent: #06C755
--accent-2: #059669
--accent-soft: #E8F9EF
--accent-text: #FFFFFF
--border: #E8E6E0
--border-2: #F0EEE8
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 0px        // No rounded panel corners
--font: 'Noto Sans Thai', sans-serif
```

**Rules:**
- No dark mode
- No emoji in UI (use lucide-react SVG icons)
- All text in Thai
- English only for: LINE, API, brand names, technical terms

---

## 6. PWA Configuration

### 6.1 Service Worker Strategies

| Resource | Strategy | Reasoning |
|----------|----------|-----------|
| Static assets (JS, CSS) | Cache First | Immutable hashed filenames |
| `/api/customers` | Network First + IndexedDB fallback | Need fresh data, but offline access |
| `/api/visit-logs` | Stale-While-Revalidate + Background Sync | Allow recording offline |
| `/api/call-logs` | Stale-While-Revalidate + Background Sync | Allow recording offline |
| `/api/deals` | Network First + IndexedDB fallback | Need fresh pipeline data |
| PWA icons, fonts | Cache First | Rarely change |

### 6.2 Offline Queue

- Visit and call logs created while offline go to IndexedDB queue
- Background Sync API triggers upload when online
- `/api/sync` batch endpoint processes queued items
- Conflict resolution: server timestamp wins for edits; client timestamp for new records

### 6.3 GPS Check-in

- `navigator.geolocation.getCurrentPosition()` on visit form
- Stored as `gps_lat`, `gps_lng` on visit_logs
- Displayed on Google Maps Static Map in visit detail view

---

## 7. External Integrations

### 7.1 LINE Login

```typescript
// OAuth flow:
// 1. Redirect to https://access.line.me/oauth2/v2.1/authorize
// 2. Callback receives code
// 3. Exchange code for access_token + id_token
// 4. Verify id_token, extract LINE user ID
// 5. Lookup or create team_member by line_user_id
// 6. Issue JWT (HS256, HttpOnly cookie)
```

### 7.2 LINE Messaging API

```typescript
// Push notifications for:
// - Visit overdue (customer not visited by plan date)
// - Call overdue
// - Deal stage changed to 'won'
// - Lead level upgraded to 'hot'
// - Manager: daily summary of team activity
```

### 7.3 Google Maps Platform

- **Geocoding API** — Convert customer addresses to lat/lng
- **Distance Matrix API** — Optimize daily visit routes (sort by distance)
- **Maps Static API** — Show customer locations on dashboard map

### 7.4 ISUZU API (Placeholder)

Anticipated integrations (actual API TBD):
- Vehicle model catalog (specs, pricing)
- Current promotions and campaigns
- Service package details

---

## 8. Security Checklist

- [x] JWT with short expiry (1 hour) + refresh token (7 days)
- [x] HttpOnly cookies — no token in localStorage
- [x] Role-based access: `manager` vs `sales_rep` middleware
- [x] Input validation: Zod schemas on all API inputs
- [x] SQL injection prevention: Drizzle parameterized queries
- [x] CORS: whitelist Pages domain only
- [x] Rate limiting: per-user, per-IP on auth endpoints
- [x] API keys encrypted in environment variables (not in code)
- [x] MCP endpoint: separate Bearer token auth
- [x] File upload: R2 presigned URLs, size limits
- [x] No raw SQL — all queries through Drizzle

---

## 9. Implementation Phases

| Phase | Scope | Priority |
|-------|-------|----------|
| 🔴 **Phase 1** | Project setup, monorepo, Drizzle schema, Auth (LINE Login), Customer CRUD, Team CRUD, Visit Planner + Visit Log (basic form) | Must-have |
| 🔴 **Phase 2** | Call Planner + CallForm (10-section), Dashboard overview, LINE Push notifications for overdue visits/calls | Must-have |
| 🟡 **Phase 3** | Deals Pipeline (Kanban), Customer Detail page (full), Google Maps integration | Should-have |
| 🟡 **Phase 4** | Reports (Manager), Auto-generate monthly plans, PWA offline support + Background Sync | Should-have |
| 🟢 **Phase 5** | MCP endpoint, ISUZU API integration (when available), GPS route optimization, Excel import/export | Nice-to-have |

---

## 10. Open Questions / TBD

1. ISUZU API — actual endpoint and auth method not yet known. Placeholder service module ready.
2. Custom domain — `isuzu-corporate.it-addict.com` or separate domain? TBD with user.
3. LINE OA — which LINE channel? Same as it-addict CRM or separate?
4. Initial data import — Excel template format for customer import?
