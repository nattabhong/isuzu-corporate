import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import type { ChatMessage } from '@sala-corporate/shared'
import type { AuthUser } from '../hooks/useAuth'

const API_BASE =
  (import.meta.env.VITE_API_URL as string) ||
  'https://sala-corporate-api.nattabhong-kon.workers.dev'

interface AIChatWidgetProps {
  user: AuthUser
}

function getContextTitle(path: string): string {
  if (path.includes('/customers')) return 'ลูกค้าองค์กร (Customers)'
  if (path.includes('/deals')) return 'การบริหารดีล (Deals Pipeline)'
  if (path.includes('/reports')) return 'รายงาน & Performance'
  if (path.includes('/calendar')) return 'ปฏิทิน & นัดหมาย'
  if (path.includes('/calls')) return 'บันทึกการโทร'
  if (path.includes('/visits')) return 'บันทึกการพบลูกค้า'
  if (path.includes('/team')) return 'การจัดการทีมขาย'
  if (path.includes('/settings')) return 'การตั้งค่าระบบ'
  return 'ภาพรวมระบบ (Overview)'
}

function getInitialPrompts(path: string): string[] {
  if (path.includes('/customers')) {
    return [
      'วิธีจัดกลุ่มลูกค้าเกรด A/B/C',
      'สคริปต์โทรติดตามลูกค้ารายใหญ่',
      'ข้อเสนอพิเศษลูกค้าร่องฟลีท',
    ]
  }
  if (path.includes('/deals')) {
    return [
      'วิธีเปรียบเทียบ TCO กับ Toyota Revo',
      'เทคนิคเสนอราคาแบบไม่ตัดราคาแข่ง',
      'เงื่อนไขไฟแนนซ์ฟลีทนิติบุคคล',
    ]
  }
  if (path.includes('/reports')) {
    return [
      'สรุป KPI ของทีมขายเดือนนี้',
      'กลยุทธ์เพิ่ม Conversion Rate',
      'วิเคราะห์ยอดขายแยกตามรุ่นรถ',
    ]
  }
  if (path.includes('/calendar') || path.includes('/visits') || path.includes('/calls')) {
    return [
      'สคริปต์เปิดการขายลูกค้ารายใหม่',
      'เทคนิคถามความต้องการรถองค์กร',
      'รายการเอกสารเตรียมไปพบลููกค้า',
    ]
  }
  return [
    'สรุปสเปครถ Isuzu D-MAX 2026',
    'เปรียบเทียบจุดเด่น Isuzu กับ Toyota Revo',
    'หลักการคำนวณค่างวด & ดอกเบี้ยฟลีท',
  ]
}

export function AIChatWidget({ user }: AIChatWidgetProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentPath = location.pathname
  const contextTitle = getContextTitle(currentPath)
  const defaultPrompts = getInitialPrompts(currentPath)

  // Initialize welcome message when widget opens for first time or path changes
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `สวัสดีครับคุณ ${user.name} 👋 ผมคือ **AI Assistant** ช่วยสนับสนุนงานขาย Isuzu ตามบริบทของหน้า **"${contextTitle}"** มีเรื่องไหนสอบถามได้ทันทีครับ!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }
  }, [user.name, contextTitle, messages.length])

  // Scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function sendMessage(textToSend?: string) {
    const text = (textToSend || inputMsg).trim()
    if (!text || loading) return

    const userMsgObj: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsgObj])
    if (!textToSend) setInputMsg('')
    setLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          pageContext: {
            path: currentPath,
            title: contextTitle,
          },
        }),
      })

      const json = await res.json()
      if (json.success && json.data) {
        const botMsgObj: ChatMessage = {
          id: `b-${Date.now()}`,
          sender: 'assistant',
          text: json.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: json.data.suggestedPrompts,
        }
        setMessages((prev) => [...prev, botMsgObj])
      } else {
        throw new Error(json.error || 'ไม่สามารถรับข้อมูลจาก AI ได้')
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handlePromptClick(promptText: string) {
    sendMessage(promptText)
  }

  function clearHistory() {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `รีเซ็ตการสนทนาเรียบร้อยครับ ขณะนี้กำลังดูบริบทหน้า **"${contextTitle}"** สามารถสอบถามเพิ่มเติมได้เลยครับ!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  return (
    <div className="ai-chat-widget-container">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          className="ai-chat-floating-btn"
          onClick={() => setIsOpen(true)}
          title="เปิด AI Assistant ผู้ช่วยงานขาย"
          aria-label="เปิด AI Assistant"
        >
          <div className="ai-btn-glow" />
          <Bot size={24} />
          <span className="ai-btn-label">AI Assistant</span>
          <span className="ai-context-badge">{contextTitle.split(' ')[0]}</span>
        </button>
      )}

      {/* Slide-out / Popover Chat Window */}
      {isOpen && (
        <div className="ai-chat-window panel">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3>Sala AI Assistant</h3>
                <span className="ai-context-sub">
                  📍 บริบท: <strong>{contextTitle}</strong>
                </span>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button
                type="button"
                className="ai-icon-btn"
                onClick={clearHistory}
                title="ล้างประวัติการคุย"
              >
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                className="ai-icon-btn"
                onClick={() => setIsOpen(false)}
                title="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="ai-chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-message-row ${msg.sender === 'user' ? 'user-row' : 'assistant-row'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="ai-msg-avatar">
                    <Bot size={14} />
                  </div>
                )}
                <div className="ai-msg-bubble">
                  <div className="ai-msg-text">
                    {msg.text.split('\n').map((line, i) => {
                      // Basic inline formatting for bold text
                      const parts = line.split(/(\*\*.*?\*\*)/g)
                      return (
                        <p key={i}>
                          {parts.map((p, j) => {
                            if (p.startsWith('**') && p.endsWith('**')) {
                              return <strong key={j}>{p.slice(2, -2)}</strong>
                            }
                            return p
                          })}
                        </p>
                      )
                    })}
                  </div>
                  <span className="ai-msg-time">{msg.timestamp}</span>

                  {/* Suggested follow-up prompts embedded in bot message */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="ai-suggested-prompts-inline">
                      {msg.suggestedActions.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="ai-prompt-chip"
                          onClick={() => handlePromptClick(prompt)}
                        >
                          <MessageSquare size={12} />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message-row assistant-row">
                <div className="ai-msg-avatar">
                  <Bot size={14} />
                </div>
                <div className="ai-msg-bubble ai-typing-bubble">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Default Quick Prompts Bar if conversation is short */}
          {messages.length <= 2 && (
            <div className="ai-chat-quick-prompts-bar">
              <span className="quick-prompts-title">คำถามแนะนำสำหรับหน้านี้:</span>
              <div className="quick-prompts-list">
                {defaultPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-prompt-chip primary-chip"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    <Sparkles size={12} />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <form
            className="ai-chat-input-form"
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
          >
            <input
              type="text"
              placeholder="พิมพ์คำถาม หรือขอคำแนะนำตามหน้านี้..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="ai-chat-send-btn"
              disabled={loading || !inputMsg.trim()}
              title="ส่งข้อความ"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
