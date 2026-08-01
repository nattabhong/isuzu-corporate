CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  line_user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'sales_rep' CHECK(role IN ('manager','sales_rep')),
  territory TEXT,
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_type TEXT,
  industry TEXT,
  address TEXT,
  province TEXT,
  district TEXT,
  lat REAL,
  lng REAL,
  segment TEXT NOT NULL DEFAULT 'B' CHECK(segment IN ('A','B','C')),
  assigned_to TEXT REFERENCES team_members(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','prospect')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);

CREATE TABLE IF NOT EXISTS customer_contacts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  is_decision_maker INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);

CREATE TABLE IF NOT EXISTS visit_plans (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
  month TEXT NOT NULL,
  planned_date TEXT NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'follow_up' CHECK(visit_type IN ('first_visit','follow_up','closing','service')),
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','completed','missed','rescheduled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visit_plans_customer_id ON visit_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_visit_plans_sales_rep_id ON visit_plans(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_visit_plans_month ON visit_plans(month);

CREATE TABLE IF NOT EXISTS visit_logs (
  id TEXT PRIMARY KEY,
  visit_plan_id TEXT REFERENCES visit_plans(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
  visit_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  gps_lat REAL,
  gps_lng REAL,
  notes TEXT,
  next_step TEXT,
  customer_mood TEXT CHECK(customer_mood IN ('positive','neutral','concerned')),
  attachments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visit_logs_customer_id ON visit_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_sales_rep_id ON visit_logs(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visit_date ON visit_logs(visit_date);

CREATE TABLE IF NOT EXISTS call_plans (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
  month TEXT NOT NULL,
  planned_date TEXT NOT NULL,
  call_purpose TEXT NOT NULL DEFAULT 'check_in' CHECK(call_purpose IN ('check_in','offer','follow_up','reminder')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','completed','missed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_call_plans_customer_id ON call_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_plans_sales_rep_id ON call_plans(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_call_plans_month ON call_plans(month);

CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  call_plan_id TEXT REFERENCES call_plans(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
  contact_name TEXT NOT NULL,
  contact_position TEXT,
  contact_phone TEXT,
  contact_line_email TEXT,
  call_date TEXT NOT NULL,
  call_time TEXT,
  not_convenient INTEGER NOT NULL DEFAULT 0,
  callback_date TEXT,
  callback_time TEXT,
  duration_minutes INTEGER,
  fleet_isuzu_count INTEGER,
  fleet_other_count INTEGER,
  fleet_pickup INTEGER,
  fleet_truck INTEGER,
  fleet_suv INTEGER,
  fleet_total INTEGER,
  usage_types TEXT,
  usage_status_notes TEXT,
  has_problem_vehicles INTEGER,
  problem_count INTEGER,
  problem_details TEXT,
  service_location TEXT,
  service_reason TEXT,
  main_problems TEXT,
  purchase_timeline TEXT,
  expected_quantity INTEGER,
  interested_models TEXT,
  purchase_purpose TEXT,
  decision_makers TEXT,
  key_factors TEXT,
  interested_services TEXT,
  lead_level TEXT,
  customer_needs TEXT,
  problems_found TEXT,
  business_opportunities TEXT,
  next_actions TEXT NOT NULL,
  next_action_owner TEXT,
  next_action_date TEXT,
  next_action_details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_sales_rep_id ON call_logs(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_date ON call_logs(call_date);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_level ON call_logs(lead_level);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
  vehicle_model TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  expected_amount REAL,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK(stage IN ('lead','visit_done','quote_sent','negotiating','won','lost')),
  expected_close_date TEXT,
  won_amount REAL,
  notes TEXT,
  source_call_log_id TEXT REFERENCES call_logs(id),
  source_visit_log_id TEXT REFERENCES visit_logs(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_sales_rep_id ON deals(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

CREATE TABLE IF NOT EXISTS monthly_targets (
  id TEXT PRIMARY KEY,
  sales_rep_id TEXT NOT NULL REFERENCES team_members(id),
  month TEXT NOT NULL,
  visit_target INTEGER NOT NULL DEFAULT 0,
  call_target INTEGER NOT NULL DEFAULT 0,
  deal_target INTEGER
);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_sales_rep_id ON monthly_targets(sales_rep_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_targets_rep_month ON monthly_targets(sales_rep_id, month);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  team_member_id TEXT NOT NULL REFERENCES team_members(id),
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_team_member_id ON sessions(team_member_id);
