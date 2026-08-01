import { useState } from 'react'
import { User, Lock, ShieldCheck, KeyRound, Bell, Building2, CheckCircle2, AlertCircle, Phone, MapPin, Mail } from 'lucide-react'
import type { AuthUser } from '../hooks/useAuth'

interface SettingsProps {
  user?: AuthUser
}

export function Settings({ user }: SettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Notification Toggles State
  const [notifyVisit, setNotifyVisit] = useState(true)
  const [notifyDeal, setNotifyDeal] = useState(true)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess(null)
    setPasswordError(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('กรุณากรอกข้อมูลให้ครบทุกช่อง')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
      }
      setPasswordSuccess('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
    } finally {
      setPasswordLoading(false)
    }
  }

  const roleLabel = user?.role === 'manager' ? 'ผู้จัดการ (Manager)' : 'พนักงานขาย (Sales Rep)'

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1>ตั้งค่าระบบ (Settings)</h1>
          <p className="subtitle">จัดการข้อมูลส่วนตัว ความปลอดภัย และการตั้งค่าองค์กร ISUZU Corporate</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="glass-panel settings-card">
          <div className="card-header-with-icon">
            <User className="card-icon" size={22} />
            <h2>ข้อมูลส่วนตัว (Profile)</h2>
          </div>
          <div className="profile-details-grid">
            <div className="profile-avatar-block">
              <div className="avatar-circle">
                <User size={36} />
              </div>
              <div className="profile-identity">
                <span className="profile-name">{user?.name || 'ผู้ใช้งาน'}</span>
                <span className={`role-badge ${user?.role || 'sales_rep'}`}>
                  <ShieldCheck size={14} />
                  <span>{roleLabel}</span>
                </span>
              </div>
            </div>

            <div className="info-list">
              <div className="info-item">
                <Mail size={16} />
                <div>
                  <span className="info-label">อีเมล (Email)</span>
                  <span className="info-value">{user?.email || 'nattabhong.kon@gmail.com'}</span>
                </div>
              </div>
              <div className="info-item">
                <ShieldCheck size={16} />
                <div>
                  <span className="info-label">ตำแหน่ง (Role)</span>
                  <span className="info-value">{roleLabel}</span>
                </div>
              </div>
              <div className="info-item">
                <Phone size={16} />
                <div>
                  <span className="info-label">เบอร์โทรศัพท์</span>
                  <span className="info-value">{user?.phone || '081-234-5678'}</span>
                </div>
              </div>
              <div className="info-item">
                <MapPin size={16} />
                <div>
                  <span className="info-label">เขตการขาย (Territory)</span>
                  <span className="info-value">{user?.territory || 'เชียงใหม่ (ภาคเหนือ)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="glass-panel settings-card">
          <div className="card-header-with-icon">
            <Lock className="card-icon" size={22} />
            <h2>เปลี่ยนรหัสผ่าน (Security)</h2>
          </div>

          {passwordSuccess && (
            <div className="alert-banner success">
              <CheckCircle2 size={18} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="alert-banner error">
              <AlertCircle size={18} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={passwordLoading}>
              {passwordLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        </div>

        {/* Corporate & Preferences */}
        <div className="glass-panel settings-card">
          <div className="card-header-with-icon">
            <Building2 className="card-icon" size={22} />
            <h2>การตั้งค่าองค์กรและระบบ (Preferences)</h2>
          </div>

          <div className="preferences-list">
            <div className="preference-item">
              <div className="pref-icon">
                <KeyRound size={20} />
              </div>
              <div className="pref-info">
                <span className="pref-title">รหัสเชิญลงทะเบียนสมาชิก (Invite Code)</span>
                <span className="pref-desc">ใช้สำหรับสมาชิกทีมใหม่ในการสมัครเข้าสู่ระบบ</span>
              </div>
              <span className="invite-code-tag">ISUZU2026</span>
            </div>

            <div className="preference-item">
              <div className="pref-icon">
                <Bell size={20} />
              </div>
              <div className="pref-info">
                <span className="pref-title">แจ้งเตือนการนัดหมาย Visit Planner</span>
                <span className="pref-desc">ส่งการแจ้งเตือนเมื่อถึงกำหนดการเยี่ยมชมลูกค้า</span>
              </div>
              <input
                type="checkbox"
                className="toggle-switch"
                checked={notifyVisit}
                onChange={(e) => setNotifyVisit(e.target.checked)}
              />
            </div>

            <div className="preference-item">
              <div className="pref-icon">
                <Bell size={20} />
              </div>
              <div className="pref-info">
                <span className="pref-title">แจ้งเตือนสถานะดีลใน Pipeline</span>
                <span className="pref-desc">ส่งการแจ้งเตือนเมื่อดีลมีการเปลี่ยนสถานะขั้นการขาย</span>
              </div>
              <input
                type="checkbox"
                className="toggle-switch"
                checked={notifyDeal}
                onChange={(e) => setNotifyDeal(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Enterprise Integration Gateway Card */}
        <div className="glass-panel settings-card full-width">
          <div className="card-header-with-icon">
            <Building2 className="card-icon" size={22} />
            <h2>การเชื่อมต่อระบบภายในองค์กร (Internal Enterprise Integration)</h2>
          </div>

          <div className="integration-banner">
            <div className="integration-status-header">
              <span className="status-pill active">พร้อมเชื่อมต่อ (Gateway Active)</span>
              <span className="integration-subtitle">รองรับการเชื่อมต่อกับระบบ ERP / Dealer Management System (DMS) ภายในองค์กร</span>
            </div>

            <div className="integration-grid">
              <div className="info-item">
                <div>
                  <span className="info-label">API Key สำหรับระบบภายใน (Internal System API Key)</span>
                  <span className="info-value code-font">isz_live_99f8a42b101c4e97a89f2a01</span>
                </div>
              </div>
              <div className="info-item">
                <div>
                  <span className="info-label">Webhook URL สรุปดีล/ลูกค้า</span>
                  <span className="info-value code-font">https://isuzu-corporate.pages.dev/api/integration/webhook</span>
                </div>
              </div>
              <div className="info-item">
                <div>
                  <span className="info-label">รหัสอ้างอิงลูกค้าระบบภายใน (External Customer Ref ID)</span>
                  <span className="info-value">รองรับฟิลด์ External ID (ERP-Ref) แยกตามรายบริษัทลูกค้า</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
