import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

interface LostDealModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (lostReason: string, competitorBrand: string) => Promise<void>
}

const LOST_REASONS = [
  { id: 'price', label: 'ข้อเสนอราคา / ส่วนลดไม่จูงใจเท่าคู่แข่ง' },
  { id: 'finance_terms', label: 'เงื่อนไขไฟแนนซ์ / ดอกเบี้ย / ค่างวดไม่ผ่านอนุมัติ' },
  { id: 'vehicle_spec', label: 'สเปครถ / ขนาดมิติตัวถังไม่ตรงการใช้งานองค์กร' },
  { id: 'delivery_delay', label: 'ระยะเวลาส่งมอบรถล่าช้าเกินความต้องการ' },
  { id: 'other', label: 'เหตุผลอื่นๆ' },
]

const COMPETITOR_BRANDS = [
  { id: 'toyota', label: 'Toyota (Hilux Revo / Fortuner)' },
  { id: 'ford', label: 'Ford (Ranger / Everest)' },
  { id: 'mitsubishi', label: 'Mitsubishi (Triton / Pajero Sport)' },
  { id: 'nissan', label: 'Nissan (Navara)' },
  { id: 'none', label: 'ไม่มีคู่แข่ง (ยกเลิกแผนจัดซื้อองค์กร)' },
  { id: 'other', label: 'แบรนด์อื่นๆ' },
]

export function LostDealModal({ open, onClose, onSubmit }: LostDealModalProps) {
  const [reason, setReason] = useState('price')
  const [competitor, setCompetitor] = useState('toyota')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(reason, competitor)
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c62828' }}>
            <AlertCircle size={20} />
            <h3 style={{ margin: 0 }}>บันทึกสาเหตุการเสียดีล (Lost Deal Analysis)</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <div className="form-group">
            <label><strong>1. สาเหตุหลักที่ทำให้หลุดดีล:</strong></label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px 12px' }}>
              {LOST_REASONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label><strong>2. คู่แข่งที่เสียดีลให้ (หรือแบรนด์เปรียบเทียบ):</strong></label>
            <select value={competitor} onChange={(e) => setCompetitor(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px 12px' }}>
              {COMPETITOR_BRANDS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#c62828', borderColor: '#c62828' }} disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'บันทึกการเสียดีล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
