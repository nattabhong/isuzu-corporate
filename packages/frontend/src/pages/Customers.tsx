import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Building2, X, Download } from 'lucide-react'
import { fetchCustomers, createCustomer } from '../lib/api'
import type { Customer } from '@sala-corporate/shared'

const SEGMENTS = ['all', 'A', 'B', 'C'] as const
const SEGMENT_LABELS: Record<string, string> = {
  all: 'ทั้งหมด',
  A: 'A',
  B: 'B',
  C: 'C',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  prospect: 'Prospect',
}

const ZONES = ['all', 'เมืองเชียงใหม่', 'นิคมฯ ลำพูน', 'แม่ริม/แม่แตง', 'หางดง/สันป่าตอง', 'ต่างจังหวัด'] as const

function SegmentBadge({ segment }: { segment: string }) {
  return <span className={`badge badge-segment-${segment.toLowerCase()}`}>{segment}</span>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-status-${status}`}>{STATUS_LABELS[status] || status}</span>
}

export function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<string>('all')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [status, setStatus] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomers({
        search: search || undefined,
        segment: segment || undefined,
        status: status || undefined,
      })
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }, [search, segment, status])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const handleSegmentChange = (seg: string) => {
    setSegment(seg)
  }

  const handleAddCustomer = async (data: {
    name: string
    segment: string
    province: string
    status: string
  }) => {
    setSubmitting(true)
    try {
      await createCustomer(data)
      setShowModal(false)
      loadCustomers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCSV = () => {
    let csvContent = '\uFEFF'
    csvContent += 'ชื่อบริษัท/องค์กร,Segment,จังหวัด,สถานะ\n'
    customers.forEach((c) => {
      csvContent += `"${c.name}",${c.segment},"${c.province}",${c.status}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="page customers-page">
      <div className="page-header">
        <h1>ลูกค้าองค์กร</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
          >
            <Download size={18} />
            <span>ส่งออก CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} />
            <span>เพิ่มลูกค้า</span>
          </button>
        </div>
      </div>

      <div className="customers-filters panel">
        <div className="filter-search">
          <Search size={18} className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="ค้นหาชื่อบริษัท..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-tabs" role="tablist">
          {SEGMENTS.map((seg) => (
            <button
              key={seg}
              type="button"
              role="tab"
              className={`tab ${segment === seg ? 'tab-active' : ''}`}
              onClick={() => handleSegmentChange(seg)}
              aria-selected={segment === seg}
            >
              {SEGMENT_LABELS[seg]}
            </button>
          ))}
        </div>

        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="กรองตามสถานะ"
        >
          <option value="">สถานะ: ทั้งหมด</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      {loading && (
        <div className="state-message">
          <p>กำลังโหลด...</p>
        </div>
      )}

      {error && !loading && (
        <div className="state-message state-error">
          <p>โหลดข้อมูลไม่สำเร็จ: {error}</p>
          <button type="button" className="btn btn-outline" onClick={loadCustomers}>
            ลองใหม่
          </button>
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <div className="state-message">
          <Building2 size={48} className="state-icon" />
          <p>ไม่พบข้อมูลลูกค้า</p>
        </div>
      )}

      {!loading && !error && customers.length > 0 && (
        <div className="customers-table-wrapper panel">
          <table className="customers-table">
            <thead>
              <tr>
                <th>ชื่อบริษัท</th>
                <th>Segment</th>
                <th>จังหวัด</th>
                <th>ผู้ติดต่อ</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="customer-row"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <td className="td-name">{c.name}</td>
                  <td>
                    <SegmentBadge segment={c.segment} />
                  </td>
                  <td className="td-muted">{c.province || '-'}</td>
                  <td className="td-muted">{c.district || '-'}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="td-action" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => navigate(`/customers/${c.id}`)}
                      aria-label="ดูรายละเอียด"
                    >
                      <Search size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddCustomerModal
          submitting={submitting}
          onSubmit={handleAddCustomer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function AddCustomerModal({
  submitting,
  onSubmit,
  onClose,
}: {
  submitting: boolean
  onSubmit: (data: { name: string; segment: string; province: string; status: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('A')
  const [province, setProvince] = useState('')
  const [status, setStatus] = useState('active')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), segment, province: province.trim(), status })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>เพิ่มลูกค้าใหม่</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="cust-name">ชื่อบริษัท</label>
              <input
                id="cust-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ระบุชื่อบริษัท"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cust-segment">Segment</label>
                <select
                  id="cust-segment"
                  className="form-input"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cust-status">สถานะ</label>
                <select
                  id="cust-status"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="cust-province">จังหวัด</label>
              <input
                id="cust-province"
                type="text"
                className="form-input"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="ระบุจังหวัด"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
              {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
