import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, X, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import MainLayout from '../../layouts/MainLayout'
import ProductCard from '../../components/common/ProductCard'
import api from '../../services/api'

const SUGGESTIONS = [
  'I need a casual outfit for the weekend under GHS 200',
  'Show me formal wear for men',
  'Find me something stylish for a birthday party',
  'What do you have for kids under GHS 100?',
]

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "Hi! I'm your AI stylist powered by Gemini. Tell me what you're looking for — occasion, budget, style — and I'll find the perfect outfit from our catalog.",
      products: [],
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    setMessages(prev => [...prev, { role: 'user', content: msg, products: [] }])
    setLoading(true)

    try {
      const res = await api.post('/recommendations/chat/', { message: msg })
      setMessages(prev => [...prev, {
        role: 'ai',
        content: res.data.message,
        products: res.data.products || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        products: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = async () => {
    try { await api.post('/recommendations/chat/clear/') } catch {}
    setMessages([{
      role: 'ai',
      content: "Chat cleared! What are you looking for today?",
      products: [],
    }])
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ink)] rounded-full flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="serif text-2xl font-medium text-[var(--ink)]">AI Stylist</h1>
              <p className="text-xs text-[var(--muted)]">Powered by Gemini AI</p>
            </div>
          </div>
          <button onClick={clearChat}
            className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            <RotateCcw size={14} /> Clear chat
          </button>
        </div>

        {/* Messages */}
        <div className="space-y-6 mb-6 min-h-[400px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[var(--ink)] rounded-full flex items-center justify-center">
                      <Sparkles size={11} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-[var(--muted)]">AI Stylist</span>
                  </div>
                )}
                <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--ink)] text-white rounded-br-sm'
                    : 'bg-[var(--off)] text-[var(--ink)] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>

                {/* Recommended products */}
                {msg.products?.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {msg.products.map((p, pi) => (
                      <ProductCard key={p.id} product={p} index={pi} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--off)] px-5 py-3.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-[var(--muted)] rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="px-4 py-2 text-sm border border-[var(--border)] rounded-full text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-all bg-white">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 items-end sticky bottom-6">
          <div className="flex-1 bg-white border border-[var(--border)] rounded-2xl shadow-sm focus-within:border-[var(--ink)] transition-colors overflow-hidden">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
              placeholder="Ask me anything about fashion..."
              className="w-full px-5 py-4 text-sm outline-none resize-none bg-transparent placeholder:text-[var(--border)]"
              style={{ maxHeight: 120, overflowY: 'auto' }}
            />
          </div>
          <button onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-[var(--ink)] text-white rounded-2xl flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-30">
            <Send size={17} />
          </button>
        </div>
      </div>
    </MainLayout>
  )
}