import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { api } from '../lib/api'

interface Deal {
  id: string
  customer_id: string
  customer_name: string
  sales_rep_id: string
  sales_rep_name: string
  vehicle_model: string
  quantity: number
  expected_amount: number | null
  stage: string
  notes: string | null
  expected_close_date: string | null
  won_amount: number | null
  created_at: string
  updated_at: string
  source_call_log_id: string | null
  source_visit_log_id: string | null
}

interface TeamMember {
  id: string
  name: string
  role: string
}

interface Customer {
  id: string
  name: string
}

const STAGES: { key: string; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'visit_done', label: 'Visit Done' },
  { key: 'quote_sent', label: 'Quote Sent' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]

const ISUZU_MODELS = [
  'D-Max 1.9 S', 'D-Max 1.9 L', 'D-Max 3.0 S', 'D-Max 3.0 L',
  'MU-X 1.9', 'MU-X 3.0',
  'ELF', 'FORWARD', 'GIGA',
]

function formatCurrency(value: number | null): string {
  if (value == null) return '฿0'
  return '฿' + value.toLocaleString('en-US')
}

interface DealsProps {
  userRole?: string
}

export function Deals({ userRole }: DealsProps = {}) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [repFilter, setRepFilter] = useState<string>('')
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formModel, setFormModel] = useState(ISUZU_MODELS[0])
  const [formQuantity, setFormQuantity] = useState(1)
  const [formAmount, setFormAmount] = useState('')
  const [formCloseDate, setFormCloseDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchDeals = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Deal[] }>('/api/deals')
      if (res.success && res.data) {
        setDeals(res.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: TeamMember[] }>('/api/team')
      if (res.success && res.data) {
        setTeamMembers(res.data)
      }
    } catch {
      // Optional — team filter is manager-only
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Customer[] }>('/api/customers')
      if (res.success && res.data) {
        setCustomers(res.data)
      }
    } catch {
      // Optional
    }
  }, [])

  useEffect(() => {
    fetchDeals()
    fetchTeamMembers()
    fetchCustomers()
  }, [fetchDeals, fetchTeamMembers, fetchCustomers])

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
    e.dataTransfer.effectAllowed = 'move'
    const el = e.currentTarget as HTMLElement
    el.classList.add('dragging')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.classList.remove('dragging')
    setDragOverStage(null)
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    setDragOverStage(null)

    const dealId = e.dataTransfer.getData('text/plain')
    if (!dealId) return

    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === stage) return

    try {
      await api.patch(`/api/deals/${dealId}/stage`, { stage })
      // Optimistic update
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage } : d))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move deal')
    }
  }

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError(null)

    try {
      const body: Record<string, unknown> = {
        customerId: formCustomerId,
        vehicleModel: formModel,
        quantity: formQuantity,
      }
      if (formAmount) body.expectedAmount = Number(formAmount)
      if (formCloseDate) body.expectedCloseDate = formCloseDate
      if (formNotes) body.notes = formNotes

      const res = await api.post<{ success: boolean; data: Deal }>('/api/deals', body)
      if (res.success && res.data) {
        setShowModal(false)
        resetForm()
        // Refetch to get joined data
        fetchDeals()
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create deal')
    } finally {
      setFormSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormCustomerId('')
    setFormModel(ISUZU_MODELS[0])
    setFormQuantity(1)
    setFormAmount('')
    setFormCloseDate('')
    setFormNotes('')
    setFormError(null)
  }

  const filteredDeals = repFilter
    ? deals.filter((d) => d.sales_rep_id === repFilter)
    : deals

  const dealsByStage = (stage: string): Deal[] =>
    filteredDeals.filter((d) => d.stage === stage)

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Pipeline ดีล</h1>
        </div>
        <div className="empty-state">
          <p>กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Pipeline ดีล</h1>
        <button className="btn-primary" onClick={() => { fetchCustomers(); setShowModal(true) }}>
          <Plus size={16} />
          สร้าง Deal
        </button>
      </div>

      {error && (
        <div className="panel" style={{ padding: '12px 16px', marginBottom: '16px', color: '#C62828', background: '#FFEBEE', border: '1px solid #EF9A9A' }}>
          {error}
        </div>
      )}

      {userRole === 'manager' && (
        <div className="filters-bar panel" style={{ marginBottom: '16px' }}>
          <div className="filter-group">
            <label>เซลล์</label>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {teamMembers
                .filter((m) => m.role === 'sales_rep')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {STAGES.map((stage) => {
          const stageDeals = dealsByStage(stage.key)
          return (
            <div key={stage.key} className="kanban-column">
              <div className="kanban-column-header">
                <h3>{stage.label}</h3>
                <span className="kanban-column-count">{stageDeals.length}</span>
              </div>
              <div
                className={`kanban-column-body${dragOverStage === stage.key ? ' drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {stageDeals.length === 0 ? (
                  <div className="kanban-empty">ไม่มีดีล</div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={`kanban-card-bar bar-${deal.stage}`} />
                      <div className="kanban-card-body">
                        <div className="kanban-card-company">{deal.customer_name}</div>
                        <div className="kanban-card-model">
                          {deal.vehicle_model} &times; {deal.quantity}
                        </div>
                        <div className="kanban-card-value">
                          {formatCurrency(deal.expected_amount)}
                        </div>
                        <div className="kanban-card-rep">{deal.sales_rep_name}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Deal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">สร้าง Deal ใหม่</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="visit-form" onSubmit={handleCreateDeal}>
              {formError && (
                <div style={{ padding: '8px 12px', marginBottom: '12px', color: '#C62828', background: '#FFEBEE', border: '1px solid #EF9A9A', fontSize: '0.875rem' }}>
                  {formError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>ลูกค้า</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- เลือกลูกค้า --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>รุ่นรถ</label>
                  <select value={formModel} onChange={(e) => setFormModel(e.target.value)}>
                    {ISUZU_MODELS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>จำนวน</label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>มูลค่าที่คาดหวัง (฿)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>วันที่คาดว่าจะปิด</label>
                  <input
                    type="date"
                    value={formCloseDate}
                    onChange={(e) => setFormCloseDate(e.target.value)}
                  />
                </div>
                <div className="form-group full-width">
                  <label>หมายเหตุ</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-actions full-width">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'กำลังบันทึก...' : 'บันทึกดีล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
