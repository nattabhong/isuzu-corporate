import { Printer, X } from 'lucide-react'

interface QuotationModalProps {
  open: boolean
  onClose: () => void
  customer: {
    name: string
    address?: string | null
    province?: string | null
    district?: string | null
  }
  deal: {
    vehicleModel: string
    quantity: number
    expectedAmount: number | null
    discountAmount?: number | null
    notes?: string | null
  }
  salesRepName: string
}

export function QuotationModal({ open, onClose, customer, deal, salesRepName }: QuotationModalProps) {
  if (!open) return null

  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const quoteNo = `QT-${Date.now().toString().slice(-6)}`

  const totalAmount = deal.expectedAmount || 0
  const discount = deal.discountAmount || 0
  const netBeforeVat = Math.round((totalAmount - discount) / 1.07)
  const vat = (totalAmount - discount) - netBeforeVat
  const grandTotal = totalAmount - discount
  const unitPrice = deal.quantity > 0 ? Math.round(totalAmount / deal.quantity) : 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-backdrop quotation-modal-backdrop">
      <div className="modal-card quotation-modal-card">
        <div className="modal-header no-print">
          <h2>ใบเสนอราคาองค์กร (Corporate Quotation)</h2>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>พิมพ์ / เซฟเป็น PDF</span>
            </button>
            <button type="button" className="btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Quotation Paper */}
        <div className="quotation-paper">
          <div className="quote-header">
            <div className="quote-brand">
              <img src="/logo.png" alt="ศาลาเชียงใหม่" className="quote-logo" />
              <div className="company-info">
                <h3>บริษัท ศาลาเชียงใหม่ จำกัด</h3>
                <p>111 หมู่ 4 ถ.ซุปเปอร์ไฮเวย์ ต.หนองป่าครั่ง อ.เมือง จ.เชียงใหม่ 50000</p>
                <p>โทร: 053-242002 | เลขประจำตัวผู้เสียภาษี: 0505530001234</p>
              </div>
            </div>
            <div className="quote-doc-info">
              <h2>ใบเสนอราคา</h2>
              <table className="meta-table">
                <tbody>
                  <tr>
                    <td><strong>เลขที่:</strong></td>
                    <td>{quoteNo}</td>
                  </tr>
                  <tr>
                    <td><strong>วันที่:</strong></td>
                    <td>{today}</td>
                  </tr>
                  <tr>
                    <td><strong>ยืนราคาถึง:</strong></td>
                    <td>30 วัน</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="quote-customer-box">
            <h4>ข้อมูลลูกค้าองค์กร (Customer Info)</h4>
            <div className="customer-details">
              <p><strong>ชื่อองค์กร/บริษัท:</strong> {customer.name}</p>
              <p><strong>ที่อยู่:</strong> {customer.address || '-'} {customer.district || ''} {customer.province || ''}</p>
              <p><strong>ผู้เสนอราคา:</strong> {salesRepName} (ที่ปรึกษาการขายองค์กร)</p>
            </div>
          </div>

          <table className="quote-items-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>ลำดับ</th>
                <th>รายการรถยนต์ ISUZU / รายละเอียด</th>
                <th style={{ width: '12%', textAlign: 'center' }}>จำนวน (คัน)</th>
                <th style={{ width: '18%', textAlign: 'right' }}>ราคาต่อคัน (บาท)</th>
                <th style={{ width: '20%', textAlign: 'right' }}>จำนวนเงินรวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' }}>1</td>
                <td>
                  <strong>รถยนต์ ISUZU รุ่น {deal.vehicleModel}</strong>
                  {deal.notes && <p className="item-notes">หมายเหตุ: {deal.notes}</p>}
                </td>
                <td style={{ textAlign: 'center' }}>{deal.quantity}</td>
                <td style={{ textAlign: 'right' }}>{unitPrice.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{totalAmount.toLocaleString()}</td>
              </tr>
              {discount > 0 && (
                <tr className="discount-row">
                  <td colSpan={4} style={{ textAlign: 'right' }}><strong>ส่วนลดพิเศษสำหรับฟลีทองค์กร (Corporate Discount)</strong></td>
                  <td style={{ textAlign: 'right', color: '#c62828' }}>- {discount.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="quote-summary-section">
            <div className="quote-terms">
              <h4>เงื่อนไขและข้อตกลง (Terms & Conditions)</h4>
              <ol>
                <li>ราคานี้รวมภาษีมูลค่าเพิ่ม 7% เรียบร้อยแล้ว</li>
                <li>ระยะเวลาส่งมอบรถเป็นไปตามสัญญาซื้อขายฟลีทองค์กร</li>
                <li>เงื่อนไขการชำระเงินตามอนุมัติไฟแนนซ์หรือการโอนเงินชำระเต็มจำนวน</li>
              </ol>
            </div>
            <div className="quote-totals">
              <table className="totals-table">
                <tbody>
                  <tr>
                    <td>ราคาก่อนภาษีมูลค่าเพิ่ม:</td>
                    <td style={{ textAlign: 'right' }}>{netBeforeVat.toLocaleString()} บาท</td>
                  </tr>
                  <tr>
                    <td>ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                    <td style={{ textAlign: 'right' }}>{vat.toLocaleString()} บาท</td>
                  </tr>
                  <tr className="grand-total-row">
                    <td><strong>จำนวนเงินสุทธิต้องชำระ:</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{grandTotal.toLocaleString()} บาท</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="quote-signatures">
            <div className="sig-box">
              <p>ลงชื่อ...................................................</p>
              <p>({salesRepName})</p>
              <p>ผู้เสนอราคา / ที่ปรึกษาการขายองค์กร</p>
            </div>
            <div className="sig-box">
              <p>ลงชื่อ...................................................</p>
              <p>(ผู้จัดการฝ่ายขายองค์กร ศาลาเชียงใหม่)</p>
              <p>ผู้อนุมัติใบเสนอราคา</p>
            </div>
            <div className="sig-box">
              <p>ลงชื่อ...................................................</p>
              <p>({customer.name})</p>
              <p>ผู้รับใบเสนอราคา / สนใจสั่งซื้อ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
