import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  MapPin,
  Phone,
  BarChart3,
  DollarSign,
  AlertTriangle,
  Trophy,
  Flame,
} from 'lucide-react'
import {
  fetchVisitCompletion,
  fetchCallCompletion,
  fetchLeadHeatmap,
  fetchSalesPerformance,
  fetchCoverageGaps,
  fetchTeamLeaderboard,
} from '../lib/api'
import type {
  VisitCompletion,
  CallCompletion,
  LeadHeatmap,
  SalesPerformance,
  CoverageGap,
  TeamLeaderboardEntry,
} from '@isuzu-corporate/shared'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatCount(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n)
}

const LEAD_LABELS: Record<string, string> = {
  hot: 'Hot',
  warm: 'Warm',
  future: 'Future',
  maintain: 'Maintain',
  inactive: 'Inactive',
}

const LEAD_COLORS: Record<string, string> = {
  hot: '#C62828',
  warm: '#E65100',
  future: '#1565C0',
  maintain: '#2E7D32',
  inactive: '#757575',
}

const LEAD_BG: Record<string, string> = {
  hot: '#FFEBEE',
  warm: '#FFF3E0',
  future: '#E3F2FD',
  maintain: '#E8F5E9',
  inactive: '#F5F5F5',
}

const TABS = [
  { id: 'visit', label: 'รายงานการเข้าเยี่ยม', icon: MapPin },
  { id: 'call', label: 'รายงานการโทร', icon: Phone },
  { id: 'heatmap', label: 'Lead Heatmap', icon: Flame },
  { id: 'sales', label: 'ผลการขาย', icon: DollarSign },
  { id: 'gaps', label: 'ลูกค้าที่ยังไม่ได้รับการติดต่อ', icon: AlertTriangle },
  { id: 'leaderboard', label: 'การจัดอันดับทีม', icon: Trophy },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Progress Bar Component ──────────────────────────────────────────────────

function CompletionBar({ completed, total, missed }: { completed: number; total: number; missed: number }) {
  if (total === 0) return <span className="muted">—</span>

  const donePct = Math.round((completed / total) * 100)
  const missedPct = Math.round((missed / total) * 100)

  return (
    <div className="completion-bar-group">
      <div className="completion-bar">
        <div
          className="completion-bar-fill completed"
          style={{ width: `${donePct}%` }}
        />
        <div
          className="completion-bar-fill missed"
          style={{ width: `${missedPct}%` }}
        />
      </div>
      <span className="completion-label">
        {completed}/{total} ({donePct}%)
      </span>
    </div>
  )
}

// ─── Lead Bar Component ──────────────────────────────────────────────────────

function LeadBar({ label, count, maxCount, color, bg }: { label: string; count: number; maxCount: number; color: string; bg: string }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0

  return (
    <div className="lead-bar-row">
      <div className="lead-bar-label" style={{ color, background: bg }}>
        {label}
      </div>
      <div className="lead-bar-track">
        <div
          className="lead-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="lead-bar-count">{formatCount(count)}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Reports() {
  const month = currentMonth()
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [activeTab, setActiveTab] = useState<TabId>('visit')

  // Data states
  const [visitData, setVisitData] = useState<VisitCompletion[]>([])
  const [callData, setCallData] = useState<CallCompletion[]>([])
  const [heatmapData, setHeatmapData] = useState<LeadHeatmap | null>(null)
  const [salesData, setSalesData] = useState<SalesPerformance[]>([])
  const [gapsData, setGapsData] = useState<CoverageGap[]>([])
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardEntry[]>([])

  // Loading states
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const results = await Promise.allSettled([
          fetchVisitCompletion(selectedMonth).then(setVisitData).catch(() => setVisitData([])),
          fetchCallCompletion(selectedMonth).then(setCallData).catch(() => setCallData([])),
          fetchLeadHeatmap().then(setHeatmapData).catch(() => setHeatmapData(null)),
          fetchSalesPerformance().then(setSalesData).catch(() => setSalesData([])),
          fetchCoverageGaps(selectedMonth).then(setGapsData).catch(() => setGapsData([])),
          fetchTeamLeaderboard(selectedMonth).then(setLeaderboard).catch(() => setLeaderboard([])),
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedMonth])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page reports-page">
      <div className="page-header">
        <h1>รายงาน</h1>
        <div className="month-selector">
          <label htmlFor="report-month">เดือน</label>
          <input
            id="report-month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-bar panel" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`tab-btn ${isActive ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content panel">
        {loading ? (
          <div className="report-loading">กำลังโหลด...</div>
        ) : (
          <>
            {/* Visit Completion Report */}
            {activeTab === 'visit' && (
              <div className="report-section">
                <h2>รายงานการเข้าเยี่ยม — Visit Completion</h2>
                {visitData.length === 0 ? (
                  <div className="empty-state">ไม่มีข้อมูล</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>เซลล์</th>
                        <th>แผนทั้งหมด</th>
                        <th>สำเร็จ</th>
                        <th>พลาดนัด</th>
                        <th>อัตราความสำเร็จ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitData.map((row) => (
                        <tr key={row.salesRepId}>
                          <td>{row.salesRepName}</td>
                          <td>{formatCount(row.planned)}</td>
                          <td>{formatCount(row.completed)}</td>
                          <td>{formatCount(row.missed)}</td>
                          <td>
                            <CompletionBar
                              completed={row.completed}
                              total={row.planned}
                              missed={row.missed}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Call Completion Report */}
            {activeTab === 'call' && (
              <div className="report-section">
                <h2>รายงานการโทร — Call Completion</h2>
                {callData.length === 0 ? (
                  <div className="empty-state">ไม่มีข้อมูล</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>เซลล์</th>
                        <th>แผนทั้งหมด</th>
                        <th>สำเร็จ</th>
                        <th>พลาดนัด</th>
                        <th>อัตราความสำเร็จ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callData.map((row) => (
                        <tr key={row.salesRepId}>
                          <td>{row.salesRepName}</td>
                          <td>{formatCount(row.planned)}</td>
                          <td>{formatCount(row.completed)}</td>
                          <td>{formatCount(row.missed)}</td>
                          <td>
                            <CompletionBar
                              completed={row.completed}
                              total={row.planned}
                              missed={row.missed}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Lead Heatmap */}
            {activeTab === 'heatmap' && (
              <div className="report-section">
                <h2>Lead Heatmap — การกระจายตัวของ Lead</h2>
                {!heatmapData ? (
                  <div className="empty-state">ไม่มีข้อมูล</div>
                ) : (
                  <div className="lead-bars">
                    {Object.entries(LEAD_LABELS).map(([key, label]) => {
                      const count = heatmapData[key as keyof LeadHeatmap] ?? 0
                      const maxCount = Math.max(...Object.values(heatmapData), 1)
                      return (
                        <LeadBar
                          key={key}
                          label={label}
                          count={count}
                          maxCount={maxCount}
                          color={LEAD_COLORS[key]}
                          bg={LEAD_BG[key]}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sales Performance */}
            {activeTab === 'sales' && (
              <div className="report-section">
                <h2>ผลการขาย — Sales Performance</h2>
                {salesData.length === 0 ? (
                  <div className="empty-state">ไม่มีข้อมูล</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>เซลล์</th>
                        <th>ดีลทั้งหมด</th>
                        <th>ชนะดีล</th>
                        <th>มูลค่ารวม (บาท)</th>
                        <th>Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((row) => (
                        <tr key={row.salesRepId}>
                          <td>{row.salesRepName}</td>
                          <td>{formatCount(row.totalDeals)}</td>
                          <td>{formatCount(row.dealsWon)}</td>
                          <td>{formatCurrency(row.totalValue)}</td>
                          <td>{row.winRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Coverage Gaps */}
            {activeTab === 'gaps' && (
              <div className="report-section">
                <h2>ลูกค้าที่ยังไม่ได้รับการติดต่อ — Coverage Gaps</h2>
                {gapsData.length === 0 ? (
                  <div className="empty-state">ไม่มีข้อมูล</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>ลูกค้า</th>
                        <th>Segment</th>
                        <th>เซลล์ที่ดูแล</th>
                        <th>วันที่ไม่ได้รับการติดต่อ (วัน)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gapsData.map((row) => (
                        <tr key={row.customerId}>
                          <td>{row.customerName}</td>
                          <td>
                            <span className={`badge badge-segment-${row.segment.toLowerCase()}`}>
                              {row.segment}
                            </span>
                          </td>
                          <td>{row.salesRepName}</td>
                          <td>
                            <span className="days-overdue">{row.daysOverdue}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Team Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div className="report-section">
                <h2>การจัดอันดับทีม — Team Leaderboard</h2>
                {leaderboard.length === 0 ? (
                  <div className="empty-state">ไม่มีข้อมูล</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>อันดับ</th>
                        <th>เซลล์</th>
                        <th>เขต</th>
                        <th>Visit สำเร็จ</th>
                        <th>Call สำเร็จ</th>
                        <th>ดีลชนะ</th>
                        <th>คะแนนรวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row, idx) => (
                        <tr key={row.salesRepId}>
                          <td>
                            {idx < 3 ? (
                              <span className={`rank-badge rank-${idx + 1}`}>
                                {idx + 1}
                              </span>
                            ) : (
                              idx + 1
                            )}
                          </td>
                          <td>{row.salesRepName}</td>
                          <td>{row.territory ?? '—'}</td>
                          <td>{formatCount(row.visitCompleted)}</td>
                          <td>{formatCount(row.callCompleted)}</td>
                          <td>{formatCount(row.dealsWon)}</td>
                          <td className="score-cell">{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
