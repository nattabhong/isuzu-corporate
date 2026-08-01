import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  Truck,
  Calendar,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  MessageCircle,
} from 'lucide-react'
import {
  fetchCustomerDetail,
  addContact,
  updateContact,
  deleteContact,
} from '../lib/api'
import type { CustomerDetail as CustomerDetailType, CustomerContact } from '@isuzu-corporate/shared'
import { LEAD_LEVEL_LABELS } from '@isuzu-corporate/shared'
import type { LeadLevel } from '@isuzu-corporate/shared'

function SegmentBadge({ segment }: { segment: string }) {
  return <span className={`badge badge-segment-${segment.toLowerCase()}`}>{segment}</span>
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { active: 'Active', inactive: 'Inactive', prospect: 'Prospect' }
  return <span className={`badge badge-status-${status}`}>{labels[status] || status}</span>
}

function LeadLevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="badge badge-muted">-</span>
  const label = LEAD_LEVEL_LABELS[level as LeadLevel]?.split(' — ')[0] || level
  return <span className={`badge badge-lead-${level}`}>{label}</span>
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [submittingContact, setSubmittingContact] = useState(false)

  const loadCustomer = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomerDetail(id)
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  const handleAddContact = async (data: {
    name: string
    position: string
    phone: string
    email: string
    lineId: string
    isDecisionMaker: boolean
    isPrimary: boolean
  }) => {
    if (!id) return
    setSubmittingContact(true)
    try {
      await addContact(id, {
        name: data.name,
        position: data.position || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        lineId: data.lineId || undefined,
        isDecisionMaker: data.isDecisionMaker,
        isPrimary: data.isPrimary,
      })
      setShowAddContact(false)
      loadCustomer()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmittingContact(false)
    }
  }

  const handleUpdateContact = async (contactId: string, data: Partial<CustomerContact>) => {
    if (!id) return
    setSubmittingContact(true)
    try {
      await updateContact(id, contactId, data)
      setEditingContact(null)
      loadCustomer()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmittingContact(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!id) return
    if (!confirm('ยืนยันการลบผู้ติดต่อนี้?')) return
    try {
      await deleteContact(id, contactId)
      loadCustomer()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    }
  }

  if (loading) {
    return (
      <div className="page customer-detail-page">
        <div className="state-message">
          <p>กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="page customer-detail-page">
        <div className="state-message state-error">
          <p>โหลดข้อมูลไม่สำเร็จ{error ? `: ${error}` : ''}</p>
          <Link to="/customers" className="btn btn-outline">
            กลับไปหน้าลูกค้า
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page customer-detail-page">
      <div className="detail-back">
        <Link to="/customers" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>กลับ</span>
        </Link>
      </div>

      {/* Company Info Header */}
      <div className="detail-header panel">
        <div className="detail-header-main">
          <div className="detail-header-top">
            <h1>{customer.name}</h1>
            <div className="detail-header-badges">
              <SegmentBadge segment={customer.segment} />
              <StatusBadge status={customer.status} />
            </div>
          </div>
          <div className="detail-header-meta">
            {customer.companyType && (
              <span className="meta-item">{customer.companyType}</span>
            )}
            {customer.industry && (
              <span className="meta-item">{customer.industry}</span>
            )}
          </div>
          {customer.address && (
            <div className="detail-header-address">
              <MapPin size={14} />
              <span>{customer.address}</span>
              {customer.district && <span>, {customer.district}</span>}
              {customer.province && <span>, {customer.province}</span>}
            </div>
          )}
          {customer.assignedTo && (
            <div className="detail-header-rep">
              <User size={14} />
              <span>ผู้ดูแล: {customer.assignedTo}</span>
            </div>
          )}
        </div>
        <div className="detail-header-stats">
          <div className="header-stat">
            <Calendar size={16} />
            <div>
              <div className="header-stat-value">{customer.visitStats.total}</div>
              <div className="header-stat-label">Visit</div>
            </div>
          </div>
          <div className="header-stat">
            <Phone size={16} />
            <div>
              <div className="header-stat-value">{customer.callStats.total}</div>
              <div className="header-stat-label">Call</div>
            </div>
          </div>
          <div className="header-stat">
            <TrendingUp size={16} />
            <div>
              <div className="header-stat-value">{customer.activeDeals}</div>
              <div className="header-stat-label">ดีล</div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Contacts Section */}
        <div className="detail-section panel">
          <div className="section-header">
            <h2>ผู้ติดต่อ</h2>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setShowAddContact(true)
                setEditingContact(null)
              }}
            >
              <Plus size={14} />
              <span>เพิ่มผู้ติดต่อ</span>
            </button>
          </div>

          {showAddContact && (
            <ContactForm
              mode="add"
              submitting={submittingContact}
              onSubmit={(data) =>
                handleAddContact(data as {
                  name: string
                  position: string
                  phone: string
                  email: string
                  lineId: string
                  isDecisionMaker: boolean
                  isPrimary: boolean
                })
              }
              onCancel={() => setShowAddContact(false)}
            />
          )}

          {customer.contacts.length === 0 && !showAddContact && (
            <div className="state-message state-empty-sm">
              <p>ยังไม่มีผู้ติดต่อ</p>
            </div>
          )}

          <div className="contacts-list">
            {customer.contacts.map((contact) => (
              <div key={contact.id} className="contact-card">
                {editingContact === contact.id ? (
                  <ContactForm
                    mode="edit"
                    initial={contact}
                    submitting={submittingContact}
                    onSubmit={(data) => handleUpdateContact(contact.id, data)}
                    onCancel={() => setEditingContact(null)}
                  />
                ) : (
                  <>
                    <div className="contact-card-main">
                      <div className="contact-card-name">
                        <span>{contact.name}</span>
                        {contact.isPrimary && (
                          <span className="badge badge-sm badge-primary">หลัก</span>
                        )}
                        {contact.isDecisionMaker && (
                          <span className="badge badge-sm badge-decision">DM</span>
                        )}
                      </div>
                      {contact.position && (
                        <div className="contact-card-position">{contact.position}</div>
                      )}
                      <div className="contact-card-details">
                        {contact.phone && (
                          <span className="contact-detail">
                            <Phone size={12} /> {contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="contact-detail">
                            <Mail size={12} /> {contact.email}
                          </span>
                        )}
                        {contact.lineId && (
                          <span className="contact-detail">
                            <MessageCircle size={12} /> {contact.lineId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="contact-card-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          setEditingContact(contact.id)
                          setShowAddContact(false)
                        }}
                        aria-label="แก้ไข"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDeleteContact(contact.id)}
                        aria-label="ลบ"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Summary */}
        <div className="detail-section panel">
          <div className="section-header">
            <h2>ข้อมูล Fleet</h2>
            <Truck size={18} />
          </div>
          {customer.callStats.total > 0 ? (
            <div className="fleet-info">
              <p>
                ข้อมูลจาก Call Log ล่าสุด ({customer.callStats.lastCall || '-'})
              </p>
              <p className="fleet-note">
                รายละเอียด Fleet จะแสดงเมื่อมีข้อมูลจากระบบ Call Log
              </p>
            </div>
          ) : (
            <div className="state-message state-empty-sm">
              <p>ยังไม่มีข้อมูล Fleet</p>
            </div>
          )}
        </div>

        {/* Recent Visits */}
        <div className="detail-section panel">
          <div className="section-header">
            <h2>การเข้าเยี่ยมล่าสุด</h2>
            <span className="section-stat">
              {customer.visitStats.total} ครั้ง
            </span>
          </div>
          {customer.visitStats.total > 0 ? (
            <div className="visit-summary">
              <p>
                เข้าเยี่ยมทั้งหมด {customer.visitStats.total} ครั้ง
                {customer.visitStats.lastVisit && (
                  <> — ครั้งล่าสุด: {customer.visitStats.lastVisit}</>
                )}
              </p>
            </div>
          ) : (
            <div className="state-message state-empty-sm">
              <p>ยังไม่มีการเข้าเยี่ยม</p>
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div className="detail-section panel">
          <div className="section-header">
            <h2>การติดต่อล่าสุด</h2>
            <span className="section-stat">
              {customer.callStats.total} ครั้ง
            </span>
          </div>
          {customer.callStats.total > 0 ? (
            <div className="call-summary">
              <div className="call-summary-row">
                <span>โทรทั้งหมด {customer.callStats.total} ครั้ง</span>
                {customer.callStats.leadLevel && (
                  <LeadLevelBadge level={customer.callStats.leadLevel} />
                )}
              </div>
              {customer.callStats.lastCall && (
                <p>ครั้งล่าสุด: {customer.callStats.lastCall}</p>
              )}
            </div>
          ) : (
            <div className="state-message state-empty-sm">
              <p>ยังไม่มีการติดต่อ</p>
            </div>
          )}
        </div>

        {/* Active Deals */}
        <div className="detail-section panel">
          <div className="section-header">
            <h2>ดีลที่กำลังดำเนินการ</h2>
            <span className="section-stat">{customer.activeDeals} ดีล</span>
          </div>
          {customer.activeDeals > 0 ? (
            <div className="deals-summary">
              <p>มีดีลที่กำลังดำเนินการ {customer.activeDeals} รายการ</p>
            </div>
          ) : (
            <div className="state-message state-empty-sm">
              <p>ยังไม่มีดีล</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ContactFormData {
  name: string
  position: string
  phone: string
  email: string
  lineId: string
  isDecisionMaker: boolean
  isPrimary: boolean
}

function ContactForm({
  mode,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  mode: 'add' | 'edit'
  initial?: CustomerContact
  submitting: boolean
  onSubmit: (data: Partial<CustomerContact>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [position, setPosition] = useState(initial?.position || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [lineId, setLineId] = useState(initial?.lineId || '')
  const [isDecisionMaker, setIsDecisionMaker] = useState(initial?.isDecisionMaker || false)
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary || false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), position: position.trim(), phone: phone.trim(), email: email.trim(), lineId: lineId.trim(), isDecisionMaker, isPrimary })
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor={`contact-name-${mode}`}>ชื่อ-นามสกุล</label>
        <input
          id={`contact-name-${mode}`}
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="ชื่อ-นามสกุล"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`contact-pos-${mode}`}>ตำแหน่ง</label>
          <input
            id={`contact-pos-${mode}`}
            type="text"
            className="form-input"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="ตำแหน่ง"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`contact-phone-${mode}`}>เบอร์โทร</label>
          <input
            id={`contact-phone-${mode}`}
            type="text"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="เบอร์โทร"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`contact-email-${mode}`}>อีเมล</label>
          <input
            id={`contact-email-${mode}`}
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`contact-line-${mode}`}>LINE ID</label>
          <input
            id={`contact-line-${mode}`}
            type="text"
            className="form-input"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="LINE ID"
          />
        </div>
      </div>
      <div className="form-row form-checks">
        <label className="form-check">
          <input
            type="checkbox"
            checked={isDecisionMaker}
            onChange={(e) => setIsDecisionMaker(e.target.checked)}
          />
          <span>ผู้มีอำนาจตัดสินใจ</span>
        </label>
        <label className="form-check">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          <span>ผู้ติดต่อหลัก</span>
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
          <X size={14} />
          <span>ยกเลิก</span>
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !name.trim()}>
          <Check size={14} />
          <span>{submitting ? 'กำลังบันทึก...' : mode === 'add' ? 'เพิ่ม' : 'บันทึก'}</span>
        </button>
      </div>
    </form>
  )
}
