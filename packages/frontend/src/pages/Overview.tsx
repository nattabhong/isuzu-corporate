import { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  Phone,
  MapPin,
  DollarSign,
  AlertTriangle,
  Clock,
  UserCheck,
  TrendingUp,
  Flame,
  Thermometer,
  Calendar,
  Target,
  BarChart3,
} from 'lucide-react'
import {
  fetchCustomers,
  fetchVisitPlans,
  fetchVisitLogs,
  fetchCallLogs,
  fetchDeals,
  fetchTeamMembers,
  fetchMonthlyTargets,
} from '../lib/api'
import type { AuthUser } from '../hooks/useAuth'
import type {
  Customer,
  VisitPlan,
  VisitLog,
  CallLog,
  Deal,
  TeamMember,
  MonthlyTarget,
} from '@isuzu-corporate/shared'

// ─── Props ───────────────────────────────────────────────────────────────────

interface OverviewProps {
  user: AuthUser
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function daysAgo(dateStr: string): number {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

function formatDateThai(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ]
  const year = d.getFullYear() + 543
  return `${day} ${months[d.getMonth()]} ${year}`
}

function formatRelativeTime(dateStr: string): string {
  const d = daysAgo(dateStr)
  if (d === 0) return 'วันนี้'
  if (d === 1) return 'เมื่อวาน'
  if (d < 7) return `${d} วันที่แล้ว`
  if (d < 30) return `${Math.floor(d / 7)} สัปดาห์ที่แล้ว`
  return formatDateThai(dateStr)
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function formatCount(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

const LEAD_LEVEL_LABELS: Record<string, string> = {
  hot: 'Hot',
  warm: 'Warm',
  future: 'Future',
  maintain: 'Maintain',
  inactive: 'Inactive',
}

const LEAD_LEVEL_COLORS: Record<string, string> = {
  hot: '#C62828',
  warm: '#E65100',
  future: '#1565C0',
  maintain: '#2E7D32',
  inactive: '#757575',
}

const LEAD_LEVEL_BG: Record<string, string> = {
  hot: '#FFEBEE',
  warm: '#FFF3E0',
  future: '#E3F2FD',
  maintain: '#E8F5E9',
  inactive: '#F5F5F5',
}

// ─── Section components ──────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: React.ComponentType<{ size: number }>
  label: string
  value: string
  sub?: React.ReactNode
  color: string
  bg: string
}) {
  return (
    <div className="panel summary-card">
      <div className="summary-icon" style={{ background: bg, color }}>
        <Icon size={20} />
      </div>
      <div className="summary-body">
        <div className="summary-value">{value}</div>
        <div className="summary-label">{label}</div>
        {sub && <div className="summary-sub">{sub}</div>}
      </div>
    </div>
  )
}

function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="progress-bar-track">
      <div
        className="progress-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
      <span className="progress-bar-label">{pct}%</span>
    </div>
  )
}

function SegmentBadge({ segment }: { segment: string }) {
  const cls = `badge badge-segment-${(segment || 'b').toLowerCase()}`
  return <span className={cls}>{segment}</span>
}

function LeadLevelBadge({ level }: { level: string }) {
  const cls = `badge badge-lead-${level.toLowerCase()}`
  return <span className={cls}>{LEAD_LEVEL_LABELS[level] || level}</span>
}

// ─── Main component ──────────────────────────────────────────────────────────

export function Overview({ user }: OverviewProps) {
  const month = currentMonth()
  const isManager = user.role === 'manager'

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [visitPlans, setVisitPlans] = useState<VisitPlan[]>([])
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [targets, setTargets] = useState<MonthlyTarget[]>([])

  // Loading states per section
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingHeatmap, setLoadingHeatmap] = useState(true)
  const [loadingOverdue, setLoadingOverdue] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [loadingTeam, setLoadingTeam] = useState(true)

  // Error states per section
  const [errorSummary, setErrorSummary] = useState<string | null>(null)
  const [errorHeatmap, setErrorHeatmap] = useState<string | null>(null)
  const [errorOverdue, setErrorOverdue] = useState<string | null>(null)
  const [errorActivity, setErrorActivity] = useState<string | null>(null)
  const [errorTeam, setErrorTeam] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      // Parallel fetch all data
      const results = await Promise.allSettled([
        fetchCustomers().then((d) => { setCustomers(d); return d }),
        fetchVisitPlans(month).then((d) => { setVisitPlans(d); return d }),
        fetchVisitLogs().then((d) => { setVisitLogs(d); return d }),
        fetchCallLogs().catch(() => [] as CallLog[]).then((d) => { setCallLogs(d); return d }),
        fetchDeals().catch(() => [] as Deal[]).then((d) => { setDeals(d); return d }),
        fetchTeamMembers().catch(() => [] as TeamMember[]).then((d) => { setTeamMembers(d); return d }),
        fetchMonthlyTargets(month).catch(() => [] as MonthlyTarget[]).then((d) => { setTargets(d); return d }),
      ])

      const [cRes, vpRes, vlRes, clRes, dRes, tmRes, tRes] = results

      // Summary depends on customers + visit plans + deals
      setLoadingSummary(false)
      if (cRes.status === 'rejected') setErrorSummary('โหลดข้อมูลลูกค้าไม่สำเร็จ')
      if (vpRes.status === 'rejected') setErrorSummary((s) => s || 'โหลดแผนเข้าเยี่ยมไม่สำเร็จ')

      // Heatmap depends on call logs
      setLoadingHeatmap(false)
      if (clRes.status === 'rejected') setErrorHeatmap('โหลดข้อมูล Call Log ไม่สำเร็จ')

      // Overdue depends on customers + visit plans + call logs
      setLoadingOverdue(false)

      // Activity depends on visit logs + call logs
      setLoadingActivity(false)
      if (vlRes.status === 'rejected') setErrorActivity('โหลดประวัติการเข้าเยี่ยมไม่สำเร็จ')

      // Team performance
      setLoadingTeam(false)
      if (!isManager) return
      if (tmRes.status === 'rejected') setErrorTeam('โหลดข้อมูลทีมไม่สำเร็จ')
    }
    load()
  }, [month, isManager])

  // ─── Compute summary stats ─────────────────────────────────────────

  const summary = useMemo(() => {
    const activeCustomers = customers.filter((c) => c.status === 'active')

    // Visit plans for current month
    const monthPlans = visitPlans.filter((p) => p.month === month)
    const visitDone = monthPlans.filter((p) => p.status === 'completed').length
    const visitTotal = monthPlans.length

    // Call logs for current month
    const monthCalls = callLogs.filter((c) => {
      if (!c.callDate) return false
      const d = new Date(c.callDate)
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return m === month
    })
    const callDone = monthCalls.length

    // Hot leads (from call logs, leadLevel = 'hot')
    const hotLeads = callLogs.filter((c) => c.leadLevel === 'hot').length

    // Deals won
    const wonDeals = deals.filter((d) => d.stage === 'won')
    const wonCount = wonDeals.length
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.wonAmount ?? 0), 0)

    return {
      visitDone,
      visitTotal,
      visitPct: visitTotal > 0 ? Math.round((visitDone / visitTotal) * 100) : 0,
      callDone,
      callTotal: activeCustomers.length, // rough estimate: one call per active customer
      callPct: activeCustomers.length > 0 ? Math.round((callDone / activeCustomers.length) * 100) : 0,
      hotLeads,
      wonCount,
      wonValue,
    }
  }, [customers, visitPlans, callLogs, deals, month])

  // ─── Compute lead heatmap ───────────────────────────────────────────

  const heatmap = useMemo(() => {
    const counts: Record<string, number> = { hot: 0, warm: 0, future: 0, maintain: 0, inactive: 0 }
    callLogs.forEach((c) => {
      if (c.leadLevel && counts[c.leadLevel] !== undefined) {
        counts[c.leadLevel]++
      }
    })
    const maxCount = Math.max(...Object.values(counts), 1)
    return { counts, maxCount }
  }, [callLogs])

  // ─── Compute overdue alerts ─────────────────────────────────────────

  const overdueAlerts = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const activeCustomers = customers.filter((c) => c.status === 'active')

    // Customers who have a visit plan this month but not completed
    const monthPlanCustomerIds = new Set(
      visitPlans.filter((p) => p.month === month && p.status === 'completed').map((p) => p.customerId)
    )

    // Customers who have a call log this month
    const monthCallCustomerIds = new Set(
      callLogs
        .filter((c) => {
          if (!c.callDate) return false
          const d = new Date(c.callDate)
          return d >= monthStart
        })
        .map((c) => c.customerId)
    )

    // Customers with overdue visits (no visit log this month)
    const lastVisitMap = new Map<string, string>()
    visitLogs.forEach((vl) => {
      const existing = lastVisitMap.get(vl.customerId)
      if (!existing || vl.visitDate > existing) {
        lastVisitMap.set(vl.customerId, vl.visitDate)
      }
    })

    const alerts: {
      customerId: string
      customerName: string
      segment: string
      type: 'visit' | 'call'
      lastDate: string
      daysOverdue: number
      assignedRep: string
    }[] = []

    activeCustomers.forEach((cust) => {
      const rep = teamMembers.find((m) => m.id === cust.assignedTo)
      const repName = rep?.name ?? '—'

      // Visit overdue check
      if (!monthPlanCustomerIds.has(cust.id)) {
        const lastVisit = lastVisitMap.get(cust.id)
        if (lastVisit) {
          const d = daysAgo(lastVisit)
          if (d > 30) {
            alerts.push({
              customerId: cust.id,
              customerName: cust.name,
              segment: cust.segment,
              type: 'visit',
              lastDate: lastVisit,
              daysOverdue: d - 30,
              assignedRep: repName,
            })
          }
        } else {
          // Never visited
          alerts.push({
            customerId: cust.id,
            customerName: cust.name,
            segment: cust.segment,
            type: 'visit',
            lastDate: '',
            daysOverdue: 999,
            assignedRep: repName,
          })
        }
      }

      // Call overdue check
      if (!monthCallCustomerIds.has(cust.id)) {
        // If already in visit alerts, skip (already covered)
        const alreadyIn = alerts.find((a) => a.customerId === cust.id)
        if (!alreadyIn) {
          alerts.push({
            customerId: cust.id,
            customerName: cust.name,
            segment: cust.segment,
            type: 'call',
            lastDate: '',
            daysOverdue: 30,
            assignedRep: repName,
          })
        }
      }
    })

    // Sort by days overdue descending
    alerts.sort((a, b) => b.daysOverdue - a.daysOverdue)
    return alerts.slice(0, 20)
  }, [customers, visitPlans, visitLogs, callLogs, teamMembers, month])

  // ─── Compute recent activity ────────────────────────────────────────

  const recentActivity = useMemo(() => {
    const visits = visitLogs.map((vl) => ({
      id: vl.id,
      type: 'visit' as const,
      date: vl.visitDate,
      time: vl.startTime,
      customerId: vl.customerId,
      repId: vl.salesRepId,
      note: vl.notes,
    }))
    const calls = callLogs.map((cl) => ({
      id: cl.id,
      type: 'call' as const,
      date: cl.callDate,
      time: cl.callTime,
      customerId: cl.customerId,
      repId: cl.salesRepId,
      note: cl.customerNeeds,
    }))

    const merged = [...visits, ...calls].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    return merged.slice(0, 10)
  }, [visitLogs, callLogs])

  // ─── Compute team performance ───────────────────────────────────────

  const teamPerformance = useMemo(() => {
    if (!isManager) return []

    const monthPlans = visitPlans.filter((p) => p.month === month)
    const monthCalls = callLogs.filter((c) => {
      if (!c.callDate) return false
      const d = new Date(c.callDate)
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return m === month
    })
    const monthDeals = deals.filter((d) => d.stage === 'won')

    return teamMembers
      .filter((m) => m.role === 'sales_rep' && m.isActive)
      .map((rep) => {
        const target = targets.find((t) => t.salesRepId === rep.id)
        const visitTarget = target?.visitTarget ?? 0
        const callTarget = target?.callTarget ?? 0

        const repVisitsDone = monthPlans.filter(
          (p) => p.salesRepId === rep.id && p.status === 'completed'
        ).length

        const repCallsDone = monthCalls.filter(
          (c) => c.salesRepId === rep.id
        ).length

        const repDealsWon = monthDeals.filter(
          (d) => d.salesRepId === rep.id
        ).length

        return {
          id: rep.id,
          name: rep.name,
          territory: rep.territory ?? '—',
          visitDone: repVisitsDone,
          visitTarget,
          callDone: repCallsDone,
          callTarget,
          dealsWon: repDealsWon,
        }
      })
  }, [isManager, teamMembers, targets, visitPlans, callLogs, deals, month])

  // ─── Customer name lookup ───────────────────────────────────────────

  const customerNames = useMemo(() => {
    const map = new Map<string, string>()
    customers.forEach((c) => map.set(c.id, c.name))
    return map
  }, [customers])

  const repNames = useMemo(() => {
    const map = new Map<string, string>()
    teamMembers.forEach((m) => map.set(m.id, m.name))
    return map
  }, [teamMembers])

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="page overview-page">
      <div className="page-header">
        <h1>ภาพรวม</h1>
        <span className="month-badge">
          <Calendar size={14} />
          <span>{month}</span>
        </span>
      </div>

      {/* ===== 1. Summary Cards ===== */}
      <div className="overview-grid-4">
        {loadingSummary ? (
          <div className="panel overview-loading">กำลังโหลด...</div>
        ) : errorSummary ? (
          <div className="panel overview-error">{errorSummary}</div>
        ) : (
          <>
            <SummaryCard
              icon={MapPin}
              label="Visit สำเร็จ (เดือนนี้)"
              value={`${formatCount(summary.visitDone)} / ${formatCount(summary.visitTotal)}`}
              sub={<ProgressBar done={summary.visitDone} total={summary.visitTotal} color="#4CAF50" />}
              color="#2E7D32"
              bg="#E8F5E9"
            />
            <SummaryCard
              icon={Phone}
              label="Call สำเร็จ (เดือนนี้)"
              value={`${formatCount(summary.callDone)} / ${formatCount(summary.callTotal)}`}
              sub={<ProgressBar done={summary.callDone} total={summary.callTotal} color="#2196F3" />}
              color="#1565C0"
              bg="#E3F2FD"
            />
            <SummaryCard
              icon={Flame}
              label="Hot Leads"
              value={formatCount(summary.hotLeads)}
              sub="มีแผนซื้อภายใน 3 เดือน"
              color="#C62828"
              bg="#FFEBEE"
            />
            <SummaryCard
              icon={DollarSign}
              label="Deals ปิดสำเร็จ"
              value={`${summary.wonCount} ดีล`}
              sub={`มูลค่า ${formatCurrency(summary.wonValue)} บาท`}
              color="#E65100"
              bg="#FFF3E0"
            />
          </>
        )}
      </div>

      {/* ===== 2. Lead Heatmap ===== */}
      <div className="panel overview-section">
        <div className="section-header-bar">
          <BarChart3 size={18} className="section-icon" />
          <h2>Lead Heatmap</h2>
        </div>
        {loadingHeatmap ? (
          <div className="overview-loading">กำลังโหลด...</div>
        ) : errorHeatmap ? (
          <div className="overview-error">{errorHeatmap}</div>
        ) : heatmap.maxCount === 0 ? (
          <div className="empty-state">
            <Thermometer size={32} />
            <p>ยังไม่มีข้อมูล Lead</p>
          </div>
        ) : (
          <div className="heatmap-bars">
            {(['hot', 'warm', 'future', 'maintain', 'inactive'] as const).map((level) => (
              <div key={level} className="heatmap-row">
                <span
                  className="heatmap-label"
                  style={{ color: LEAD_LEVEL_COLORS[level] }}
                >
                  {LEAD_LEVEL_LABELS[level]}
                </span>
                <div className="heatmap-bar-track">
                  <div
                    className="heatmap-bar-fill"
                    style={{
                      width: `${(heatmap.counts[level] / heatmap.maxCount) * 100}%`,
                      background: LEAD_LEVEL_COLORS[level],
                    }}
                  />
                </div>
                <span className="heatmap-count">{formatCount(heatmap.counts[level])}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 3. Overdue Alerts ===== */}
      <div className="panel overview-section">
        <div className="section-header-bar">
          <AlertTriangle size={18} className="section-icon section-icon-warn" />
          <h2>แจ้งเตือน — เลยกำหนด</h2>
        </div>
        {loadingOverdue ? (
          <div className="overview-loading">กำลังโหลด...</div>
        ) : overdueAlerts.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={32} />
            <p>ไม่มีรายการเลยกำหนด</p>
          </div>
        ) : (
          <div className="overdue-list">
            {overdueAlerts.map((alert) => (
              <div key={`${alert.customerId}-${alert.type}`} className="overdue-row">
                <div className="overdue-info">
                  <div className="overdue-name">
                    {alert.customerName}
                    <SegmentBadge segment={alert.segment} />
                  </div>
                  <div className="overdue-meta">
                    <span className="overdue-type">
                      {alert.type === 'visit' ? (
                        <>
                          <MapPin size={12} />
                          <span>Visit เลยกำหนด {alert.daysOverdue >= 999 ? '—' : `${alert.daysOverdue} วัน`}</span>
                        </>
                      ) : (
                        <>
                          <Phone size={12} />
                          <span>Call เลยกำหนด {alert.daysOverdue} วัน</span>
                        </>
                      )}
                    </span>
                    <span className="overdue-rep">{alert.assignedRep}</span>
                  </div>
                </div>
                <span
                  className={`badge badge-overdue ${
                    alert.daysOverdue > 60 ? 'badge-overdue-critical' : ''
                  }`}
                >
                  {alert.daysOverdue >= 999 ? 'ไม่เคย' : `${alert.daysOverdue} วัน`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 4. Recent Activity ===== */}
      <div className="panel overview-section">
        <div className="section-header-bar">
          <Clock size={18} className="section-icon" />
          <h2>กิจกรรมล่าสุด</h2>
        </div>
        {loadingActivity ? (
          <div className="overview-loading">กำลังโหลด...</div>
        ) : errorActivity ? (
          <div className="overview-error">{errorActivity}</div>
        ) : recentActivity.length === 0 ? (
          <div className="empty-state">
            <Clock size={32} />
            <p>ยังไม่มีกิจกรรม</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentActivity.map((act) => (
              <div key={act.id} className="activity-row">
                <div
                  className={`activity-icon ${
                    act.type === 'visit' ? 'activity-icon-visit' : 'activity-icon-call'
                  }`}
                >
                  {act.type === 'visit' ? <MapPin size={14} /> : <Phone size={14} />}
                </div>
                <div className="activity-body">
                  <div className="activity-title">
                    {act.type === 'visit' ? 'เข้าพบ' : 'โทรหา'}{' '}
                    <strong>{customerNames.get(act.customerId) ?? '—'}</strong>
                  </div>
                  <div className="activity-meta">
                    {repNames.get(act.repId) ?? '—'} · {formatRelativeTime(act.date)}
                    {act.time && ` · ${act.time}`}
                  </div>
                  {act.note && (
                    <div className="activity-note">{act.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 5. Team Performance (manager only) ===== */}
      {isManager && (
        <div className="panel overview-section">
          <div className="section-header-bar">
            <TrendingUp size={18} className="section-icon" />
            <h2>ผลงานทีม — {month}</h2>
          </div>
          {loadingTeam ? (
            <div className="overview-loading">กำลังโหลด...</div>
          ) : errorTeam ? (
            <div className="overview-error">{errorTeam}</div>
          ) : teamPerformance.length === 0 ? (
            <div className="empty-state">
              <Target size={32} />
              <p>ไม่มีสมาชิกในทีม</p>
            </div>
          ) : (
            <div className="team-table-wrapper">
              <table className="data-table team-table">
                <thead>
                  <tr>
                    <th>ชื่อ</th>
                    <th>Visit</th>
                    <th>Call</th>
                    <th>ปิดดีล</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((rep) => (
                    <tr key={rep.id}>
                      <td className="td-customer">{rep.name}</td>
                      <td>
                        <span className="team-stat">
                          {rep.visitDone}
                          <span className="team-stat-target">/{rep.visitTarget}</span>
                        </span>
                        {rep.visitTarget > 0 && (
                          <ProgressBar
                            done={rep.visitDone}
                            total={rep.visitTarget}
                            color="#4CAF50"
                          />
                        )}
                      </td>
                      <td>
                        <span className="team-stat">
                          {rep.callDone}
                          <span className="team-stat-target">/{rep.callTarget}</span>
                        </span>
                        {rep.callTarget > 0 && (
                          <ProgressBar
                            done={rep.callDone}
                            total={rep.callTarget}
                            color="#2196F3"
                          />
                        )}
                      </td>
                      <td>
                        <span className="team-stat">{rep.dealsWon}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
