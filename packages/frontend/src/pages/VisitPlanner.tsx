import { useState, useEffect, useCallback } from 'react'
import { Calendar as CalendarIcon, Plus, Sparkles, LayoutGrid, List } from 'lucide-react'
import { VisitForm, type VisitFormData, type CustomerOption } from '../components/VisitForm'
import { fetchVisitPlans, fetchCustomers, generateVisitPlans, createVisitLog } from '../lib/api'

export interface VisitPlanRow {
  id: string
  customerId: string
  salesRepId: string
  month: string
  plannedDate: string
  visitType: 'first_visit' | 'follow_up' | 'closing' | 'service'
  objective: string | null
  status: 'planned' | 'completed' | 'missed' | 'rescheduled'
  createdAt: string
  customerName: string
  salesRepName: string
}

interface VisitPlannerProps {
  userRole: 'admin' | 'manager' | 'sales_rep'
  initialPlans?: VisitPlanRow[]
}

const STATUS_CONFIG: Record<VisitPlanRow['status'], { label: string; className: string }> = {
  planned: { label: 'ตามแผน', className: 'badge-planned' },
  completed: { label: 'สำเร็จ', className: 'badge-completed' },
  missed: { label: 'พลาดนัด', className: 'badge-missed' },
  rescheduled: { label: 'เลื่อน', className: 'badge-rescheduled' },
}

const VISIT_TYPE_LABELS: Record<VisitPlanRow['visitType'], string> = {
  first_visit: 'เข้าเยี่ยมครั้งแรก',
  follow_up: 'ติดตาม',
  closing: 'ปิดการขาย',
  service: 'บริการ',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

export function VisitPlanner({ userRole, initialPlans = [] }: VisitPlannerProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar')
  const [plans, setPlans] = useState<VisitPlanRow[]>(initialPlans)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [salesRepFilter, setSalesRepFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<VisitPlanRow | null>(null)
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [fetchedPlans, fetchedCustomers] = await Promise.all([
        fetchVisitPlans(month).catch(() => []),
        fetchCustomers().catch(() => []),
      ])

      if (fetchedCustomers.length > 0) {
        setCustomers(fetchedCustomers.map((c) => ({ id: c.id, name: c.name })))
      }

      if (fetchedPlans.length > 0) {
        const custMap = new Map(fetchedCustomers.map((c) => [c.id, c.name]))
        const mappedPlans: VisitPlanRow[] = fetchedPlans.map((p) => ({
          id: p.id,
          customerId: p.customerId,
          salesRepId: p.salesRepId,
          month: p.month,
          plannedDate: p.plannedDate,
          visitType: (p.visitType as any) || 'follow_up',
          objective: p.objective ?? null,
          status: p.status as VisitPlanRow['status'],
          createdAt: p.createdAt,
          customerName: custMap.get(p.customerId) || 'ลูกค้าทั่วไป',
          salesRepName: 'พนักงานขาย',
        }))
        setPlans(mappedPlans)
      } else if (initialPlans.length > 0) {
        setPlans(initialPlans)
      }
    } finally {
      setLoading(false)
    }
  }, [month, initialPlans])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGeneratePlans = async () => {
    setGenerating(true)
    try {
      await generateVisitPlans(month)
      await loadData()
    } catch (err) {
      console.error('Failed to generate plans:', err)
    } finally {
      setGenerating(false)
    }
  }

  const filteredPlans = plans.filter((p) => {
    if (month && p.month !== month) return false
    if (userRole === 'manager' && salesRepFilter && p.salesRepName !== salesRepFilter) return false
    return true
  })

  const uniqueReps = [...new Set(plans.map((p) => p.salesRepName))]

  const handleOpenNewForm = (date?: string) => {
    setSelectedPlan(null)
    setPrefilledDate(date)
    setShowForm(true)
  }

  const handleRowClick = (plan: VisitPlanRow) => {
    setSelectedPlan(plan)
    setPrefilledDate(plan.plannedDate)
    setShowForm(true)
  }

  const handleSave = async (data: VisitFormData) => {
    try {
      await createVisitLog({
        visitPlanId: selectedPlan?.id,
        customerId: data.customerId,
        checkinAt: new Date().toISOString(),
        notes: data.notes,
      })
      setShowForm(false)
      setSelectedPlan(null)
      loadData()
    } catch (err) {
      console.error('Failed to save visit log:', err)
    }
  }

  // Monthly Calendar Grid calculation
  const [yearStr, monthNumStr] = month.split('-')
  const year = parseInt(yearStr, 10) || new Date().getFullYear()
  const monthIdx = (parseInt(monthNumStr, 10) || 1) - 1

  const firstDayIndex = new Date(year, monthIdx, 1).getDay() // 0 = Sun
  const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate()

  const calendarCells: Array<{ dayNum: number | null; dateStr: string | null }> = []
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ dayNum: null, dateStr: null })
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarCells.push({ dayNum: day, dateStr: dStr })
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="page">
      <div className="page-header">
        <h1>แผนการเข้าพบลูกค้า</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(userRole === 'manager' || userRole === 'admin') && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleGeneratePlans}
              disabled={generating}
            >
              <Sparkles size={16} />
              <span>{generating ? 'กำลังสร้างแผน...' : 'สร้างแผนประจำเดือนออโต้'}</span>
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => handleOpenNewForm()}>
            <Plus size={18} />
            <span>บันทึก Visit</span>
          </button>
        </div>
      </div>

      <div className="filters-bar panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="filter-group">
            <label htmlFor="month-filter">
              <CalendarIcon size={16} />
              <span>เดือน</span>
            </label>
            <input
              id="month-filter"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          {(userRole === 'manager' || userRole === 'admin') && (
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

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <LayoutGrid size={16} />
            <span>ปฏิทิน</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <List size={16} />
            <span>ตาราง</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="calendar-view-container panel">
          <div className="calendar-header-grid">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((dayName) => (
              <div key={dayName} className="calendar-header-day">
                {dayName}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarCells.map((cell, idx) => {
              if (!cell.dayNum || !cell.dateStr) {
                return <div key={`empty-${idx}`} className="calendar-day-cell empty" />
              }

              const isToday = cell.dateStr === todayStr
              const plansOnDay = filteredPlans.filter((p) => p.plannedDate.startsWith(cell.dateStr!))

              return (
                <div
                  key={cell.dateStr}
                  className={`calendar-day-cell ${isToday ? 'is-today' : ''}`}
                  onClick={() => handleOpenNewForm(cell.dateStr!)}
                >
                  <div className="calendar-day-number">{cell.dayNum}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {plansOnDay.map((plan) => (
                      <div
                        key={plan.id}
                        className={`calendar-visit-pill badge-${plan.status}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(plan)
                        }}
                        title={`${plan.customerName} - ${VISIT_TYPE_LABELS[plan.visitType]}`}
                      >
                        <strong style={{ fontSize: '0.75rem' }}>{plan.customerName}</strong>
                        <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>
                          {VISIT_TYPE_LABELS[plan.visitType]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="table-container panel">
          {filteredPlans.length === 0 ? (
            <div className="empty-state">
              <CalendarIcon size={48} />
              <p>ไม่มีแผนการเข้าพบในเดือนนี้</p>
              <button type="button" className="btn-primary" onClick={() => handleOpenNewForm()}>
                <Plus size={16} />
                <span>บันทึก Visit</span>
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ลูกค้า</th>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  {userRole === 'manager' && <th>เซลล์</th>}
                  <th>วัตถุประสงค์</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((plan) => {
                  const statusCfg = STATUS_CONFIG[plan.status]
                  const rowColorClass = `row-${plan.status}`

                  return (
                    <tr
                      key={plan.id}
                      className={`${rowColorClass} clickable-row`}
                      onClick={() => handleRowClick(plan)}
                    >
                      <td className="td-customer">{plan.customerName}</td>
                      <td>{formatDate(plan.plannedDate)}</td>
                      <td>{VISIT_TYPE_LABELS[plan.visitType]}</td>
                      {userRole === 'manager' && <td>{plan.salesRepName}</td>}
                      <td className="td-objective">
                        {plan.objective ?? <span className="text-muted">—</span>}
                      </td>
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
      )}

      {showForm && (
        <VisitForm
          customers={customers}
          initialData={
            selectedPlan
              ? {
                  customerId: selectedPlan.customerId,
                  visitDate: selectedPlan.plannedDate,
                }
              : prefilledDate
              ? {
                  customerId: customers[0]?.id || '',
                  visitDate: prefilledDate,
                }
              : undefined
          }
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setSelectedPlan(null)
            setPrefilledDate(undefined)
          }}
        />
      )}
    </div>
  )
}
