'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/store'
import { renderMd } from '@/lib/store'

export function AITutor() {
  const { apiKey, askAI, getWeaknessProfile } = useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [weaknessProfile, setWeaknessProfile] = useState(null)
  const messagesEnd = useRef(null)

  useEffect(() => {
    // Load weakness profile on mount
    setWeaknessProfile(getWeaknessProfile())
  }, [getWeaknessProfile])

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setMessages([...messages, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // Add context about student's weaknesses if available
      let contextualPrompt = userMessage
      if (weaknessProfile && weaknessProfile.weakConcepts.length > 0) {
        contextualPrompt = `[Context: Student's weak areas are: ${weaknessProfile.weakConcepts.join(', ')}. Accuracy: ${weaknessProfile.totalAccuracy}%. Consider emphasizing these topics.] ${userMessage}`
      }

      const response = await askAI(contextualPrompt)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key in Settings and try again.',
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    'Explain the digestive system',
    'What is peristalsis?',
    'How do lungs exchange oxygen?',
    'Describe the heart\'s chambers',
  ]

  if (!apiKey) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 100px)',
        alignItems: 'center',
        justifyContent: 'center',
      }} className="container">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            AI Tutor
          </h1>
          <p style={{ color: '#a1a1a6', marginBottom: '24px', fontSize: '14px' }}>
            Add your API key in Settings to start chatting with AI
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'Settings' }))}
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 100px)',
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 16px',
      }} className="container">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              AI Tutor
            </h1>
            <p style={{ color: '#a1a1a6', marginBottom: '32px' }}>
              Ask me anything about biology!
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}>
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(suggestion)
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div className={msg.role === 'user' ? 'message-user' : 'message-assistant'}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#30d158',
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#30d158',
                  animation: 'pulse 1.4s ease-in-out infinite 0.2s',
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#30d158',
                  animation: 'pulse 1.4s ease-in-out infinite 0.4s',
                }} />
              </div>
            )}
            <div ref={messagesEnd} />
          </div>
        )}
      </div>

      <div style={{
        borderTop: '1px solid #424245',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.5)',
      }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question..."
              className="input"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              className="btn btn-primary"
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 20px',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
