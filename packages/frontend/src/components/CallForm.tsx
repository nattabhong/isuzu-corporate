import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  X, Plus, Trash2, Phone, Building2, User, Calendar, Clock,
  Truck, Wrench, ShoppingCart, Users, Briefcase, FileText,
  ChevronRight, AlertCircle
} from 'lucide-react'
import type { Customer } from '@sala-corporate/shared'
import {
  USAGE_TYPES, MAIN_PROBLEMS, KEY_FACTORS, INTERESTED_SERVICES,
  NEXT_ACTIONS, INTERESTED_MODELS, PURCHASE_PURPOSES, LEAD_LEVELS,
  LEAD_LEVEL_LABELS, SERVICE_LOCATIONS, PURCHASE_TIMELINES,
} from '@sala-corporate/shared'

// ── Types ──

export interface DecisionMakerEntry {
  role: string
  namePosition: string
}

export interface CallFormData {
  // Section 1
  customerId: string
  callPlanId?: string
  contactName: string
  contactPosition: string
  contactPhone: string
  contactLineEmail: string
  callDate: string
  callTime: string
  notConvenient: boolean
  callbackDate: string
  callbackTime: string
  durationMinutes: number
  // Section 3
  fleetIsuzuCount: number
  fleetOtherCount: number
  fleetPickup: number
  fleetTruck: number
  fleetSuv: number
  usageTypes: string[]
  // Section 4
  usageStatusNotes: string
  hasProblemVehicles: boolean
  problemCount: number
  problemDetails: string
  serviceLocation: string
  serviceReason: string
  mainProblems: string[]
  // Section 5
  purchaseTimeline: string
  expectedQuantity: number
  interestedModels: string[]
  purchasePurpose: string[]
  // Section 6
  decisionMakers: DecisionMakerEntry[]
  keyFactors: string[]
  // Section 7
  interestedServices: string[]
  // Section 8
  leadLevel: string
  customerNeeds: string
  problemsFound: string
  businessOpportunities: string[]
  // Section 9
  nextActions: string[]
  nextActionOwner: string
  nextActionDate: string
  nextActionDetails: string
}

export interface CallFormProps {
  customers: Customer[]
  teamMembers: { id: string; name: string }[]
  callPlanId?: string
  initialData?: Partial<CallFormData>
  onSave: (data: CallFormData) => Promise<string | undefined> // returns callLogId on success
  onClose: () => void
  loadingCustomers?: boolean
  loadingTeam?: boolean
}

// ── Defaults ──

function defaultForm(): CallFormData {
  return {
    customerId: '',
    callPlanId: undefined,
    contactName: '',
    contactPosition: '',
    contactPhone: '',
    contactLineEmail: '',
    callDate: '',
    callTime: '',
    notConvenient: false,
    callbackDate: '',
    callbackTime: '',
    durationMinutes: 0,
    fleetIsuzuCount: 0,
    fleetOtherCount: 0,
    fleetPickup: 0,
    fleetTruck: 0,
    fleetSuv: 0,
    usageTypes: [],
    usageStatusNotes: '',
    hasProblemVehicles: false,
    problemCount: 0,
    problemDetails: '',
    serviceLocation: '',
    serviceReason: '',
    mainProblems: [],
    purchaseTimeline: '',
    expectedQuantity: 0,
    interestedModels: [],
    purchasePurpose: [],
    decisionMakers: [],
    keyFactors: [],
    interestedServices: [],
    leadLevel: '',
    customerNeeds: '',
    problemsFound: '',
    businessOpportunities: [],
    nextActions: [],
    nextActionOwner: '',
    nextActionDate: '',
    nextActionDetails: '',
  }
}

// ── Labels ──

const SERVICE_LOCATION_LABELS: Record<string, string> = {
  chiangmai: 'ศาลาเชียงใหม่',
  other_isuzu: 'ศูนย์อีซูซุอื่น',
  outside: 'อู่นอก',
  self: 'ดูแลเอง',
  unknown: 'ไม่ทราบ',
}

const PURCHASE_TIMELINE_LABELS: Record<string, string> = {
  '3m': 'ภายใน 3 เดือน',
  '6m': 'ภายใน 6 เดือน',
  '12m': 'ภายใน 12 เดือน',
  '1-2y': '1–2 ปี',
  none: 'ยังไม่มีแผน',
  unsure: 'ยังไม่แน่ใจ',
}

const LEAD_LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  hot: { bg: '#FFEBEE', text: '#C62828' },
  warm: { bg: '#FFF3E0', text: '#E65100' },
  future: { bg: '#E3F2FD', text: '#1565C0' },
  maintain: { bg: '#E8F5E9', text: '#2E7D32' },
  inactive: { bg: '#F5F5F5', text: '#757575' },
}

// ── Component ──

export function CallForm({
  customers,
  teamMembers,
  callPlanId,
  initialData,
  onSave,
  onClose,
  loadingCustomers = false,
  loadingTeam = false,
}: CallFormProps) {
  const [form, setForm] = useState<CallFormData>(() => ({
    ...defaultForm(),
    ...initialData,
    callPlanId: callPlanId || initialData?.callPlanId,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(1)
  const [script, setScript] = useState<{ opening: string; closing: string } | null>(null)
  const [loadingScript, setLoadingScript] = useState(false)

  // ── Helpers ──

  const fleetTotal = useMemo(() => {
    return form.fleetIsuzuCount + form.fleetOtherCount
  }, [form.fleetIsuzuCount, form.fleetOtherCount])

  const set = (field: keyof CallFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const num = (field: keyof CallFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    set(field, isNaN(val) ? 0 : val)
  }

  const str = (field: keyof CallFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    set(field, e.target.value)
  }

  const chk = (field: keyof CallFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(field, e.target.checked)
  }

  const toggleArray = (field: keyof CallFormData, value: string) => {
    setForm((prev) => {
      const arr = (prev[field] as string[]) || []
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) }
      }
      return { ...prev, [field]: [...arr, value] }
    })
  }

  const toggleArrayMax = (field: keyof CallFormData, value: string, max: number) => {
    setForm((prev) => {
      const arr = (prev[field] as string[]) || []
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) }
      }
      if (arr.length >= max) return prev
      return { ...prev, [field]: [...arr, value] }
    })
  }

  const addDecisionMaker = () => {
    setForm((prev) => ({
      ...prev,
      decisionMakers: [...prev.decisionMakers, { role: '', namePosition: '' }],
    }))
  }

  const updateDecisionMaker = (index: number, field: keyof DecisionMakerEntry, value: string) => {
    setForm((prev) => {
      const updated = [...prev.decisionMakers]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, decisionMakers: updated }
    })
  }

  const removeDecisionMaker = (index: number) => {
    setForm((prev) => ({
      ...prev,
      decisionMakers: prev.decisionMakers.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate Section 9: at least 1 next action
    if (form.nextActions.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 รายการในส่วน "ขั้นตอนถัดไป" (ส่วนที่ 9)')
      setActiveSection(9)
      return
    }

    setSaving(true)
    try {
      const callLogId = await onSave(form)
      if (callLogId) {
        // Fetch script
        setLoadingScript(true)
        try {
          const res = await fetch(`/api/call-logs/${callLogId}/script`)
          const data = await res.json()
          if (data.success && data.data) {
            setScript(data.data)
            setActiveSection(10)
          }
        } catch {
          // script is optional
        } finally {
          setLoadingScript(false)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  // ── Section navigation ──

  const sections = [
    { id: 1, label: 'ข้อมูลลูกค้า', icon: <Building2 size={14} /> },
    { id: 3, label: 'อัปเดตข้อมูลรถ', icon: <Truck size={14} /> },
    { id: 4, label: 'สถานะการใช้งานรถ', icon: <Wrench size={14} /> },
    { id: 5, label: 'แผนเพิ่ม/เปลี่ยนรถ', icon: <ShoppingCart size={14} /> },
    { id: 6, label: 'กระบวนการตัดสินใจ', icon: <Users size={14} /> },
    { id: 7, label: 'บริการที่สนใจ', icon: <Briefcase size={14} /> },
    { id: 8, label: 'สรุปผล', icon: <FileText size={14} /> },
    { id: 9, label: 'ขั้นตอนถัดไป', icon: <ChevronRight size={14} /> },
    { id: 10, label: 'Script Preview', icon: <Phone size={14} /> },
  ]

  const activeLabel = sections.find((s) => s.id === activeSection)?.label || ''

  // ── Render ──

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="call-form-panel panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">บันทึกการโทร</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="call-form-tabs">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`call-form-tab ${activeSection === s.id ? 'call-form-tab-active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="call-form-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <form className="call-form-body" onSubmit={handleSubmit} id="call-form">
          {/* ── Section 1: ข้อมูลลูกค้า ── */}
          {activeSection === 1 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 1: ข้อมูลลูกค้า</h3>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="customerId">บริษัท <span className="call-form-required">*</span></label>
                  {loadingCustomers ? (
                    <select disabled><option>กำลังโหลด...</option></select>
                  ) : (
                    <select
                      id="customerId"
                      value={form.customerId}
                      onChange={str('customerId')}
                      required
                    >
                      <option value="">-- เลือกบริษัท --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="contactName">ชื่อผู้ติดต่อ <span className="call-form-required">*</span></label>
                  <input id="contactName" type="text" value={form.contactName} onChange={str('contactName')} required placeholder="ชื่อ-นามสกุล" />
                </div>

                <div className="form-group">
                  <label htmlFor="contactPosition">ตำแหน่ง</label>
                  <input id="contactPosition" type="text" value={form.contactPosition} onChange={str('contactPosition')} placeholder="ตำแหน่ง" />
                </div>

                <div className="form-group">
                  <label htmlFor="contactPhone">เบอร์โทร</label>
                  <input id="contactPhone" type="text" value={form.contactPhone} onChange={str('contactPhone')} placeholder="0XX-XXX-XXXX" />
                </div>

                <div className="form-group">
                  <label htmlFor="contactLineEmail">LINE / Email</label>
                  <input id="contactLineEmail" type="text" value={form.contactLineEmail} onChange={str('contactLineEmail')} placeholder="LINE ID หรือ Email" />
                </div>

                <div className="form-group">
                  <label htmlFor="callDate">วันที่โทร <span className="call-form-required">*</span></label>
                  <input id="callDate" type="date" value={form.callDate} onChange={str('callDate')} required />
                </div>

                <div className="form-group">
                  <label htmlFor="callTime">เวลา</label>
                  <input id="callTime" type="time" value={form.callTime} onChange={str('callTime')} />
                </div>

                <div className="form-group">
                  <label htmlFor="durationMinutes">ระยะเวลา (นาที)</label>
                  <input id="durationMinutes" type="number" value={form.durationMinutes} onChange={num('durationMinutes')} min={0} />
                </div>

                <div className="form-group full-width">
                  <label className="form-check">
                    <input
                      type="checkbox"
                      checked={form.notConvenient}
                      onChange={chk('notConvenient')}
                    />
                    <span>ลูกค้าไม่สะดวก</span>
                  </label>
                </div>

                {form.notConvenient && (
                  <>
                    <div className="form-group">
                      <label htmlFor="callbackDate">วันที่นัดโทรกลับ</label>
                      <input id="callbackDate" type="date" value={form.callbackDate} onChange={str('callbackDate')} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="callbackTime">เวลานัดโทรกลับ</label>
                      <input id="callbackTime" type="time" value={form.callbackTime} onChange={str('callbackTime')} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Section 3: อัปเดตข้อมูลรถ ── */}
          {activeSection === 3 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 3: อัปเดตข้อมูลรถ</h3>

              <div className="call-form-subsection">
                <h4>จำนวนรถใน Fleet</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="fleetIsuzuCount">อีซูซุ</label>
                    <input id="fleetIsuzuCount" type="number" value={form.fleetIsuzuCount} onChange={num('fleetIsuzuCount')} min={0} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fleetOtherCount">ยี่ห้ออื่น</label>
                    <input id="fleetOtherCount" type="number" value={form.fleetOtherCount} onChange={num('fleetOtherCount')} min={0} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fleetPickup">กระบะ</label>
                    <input id="fleetPickup" type="number" value={form.fleetPickup} onChange={num('fleetPickup')} min={0} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fleetTruck">บรรทุก</label>
                    <input id="fleetTruck" type="number" value={form.fleetTruck} onChange={num('fleetTruck')} min={0} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fleetSuv">SUV</label>
                    <input id="fleetSuv" type="number" value={form.fleetSuv} onChange={num('fleetSuv')} min={0} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fleetTotal">รวมทั้งหมด</label>
                    <input id="fleetTotal" type="number" value={fleetTotal} disabled className="call-form-disabled" />
                  </div>
                </div>
              </div>

              <div className="call-form-subsection">
                <h4>ประเภทการใช้งาน</h4>
                <div className="call-form-checks">
                  {USAGE_TYPES.map((t) => (
                    <label key={t} className="form-check">
                      <input
                        type="checkbox"
                        checked={form.usageTypes.includes(t)}
                        onChange={() => toggleArray('usageTypes', t)}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 4: สถานะการใช้งานรถ ── */}
          {activeSection === 4 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 4: สถานะการใช้งานรถ</h3>

              <div className="form-group full-width">
                <label htmlFor="usageStatusNotes">บันทึกสถานะการใช้งาน</label>
                <textarea
                  id="usageStatusNotes"
                  rows={3}
                  value={form.usageStatusNotes}
                  onChange={str('usageStatusNotes')}
                  placeholder="รถใช้งานปกติทุกคัน / รถบางคันเริ่มเก่า / ต้องการขยาย Fleet..."
                />
              </div>

              <div className="form-group full-width">
                <label className="form-check">
                  <input
                    type="checkbox"
                    checked={form.hasProblemVehicles}
                    onChange={chk('hasProblemVehicles')}
                  />
                  <span>มีรถเริ่มมีปัญหา</span>
                </label>
              </div>

              {form.hasProblemVehicles && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="problemCount">จำนวนรถที่มีปัญหา</label>
                      <input id="problemCount" type="number" value={form.problemCount} onChange={num('problemCount')} min={0} />
                    </div>
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="problemDetails">รายละเอียดปัญหา</label>
                    <textarea
                      id="problemDetails"
                      rows={2}
                      value={form.problemDetails}
                      onChange={str('problemDetails')}
                      placeholder="อธิบายอาการและปัญหา..."
                    />
                  </div>
                </>
              )}

              <div className="call-form-subsection">
                <h4>สถานที่เข้ารับบริการ</h4>
                <div className="call-form-radio-group">
                  {SERVICE_LOCATIONS.map((loc) => (
                    <label key={loc} className={`call-form-radio ${form.serviceLocation === loc ? 'call-form-radio-selected' : ''}`}>
                      <input
                        type="radio"
                        name="serviceLocation"
                        value={loc}
                        checked={form.serviceLocation === loc}
                        onChange={str('serviceLocation')}
                      />
                      <span>{SERVICE_LOCATION_LABELS[loc]}</span>
                    </label>
                  ))}
                </div>
                {form.serviceLocation && form.serviceLocation !== 'chiangmai' && (
                  <div className="form-group full-width" style={{ marginTop: 'var(--space-md)' }}>
                    <label htmlFor="serviceReason">เหตุผล</label>
                    <input id="serviceReason" type="text" value={form.serviceReason} onChange={str('serviceReason')} placeholder="ระบุเหตุผลที่เลือก..." />
                  </div>
                )}
              </div>

              <div className="call-form-subsection">
                <h4>ปัญหาหลักที่พบ</h4>
                <div className="call-form-checks">
                  {MAIN_PROBLEMS.map((p) => (
                    <label key={p} className="form-check">
                      <input
                        type="checkbox"
                        checked={form.mainProblems.includes(p)}
                        onChange={() => toggleArray('mainProblems', p)}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 5: แผนเพิ่ม/เปลี่ยนรถ ── */}
          {activeSection === 5 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 5: แผนเพิ่ม/เปลี่ยนรถ</h3>

              <div className="call-form-subsection">
                <h4>ระยะเวลาแผนซื้อ</h4>
                <div className="call-form-radio-group">
                  {PURCHASE_TIMELINES.map((tl) => (
                    <label key={tl} className={`call-form-radio ${form.purchaseTimeline === tl ? 'call-form-radio-selected' : ''}`}>
                      <input
                        type="radio"
                        name="purchaseTimeline"
                        value={tl}
                        checked={form.purchaseTimeline === tl}
                        onChange={str('purchaseTimeline')}
                      />
                      <span>{PURCHASE_TIMELINE_LABELS[tl]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ maxWidth: 200 }}>
                <label htmlFor="expectedQuantity">จำนวนที่คาดว่าจะซื้อ</label>
                <input id="expectedQuantity" type="number" value={form.expectedQuantity} onChange={num('expectedQuantity')} min={0} />
              </div>

              <div className="call-form-subsection">
                <h4>รุ่นที่สนใจ</h4>
                <div className="call-form-checks">
                  {INTERESTED_MODELS.map((m) => (
                    <label key={m} className="form-check">
                      <input
                        type="checkbox"
                        checked={form.interestedModels.includes(m)}
                        onChange={() => toggleArray('interestedModels', m)}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="call-form-subsection">
                <h4>วัตถุประสงค์ในการซื้อ</h4>
                <div className="call-form-checks">
                  {PURCHASE_PURPOSES.map((p) => (
                    <label key={p} className="form-check">
                      <input
                        type="checkbox"
                        checked={form.purchasePurpose.includes(p)}
                        onChange={() => toggleArray('purchasePurpose', p)}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 6: กระบวนการตัดสินใจ ── */}
          {activeSection === 6 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 6: กระบวนการตัดสินใจ</h3>

              <div className="call-form-subsection">
                <div className="call-form-dm-header">
                  <h4>ผู้มีอำนาจตัดสินใจ</h4>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addDecisionMaker}>
                    <Plus size={14} />
                    <span>เพิ่ม</span>
                  </button>
                </div>

                {form.decisionMakers.length === 0 ? (
                  <p className="call-form-hint">ยังไม่มีรายชื่อผู้ตัดสินใจ</p>
                ) : (
                  <table className="call-form-dm-table">
                    <thead>
                      <tr>
                        <th>บทบาท</th>
                        <th>ชื่อ / ตำแหน่ง</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.decisionMakers.map((dm, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={dm.role}
                              onChange={(e) => updateDecisionMaker(i, 'role', e.target.value)}
                              placeholder="เช่น CEO, GM"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={dm.namePosition}
                              onChange={(e) => updateDecisionMaker(i, 'namePosition', e.target.value)}
                              placeholder="ชื่อและตำแหน่ง"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger"
                              onClick={() => removeDecisionMaker(i)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="call-form-subsection">
                <h4>ปัจจัยสำคัญในการตัดสินใจ <span className="call-form-hint">(เลือกได้ไม่เกิน 3 ข้อ)</span></h4>
                <div className="call-form-checks">
                  {KEY_FACTORS.map((f) => {
                    const isSelected = form.keyFactors.includes(f)
                    const isDisabled = !isSelected && form.keyFactors.length >= 3
                    return (
                      <label
                        key={f}
                        className={`form-check ${isDisabled ? 'call-form-check-disabled' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleArrayMax('keyFactors', f, 3)}
                        />
                        <span>{f}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 7: บริการที่สนใจ ── */}
          {activeSection === 7 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 7: บริการที่สนใจ</h3>
              <div className="call-form-checks">
                {INTERESTED_SERVICES.map((s) => (
                  <label key={s} className="form-check">
                    <input
                      type="checkbox"
                      checked={form.interestedServices.includes(s)}
                      onChange={() => toggleArray('interestedServices', s)}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 'var(--space-md)' }}>
                <label className="form-check">
                  <input
                    type="checkbox"
                    checked={form.interestedServices.includes('ยังไม่สนใจ')}
                    onChange={() => toggleArray('interestedServices', 'ยังไม่สนใจ')}
                  />
                  <span>ยังไม่สนใจ</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Section 8: สรุปผล ── */}
          {activeSection === 8 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 8: สรุปผล</h3>

              <div className="call-form-subsection">
                <h4>ระดับ Lead</h4>
                <div className="call-form-lead-buttons">
                  {LEAD_LEVELS.map((level) => {
                    const colors = LEAD_LEVEL_COLORS[level]
                    const isSelected = form.leadLevel === level
                    return (
                      <button
                        key={level}
                        type="button"
                        className={`call-form-lead-btn ${isSelected ? 'call-form-lead-btn-selected' : ''}`}
                        style={isSelected ? {
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: colors.text,
                        } : {}}
                        onClick={() => set('leadLevel', isSelected ? '' : level)}
                      >
                        {LEAD_LEVEL_LABELS[level]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="customerNeeds">ความต้องการของลูกค้า</label>
                <textarea
                  id="customerNeeds"
                  rows={3}
                  value={form.customerNeeds}
                  onChange={str('customerNeeds')}
                  placeholder="สรุปความต้องการหลักของลูกค้า..."
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="problemsFound">ปัญหาที่พบ</label>
                <textarea
                  id="problemsFound"
                  rows={3}
                  value={form.problemsFound}
                  onChange={str('problemsFound')}
                  placeholder="ปัญหาที่พบระหว่างการพูดคุย..."
                />
              </div>

              <div className="call-form-subsection">
                <h4>โอกาสทางธุรกิจ</h4>
                <div className="call-form-checks">
                  {[
                    'รถใหม่', 'รถมือสอง', 'งานซ่อม', 'สัญญา Fleet',
                    'ประกันภัย', 'สินเชื่อ', 'อุปกรณ์ตกแต่ง',
                  ].map((opp) => (
                    <label key={opp} className="form-check">
                      <input
                        type="checkbox"
                        checked={form.businessOpportunities.includes(opp)}
                        onChange={() => toggleArray('businessOpportunities', opp)}
                      />
                      <span>{opp}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 9: ขั้นตอนถัดไป ── */}
          {activeSection === 9 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">
                ส่วนที่ 9: ขั้นตอนถัดไป <span className="call-form-required">*</span>
                <span className="call-form-hint"> (ต้องมีอย่างน้อย 1 รายการ)</span>
              </h3>

              <div className="call-form-subsection">
                <div className={`call-form-checks ${form.nextActions.length === 0 ? 'call-form-required-border' : ''}`}>
                  {NEXT_ACTIONS.map((a) => (
                    <label key={a} className="form-check">
                      <input
                        type="checkbox"
                        checked={form.nextActions.includes(a)}
                        onChange={() => toggleArray('nextActions', a)}
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label htmlFor="nextActionOwner">ผู้รับผิดชอบ</label>
                  {loadingTeam ? (
                    <select id="nextActionOwner" disabled><option>กำลังโหลด...</option></select>
                  ) : (
                    <select
                      id="nextActionOwner"
                      value={form.nextActionOwner}
                      onChange={str('nextActionOwner')}
                    >
                      <option value="">-- เลือกผู้รับผิดชอบ --</option>
                      {teamMembers.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="nextActionDate">กำหนดวันที่</label>
                  <input id="nextActionDate" type="date" value={form.nextActionDate} onChange={str('nextActionDate')} />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="nextActionDetails">รายละเอียด</label>
                  <textarea
                    id="nextActionDetails"
                    rows={2}
                    value={form.nextActionDetails}
                    onChange={str('nextActionDetails')}
                    placeholder="รายละเอียดเพิ่มเติม..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Section 10: Script Preview ── */}
          {activeSection === 10 && (
            <div className="call-form-section">
              <h3 className="call-form-section-title">ส่วนที่ 10: Script ตัวอย่าง</h3>

              {loadingScript ? (
                <div className="empty-state">
                  <p>กำลังสร้าง script...</p>
                </div>
              ) : script ? (
                <div className="call-form-script">
                  <div className="call-form-script-block">
                    <h4>บทเปิด (Opening)</h4>
                    <pre>{script.opening}</pre>
                  </div>
                  <div className="call-form-script-block">
                    <h4>บทปิด (Closing)</h4>
                    <pre>{script.closing}</pre>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <FileText size={48} />
                  <p>บันทึกข้อมูลก่อน แล้วกดบันทึกเพื่อดู Script ตัวอย่าง</p>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <div className="call-form-section-nav">
              {activeSection > 1 && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === activeSection)
                    if (idx > 0) setActiveSection(sections[idx - 1].id)
                  }}
                >
                  ก่อนหน้า
                </button>
              )}
              {activeSection < 10 && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === activeSection)
                    if (idx < sections.length - 1) setActiveSection(sections[idx + 1].id)
                  }}
                >
                  ถัดไป
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
