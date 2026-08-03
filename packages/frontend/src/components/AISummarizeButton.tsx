import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import type { AISummarizeLogResponse } from '@sala-corporate/shared'

interface AISummarizeButtonProps {
  rawText: string
  onSummarized: (data: AISummarizeLogResponse) => void
}

export function AISummarizeButton({ rawText, onSummarized }: AISummarizeButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSummarize = async () => {
    if (!rawText.trim()) {
      alert('กรุณากรอกข้อความสรุปการเข้าพบ หรือข้อความที่คุยกับลูกค้าก่อนกดให้ AI สรุป')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: AISummarizeLogResponse }>('/api/ai/summarize-log', {
        rawText,
      })
      if (res.success && res.data) {
        onSummarized(res.data)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการประมวลผล AI')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-secondary"
      style={{
        background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
        color: '#CC0000',
        borderColor: '#FCA5A5',
        fontWeight: 600,
        gap: '6px',
      }}
      onClick={handleSummarize}
      disabled={loading}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} color="#CC0000" />}
      <span>{loading ? 'AI กำลังประมวลผล...' : '✨ ให้ AI ถอดสรุปฟอร์มอัตโนมัติ'}</span>
    </button>
  )
}
