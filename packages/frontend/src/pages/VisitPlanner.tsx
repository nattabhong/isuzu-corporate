import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Sparkles } from 'lucide-react'
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
  const [plans, setPlans] = useState<VisitPlanRow[]>(initialPlans)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [salesRepFilter, setSalesRepFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<VisitPlanRow | null>(null)
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

  const handleOpenNewForm = () => {
    setSelectedPlan(null)
    setShowForm(true)
  }

  const handleRowClick = (plan: VisitPlanRow) => {
    setSelectedPlan(plan)
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
          <button type="button" className="btn-primary" onClick={handleOpenNewForm}>
            <Plus size={18} />
            <span>บันทึก Visit</span>
          </button>
        </div>
      </div>

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

        {userRole === 'manager' && (
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

      <div className="table-container panel">
        {filteredPlans.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>ไม่มีแผนการเข้าพบในเดือนนี้</p>
            <button type="button" className="btn-primary" onClick={handleOpenNewForm}>
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

      {showForm && (
        <VisitForm
          customers={customers}
          initialData={
            selectedPlan
              ? {
                  customerId: selectedPlan.customerId,
                  visitDate: selectedPlan.plannedDate,
                }
              : undefined
          }
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setSelectedPlan(null)
          }}
        />
      )}
    </div>
  )
}
