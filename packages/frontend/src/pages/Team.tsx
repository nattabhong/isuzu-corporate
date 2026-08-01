import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, ShieldCheck, UserCheck, Search, Lock, Edit3, UserX, UserCheck2, RefreshCw, Target, Phone, MapPin, Mail, AlertCircle, CheckCircle2, X } from 'lucide-react'
import type { TeamMember } from '@isuzu-corporate/shared'

export function Team() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [resetPasswordMember, setResetPasswordMember] = useState<TeamMember | null>(null)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)

  // Form States
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState<'manager' | 'sales_rep'>('sales_rep')
  const [formTerritory, setFormTerritory] = useState('')
  const [formSalesTarget, setFormSalesTarget] = useState<number>(5)

  // Reassign Form State
  const [reassignFromId, setReassignFromId] = useState('')
  const [reassignToId, setReassignToId] = useState('')

  // Reset Password State
  const [newStaffPassword, setNewStaffPassword] = useState('')

  // Notification Banner
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setMembers(data.data || [])
      }
    } catch {
      setBannerError('ไม่สามารถดึงข้อมูลทีมงานได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setBannerError(null)
    setBannerSuccess(null)

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          phone: formPhone,
          role: formRole,
          territory: formTerritory,
          salesTarget: formSalesTarget,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เพิ่มสมาชิกทีมไม่สำเร็จ')
      }
      setBannerSuccess(`เพิ่มพนักงาน ${formName} เรียบร้อยแล้ว`)
      setIsAddModalOpen(false)
      resetForm()
      fetchMembers()
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    setSubmitting(true)
    setBannerError(null)
    setBannerSuccess(null)

    try {
      const res = await fetch(`/api/team/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          role: formRole,
          territory: formTerritory,
          salesTarget: formSalesTarget,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'แก้ไขข้อมูลไม่สำเร็จ')
      }
      setBannerSuccess(`อัปเดตข้อมูล ${formName} เรียบร้อยแล้ว`)
      setEditingMember(null)
      resetForm()
      fetchMembers()
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordMember) return

    setSubmitting(true)
    setBannerError(null)
    setBannerSuccess(null)

    try {
      const res = await fetch(`/api/team/${resetPasswordMember.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: newStaffPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ')
      }
      setBannerSuccess(`รีเซ็ตรหัสผ่านสำหรับ ${resetPasswordMember.name} สำเร็จแล้ว`)
      setResetPasswordMember(null)
      setNewStaffPassword('')
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reassignFromId || !reassignToId || reassignFromId === reassignToId) {
      setBannerError('กรุณาเลือกพนักงานต้นทางและปลายทางที่แตกต่างกัน')
      return
    }

    setSubmitting(true)
    setBannerError(null)
    setBannerSuccess(null)

    try {
      const res = await fetch('/api/team/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fromSalesRepId: reassignFromId, toSalesRepId: reassignToId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'โอนย้ายข้อมูลไม่สำเร็จ')
      }
      setBannerSuccess('โอนย้ายพอร์ตลูกค้าและดีลเรียบร้อยแล้ว')
      setIsReassignModalOpen(false)
      setReassignFromId('')
      setReassignToId('')
      fetchMembers()
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโอนย้ายข้อมูล')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (member: TeamMember) => {
    const actionText = member.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`คุณต้องการ${actionText} บัญชีของ ${member.name} ใช่หรือไม่?`)) return

    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !member.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        setBannerSuccess(`${actionText} บัญชีของ ${member.name} เรียบร้อยแล้ว`)
        fetchMembers()
      }
    } catch {
      setBannerError('เกิดข้อผิดพลาดในการสลับสถานะใช้งาน')
    }
  }

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member)
    setFormName(member.name)
    setFormEmail(member.email || '')
    setFormPhone(member.phone || '')
    setFormRole(member.role)
    setFormTerritory(member.territory || '')
    setFormSalesTarget(member.salesTarget || 5)
  }

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormPhone('')
    setFormRole('sales_rep')
    setFormTerritory('')
    setFormSalesTarget(5)
  }

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      (m.territory && m.territory.toLowerCase().includes(search.toLowerCase()))
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="page team-page">
      <div className="page-header">
        <div>
          <h1>จัดการทีมงาน (Team Management)</h1>
          <p className="subtitle">บริหารจัดการทีมงาน กำหนดสิทธิ์ ตั้งเป้าหมายยอดขาย (KPI) และโอนย้ายพอร์ตลูกค้า</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-secondary" onClick={() => setIsReassignModalOpen(true)}>
            <RefreshCw size={16} />
            <span>โอนย้ายพอร์ตลูกค้า/ดีล</span>
          </button>
          <button type="button" className="btn-primary" onClick={() => { resetForm(); setIsAddModalOpen(true) }}>
            <UserPlus size={16} />
            <span>เพิ่มสมาชิกทีมใหม่</span>
          </button>
        </div>
      </div>

      {bannerSuccess && (
        <div className="alert-banner success">
          <CheckCircle2 size={18} />
          <span>{bannerSuccess}</span>
        </div>
      )}

      {bannerError && (
        <div className="alert-banner error">
          <AlertCircle size={18} />
          <span>{bannerError}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="ค้นหาชื่อ, อีเมล หรือเขตการขาย..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            ทั้งหมด ({members.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'manager' ? 'active' : ''}`}
            onClick={() => setRoleFilter('manager')}
          >
            ผู้จัดการ ({members.filter((m) => m.role === 'manager').length})
          </button>
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'sales_rep' ? 'active' : ''}`}
            onClick={() => setRoleFilter('sales_rep')}
          >
            พนักงานขาย ({members.filter((m) => m.role === 'sales_rep').length})
          </button>
        </div>
      </div>

      {/* Team Members List */}
      {loading ? (
        <div className="glass-panel loading-block">
          <p>กำลังโหลดข้อมูลสมาชิกทีมงาน...</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="data-table team-table">
            <thead>
              <tr>
                <th>สมาชิกทีมงาน</th>
                <th>ตำแหน่ง (Role)</th>
                <th>เป้าหมายยอดขาย (Target)</th>
                <th>สถานะใช้งาน</th>
                <th style={{ textAlign: 'right' }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                    ไม่พบข้อมูลสมาชิกทีมงาน
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const roleLabel = member.role === 'manager' ? 'ผู้จัดการ (Manager)' : 'พนักงานขาย (Sales Rep)'
                  return (
                    <tr key={member.id} className={!member.isActive ? 'row-inactive' : ''}>
                      <td>
                        <div className="member-cell">
                          <div className="member-avatar">
                            {member.name.charAt(0)}
                          </div>
                          <div className="member-info">
                            <span className="member-name">{member.name}</span>
                            <span className="member-contact">
                              {member.email && <span><Mail size={12} /> {member.email}</span>}
                              {member.phone && <span><Phone size={12} /> {member.phone}</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`user-role-tag ${member.role}`}>
                          {member.role === 'manager' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                          <span>{roleLabel}</span>
                        </span>
                      </td>
                      <td>
                        <div className="target-cell">
                          <Target size={14} className="target-icon" />
                          <span>{(member.salesTarget || 5).toLocaleString()} คัน/เดือน</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                          {member.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-group">
                          <button
                            type="button"
                            className="btn-action btn-action-edit"
                            title="แก้ไขข้อมูลพนักงาน"
                            onClick={() => openEditModal(member)}
                          >
                            <Edit3 size={14} />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-action-key"
                            title="รีเซ็ตรหัสผ่าน"
                            onClick={() => setResetPasswordMember(member)}
                          >
                            <Lock size={14} />
                            <span>รหัสผ่าน</span>
                          </button>
                          <button
                            type="button"
                            className={`btn-action ${member.isActive ? 'btn-action-danger' : 'btn-action-success'}`}
                            title={member.isActive ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
                            onClick={() => handleToggleActive(member)}
                          >
                            {member.isActive ? <UserX size={14} /> : <UserCheck2 size={14} />}
                            <span>{member.isActive ? 'ระงับ' : 'เปิดใช้งาน'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>เพิ่มสมาชิกทีมใหม่</h2>
              <button type="button" className="modal-close" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="form-grid">
              <div className="form-group">
                <label>ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>อีเมล (Email)</label>
                <input
                  type="email"
                  required
                  placeholder="somchai@isuzu.co.th"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่านแรกเข้า (อย่างน้อย 6 ตัวอักษร)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  placeholder="081-234-5678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>บทบาทสิทธิ์ (Role)</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value as any)}>
                  <option value="sales_rep">พนักงานขาย (Sales Rep)</option>
                  <option value="manager">ผู้จัดการ (Manager)</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>เป้าหมายขายรถยนต์รายเดือน (Target Quota - คัน)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={formSalesTarget}
                  onChange={(e) => setFormSalesTarget(Number(e.target.value))}
                />
              </div>
              <div className="modal-actions full-width">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังเพิ่ม...' : 'บันทึกสมาชิกทีม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>แก้ไขข้อมูล: {editingMember.name}</h2>
              <button type="button" className="modal-close" onClick={() => setEditingMember(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditMember} className="form-grid">
              <div className="form-group">
                <label>ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>บทบาทสิทธิ์ (Role)</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value as any)}>
                  <option value="sales_rep">พนักงานขาย (Sales Rep)</option>
                  <option value="manager">ผู้จัดการ (Manager)</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>เป้าหมายขายรถยนต์รายเดือน (Target Quota - คัน)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={formSalesTarget}
                  onChange={(e) => setFormSalesTarget(Number(e.target.value))}
                />
              </div>
              <div className="modal-actions full-width">
                <button type="button" className="btn-secondary" onClick={() => setEditingMember(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordMember && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>ตั้งรหัสผ่านใหม่: {resetPasswordMember.name}</h2>
              <button type="button" className="modal-close" onClick={() => setResetPasswordMember(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="password-form">
              <div className="form-group">
                <label>กำหนดรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="ระบุรหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setResetPasswordMember(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ตรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Customers/Deals Modal */}
      {isReassignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>โอนย้ายพอร์ตลูกค้าและดีลการขาย</h2>
              <button type="button" className="modal-close" onClick={() => setIsReassignModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReassign} className="password-form">
              <div className="form-group">
                <label>โอนย้ายจาก (พนักงานขายเดิม)</label>
                <select value={reassignFromId} onChange={(e) => setReassignFromId(e.target.value)} required>
                  <option value="">-- เลือกพนักงานเดิม --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.territory || 'ไม่ระบุเขต'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>โอนย้ายไปยัง (พนักงานขายรับช่วงต่อ)</label>
                <select value={reassignToId} onChange={(e) => setReassignToId(e.target.value)} required>
                  <option value="">-- เลือกพนักงานรับช่วงต่อ --</option>
                  {members
                    .filter((m) => m.id !== reassignFromId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.territory || 'ไม่ระบุเขต'})
                      </option>
                    ))}
                </select>
              </div>
              <p className="form-help-text">
                ℹ️ ระบบจะทำการโอนย้ายรายชื่อลูกค้าและดีลใน Pipeline ทั้งหมดของพนักงานขายเดิม ไปยังพนักงานขายใหม่ทันที
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsReassignModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังโอนย้าย...' : 'ยืนยันการโอนย้ายพอร์ต'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
