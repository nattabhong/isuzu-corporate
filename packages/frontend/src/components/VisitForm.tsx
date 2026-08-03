import { useState, type FormEvent } from 'react'
import type { ReactNode } from 'react'
import { MapPin, X } from 'lucide-react'
import { AISummarizeButton } from './AISummarizeButton'

export interface CustomerOption {
  id: string
  name: string
}

export interface VisitFormData {
  customerId: string
  visitDate: string
  startTime: string
  endTime: string
  gpsLat: string
  gpsLng: string
  notes: string
  nextStep: string
  customerMood: 'positive' | 'neutral' | 'concerned' | ''
  attachment: File | null
}

interface VisitFormProps {
  customers: CustomerOption[]
  initialData?: Partial<VisitFormData>
  onSave: (data: VisitFormData) => void
  onClose: () => void
}

const MOOD_OPTIONS = [
  { value: 'positive', label: 'บวก' },
  { value: 'neutral', label: 'ปกติ' },
  { value: 'concerned', label: 'กังวล' },
] as const

const MOOD_ICONS: Record<string, ReactNode> = {
  positive: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor"/>
      <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor"/>
      <path d="M5 10C5.8 11.2 7 12 8 12C9 12 10.2 11.2 11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  neutral: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor"/>
      <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor"/>
      <line x1="5" y1="10.5" x2="11" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  concerned: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor"/>
      <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor"/>
      <path d="M5 11.5C5.8 10.3 7 10 8 10C9 10 10.2 10.3 11 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

export function VisitForm({ customers, initialData, onSave, onClose }: VisitFormProps) {
  const [form, setForm] = useState<VisitFormData>({
    customerId: initialData?.customerId ?? '',
    visitDate: initialData?.visitDate ?? '',
    startTime: initialData?.startTime ?? '',
    endTime: initialData?.endTime ?? '',
    gpsLat: initialData?.gpsLat ?? '',
    gpsLng: initialData?.gpsLng ?? '',
    notes: initialData?.notes ?? '',
    nextStep: initialData?.nextStep ?? '',
    customerMood: initialData?.customerMood ?? '',
    attachment: initialData?.attachment ?? null,
  })

  const handleChange = (field: keyof VisitFormData, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          gpsLat: position.coords.latitude.toFixed(6),
          gpsLng: position.coords.longitude.toFixed(6),
        }))
      },
      () => {
        alert('ไม่สามารถระบุตำแหน่งได้ กรุณากรอกด้วยตนเอง')
      }
    )
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {initialData?.customerId ? 'แก้ไขบันทึกการเข้าพบ' : 'บันทึกการเข้าพบลูกค้า'}
          </h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="visit-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="customerId">ลูกค้า</label>
              <select
                id="customerId"
                value={form.customerId}
                onChange={(e) => handleChange('customerId', e.target.value)}
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
              <label htmlFor="visitDate">วันที่</label>
              <input
                id="visitDate"
                type="date"
                value={form.visitDate}
                onChange={(e) => handleChange('visitDate', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="startTime">เวลาเริ่ม</label>
              <input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">เวลาสิ้นสุด</label>
              <input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label-with-action">
                <span>พิกัด GPS</span>
                <button type="button" className="checkin-btn" onClick={handleCheckIn}>
                  <MapPin size={14} />
                  <span>Check-in</span>
                </button>
              </label>
              <div className="gps-fields">
                <input
                  id="gpsLat"
                  type="text"
                  placeholder="ละติจูด (Latitude)"
                  aria-label="ละติจูด (Latitude)"
                  value={form.gpsLat}
                  onChange={(e) => handleChange('gpsLat', e.target.value)}
                  readOnly
                />
                <input
                  id="gpsLng"
                  type="text"
                  placeholder="ลองจิจูด (Longitude)"
                  aria-label="ลองจิจูด (Longitude)"
                  value={form.gpsLng}
                  onChange={(e) => handleChange('gpsLng', e.target.value)}
                  readOnly
                />
              </div>
            </div>

            <div className="form-group full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="notes" style={{ margin: 0 }}>บันทึก</label>
                <AISummarizeButton
                  rawText={form.notes}
                  onSummarized={(data) => {
                    handleChange('notes', data.customerNeeds)
                    if (data.nextAction) {
                      handleChange('nextStep', data.nextAction)
                    }
                  }}
                />
              </div>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="รายละเอียดการเข้าพบ..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="nextStep">ขั้นตอนถัดไป</label>
              <input
                id="nextStep"
                type="text"
                value={form.nextStep}
                onChange={(e) => handleChange('nextStep', e.target.value)}
                placeholder="สิ่งที่ต้องทำต่อไป"
              />
            </div>

            <div className="form-group full-width">
              <label>อารมณ์ลูกค้า</label>
              <div className="mood-selector">
                {MOOD_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`mood-option ${form.customerMood === value ? 'mood-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="customerMood"
                      value={value}
                      checked={form.customerMood === value}
                      onChange={(e) => handleChange('customerMood', e.target.value)}
                    />
                    <span className="mood-icon">{MOOD_ICONS[value]}</span>
                    <span className="mood-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="attachment">ไฟล์แนบ</label>
              <input
                id="attachment"
                type="file"
                onChange={(e) => handleChange('attachment', e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="btn-secondary" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary">
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
