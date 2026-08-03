import { useState, useEffect } from 'react'
import { ShieldAlert, CheckCircle2, DollarSign, Wrench, X, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import type { AIBattlecardResponse } from '@sala-corporate/shared'

interface AIBattlecardModalProps {
  open: boolean
  onClose: () => void
  competitorBrand: string
}

export function AIBattlecardModal({ open, onClose, competitorBrand }: AIBattlecardModalProps) {
  const [data, setData] = useState<AIBattlecardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.post<{ success: boolean; data: AIBattlecardResponse }>('/api/ai/battlecard', { competitorBrand })
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load battlecard:', err)
      })
      .finally(() => setLoading(false))
  }, [open, competitorBrand])

  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '750px', width: '92%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#FEF2F2', padding: '8px', borderRadius: '10px', color: '#CC0000', display: 'flex' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>✨ AI Battlecard — คำแนะนำปิดการขายแข่งขัน</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: '#6B7280' }}>
                เปรียบเทียบเชิงลึก: Isuzu vs {competitorBrand}
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <Sparkles size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#CC0000' }} />
            <p>AI กำลังประมวลผลข้อมูลเปรียบเทียบจุดเด่นและคำแนะนำปิดการขาย...</p>
          </div>
        ) : data ? (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Compare Banner */}
            <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)', color: '#fff', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>คู่แข่ง</span>
                <h4 style={{ margin: '2px 0 0 0', color: '#FCA5A5' }}>{data.competitorBrand}</h4>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6B7280' }}>VS</div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>รุ่น Isuzu ชนสเปค</span>
                <h4 style={{ margin: '2px 0 0 0', color: '#34D399' }}>{data.isuzuModel}</h4>
              </div>
            </div>

            {/* Key Advantages */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9375rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>จุดเด่นหลักของ Isuzu ที่เหนือกว่าคู่แข่ง (Key Advantages)</span>
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#374151' }}>
                {data.keyAdvantages.map((adv, idx) => (
                  <li key={idx}><strong>{adv}</strong></li>
                ))}
              </ul>
            </div>

            {/* Objection Handling */}
            {data.objectionHandling.length > 0 && (
              <div style={{ background: '#FFF8F6', border: '1px solid #FFEDD5', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9375rem', color: '#C2410C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} color="#C2410C" />
                  <span>ข้อโต้แย้งที่พบบ่อย & คำพูดปิดการขาย (Objection Handling)</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.objectionHandling.map((item, idx) => (
                    <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #FED7AA' }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#9A3412', fontSize: '0.875rem' }}>
                        ❓ ข้อโต้แย้งลูกค้า: "{item.objection}"
                      </p>
                      <p style={{ margin: 0, color: '#1F2937', fontSize: '0.875rem' }}>
                        💡 **บทพูดนำเสนอที่แนะนำ**: {item.response}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TCO & Service Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px', borderRadius: '10px' }}>
                <h5 style={{ margin: '0 0 6px 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={14} />
                  <span>การเปรียบเทียบต้นทุนรวม (TCO)</span>
                </h5>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#14532D' }}>
                  {data.tcoComparison}
                </p>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '14px', borderRadius: '10px' }}>
                <h5 style={{ margin: '0 0 6px 0', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={14} />
                  <span>จุดแข็งบริการ ศาลาเชียงใหม่</span>
                </h5>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8125rem', color: '#1E3A8A' }}>
                  {data.salaServiceHighlights.map((hl, idx) => (
                    <li key={idx}>{hl}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                รับทราบ และนำไปใช้เสนอขาย
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
