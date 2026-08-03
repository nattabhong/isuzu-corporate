import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Phone, Plus, AlertCircle, RefreshCw,
} from 'lucide-react'
import { CallForm, type CallFormData } from '../components/CallForm'
import { api, fetchCustomers, fetchTeamMembers } from '../lib/api'
import type { Customer, CallPlan, TeamMember } from '@sala-corporate/shared'

// ── Types ──

interface CallPlanRow extends CallPlan {
  customerName: string
  salesRepName: string
}

// ── Status config ──

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: { label: 'ตามแผน', className: 'badge-planned' },
  completed: { label: 'สำเร็จ', className: 'badge-completed' },
  missed: { label: 'พลาด', className: 'badge-missed' },
}

const PURPOSE_LABELS: Record<string, string> = {
  check_in: 'เช็คอิน',
  offer: 'เสนอขาย',
  follow_up: 'ติดตาม',
  reminder: 'แจ้งเตือน',
}

// ── Date formatting ──

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

// ── Component ──

export function CallPlanner() {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const [month, setMonth] = useState(currentMonth)
  const [plans, setPlans] = useState<CallPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)

  const [salesRepFilter, setSalesRepFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined)

  // ── Fetch call plans ──

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = month ? `?month=${month}` : ''
      const res = await api.get<{ success: boolean; data: CallPlanRow[]; error?: string }>(`/api/call-plans${qs}`)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch call plans')
      setPlans(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  // ── Fetch customers and team for form ──

  useEffect(() => {
    if (!showForm) return
    setLoadingCustomers(true)
    setLoadingTeam(true)
    Promise.all([
      fetchCustomers().then(setCustomers).catch(() => {}),
      fetchTeamMembers().then((tm: TeamMember[]) => setTeamMembers(tm.map((t) => ({ id: t.id, name: t.name })))).catch(() => {}),
    ]).finally(() => {
      setLoadingCustomers(false)
      setLoadingTeam(false)
    })
  }, [showForm])

  // ── Filters ──

  const uniqueReps = [...new Set(plans.filter((p) => p.salesRepName).map((p) => p.salesRepName))]

  const filteredPlans = plans.filter((p) => {
    if (salesRepFilter && p.salesRepName !== salesRepFilter) return false
    return true
  })

  // ── Actions ──

  const handleNewCall = () => {
    setSelectedPlanId(undefined)
    setShowForm(true)
  }

  const handleRowClick = (plan: CallPlanRow) => {
    setSelectedPlanId(plan.id)
    setShowForm(true)
  }

  const handleSave = async (data: CallFormData): Promise<string | undefined> => {
    const res = await api.post<{ success: boolean; data: { id: string }; error?: string }>('/api/call-logs', data)
    if (!res.success) throw new Error(res.error || 'Failed to save call log')
    setShowForm(false)
    loadPlans()
    return res.data?.id
  }

  // ── Generate plans (manager) ──

  const handleGenerate = async () => {
    if (!month) return
    try {
      const res = await api.post<{ success: boolean; data: unknown[] }>('/api/call-plans/generate', { month })
      if (res.success) {
        loadPlans()
      }
    } catch {
      // silently fail
    }
  }

  // ── Render ──

  return (
    <div className="page">
      <div className="page-header">
        <h1>แผนการโทร</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button type="button" className="btn btn-outline" onClick={handleGenerate} title="Generate call plans for all active customers">
            <RefreshCw size={16} />
            <span>Generate</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleNewCall}>
            <Plus size={18} />
            <span>บันทึกการโทร</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar panel">
        <div className="filter-group">
          <label htmlFor="month-filter">
            <Calendar size={16} />
            <span>เดือน</span>
          </label>
          <input
            id="month-filter"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        {uniqueReps.length > 0 && (
          <div className="filter-group">
            <label htmlFor="rep-filter">เซลล์</label>
            <select
              id="rep-filter"
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {uniqueReps.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container panel">
        {loading ? (
          <div className="empty-state">
            <p>กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#C62828' }}>
            <AlertCircle size={32} />
            <p>{error}</p>
            <button type="button" className="btn-primary" onClick={loadPlans}>
              ลองใหม่
            </button>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="empty-state">
            <Phone size={48} />
            <p>ไม่มีแผนการโทรในเดือนนี้</p>
            <button type="button" className="btn-primary" onClick={handleNewCall}>
              <Plus size={16} />
              <span>บันทึกการโทร</span>
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>วันที่</th>
                <th>วัตถุประสงค์</th>
                <th>เซลล์</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => {
                const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planned
                const rowClass = `row-${plan.status}`

                return (
                  <tr
                    key={plan.id}
                    className={`${rowClass} clickable-row`}
                    onClick={() => handleRowClick(plan)}
                  >
                    <td className="td-customer">{plan.customerName}</td>
                    <td>{formatThaiDate(plan.plannedDate)}</td>
                    <td>{PURPOSE_LABELS[plan.callPurpose] || plan.callPurpose}</td>
                    <td className="text-muted">{plan.salesRepName}</td>
                    <td>
                      <span className={`status-badge ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Call Form Modal */}
      {showForm && (
        <CallForm
          customers={customers}
          teamMembers={teamMembers}
          callPlanId={selectedPlanId}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setSelectedPlanId(undefined)
          }}
          loadingCustomers={loadingCustomers}
          loadingTeam={loadingTeam}
        />
      )}
    </div>
  )
}
