'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp, aiExplainCard, renderMd } from '@/lib/store'
import { FLASHCARDS, TOPICS, TOPIC_COLORS } from '@/data/questions'
import { TopicTag } from './shared'

export function Flashcards() {
  const { reviewCard, cardStats, apiKey, recordAction, getSmartQueue } = useApp()
  const [topic, setTopic] = useState('All')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [aiExp, setAiExp] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [useSmartQueue, setUseSmartQueue] = useState(true)
  const [smartCards, setSmartCards] = useState([])

  const baseFiltered = topic === 'All' ? FLASHCARDS : FLASHCARDS.filter(c => c.t === topic)

  // Build smart queue on component mount and when topic changes
  useEffect(() => {
    const queue = getSmartQueue(baseFiltered)
    setSmartCards(queue)
    setIdx(0)
    setFlipped(false)
    setAiExp(null)
  }, [topic, baseFiltered, getSmartQueue])

  const filtered = useSmartQueue ? smartCards : baseFiltered
  const card = filtered[idx]

  const cardStartTime = useRef(null)

  const rate = useCallback((quality) => {
    if (!card) return
    reviewCard(card.id, quality)
    const timeSpent = cardStartTime.current ? Math.round((Date.now() - cardStartTime.current) / 1000) : 0
    recordAction('flashcard', card.t, card.id, quality >= 3, timeSpent)
    cardStartTime.current = null
    setFlipped(false)
    setAiExp(null)
    setIdx(i => (i + 1) % filtered.length)
  }, [card, filtered, reviewCard, recordAction])

  // Track time when card is viewed
  useEffect(() => {
    if (card && !cardStartTime.current) {
      cardStartTime.current = Date.now()
    }
  }, [card])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); setFlipped(f => !f) }
      if (flipped && e.key >= '1' && e.key <= '5') { rate(parseInt(e.key)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, rate])

  const handleExplain = async () => {
    if (!apiKey || !card) return
    setAiLoading(true)
    const exp = await aiExplainCard(apiKey, card.q, card.a)
    setAiExp(exp)
    setAiLoading(false)
  }

  if (!card) return <div className="text-center py-20 text-white/40">No cards available</div>

  const ratings = [
    { label: 'Again', key: 1, bg: 'rgba(255,69,58,0.15)', border: '#ff453a', color: '#ff453a' },
    { label: 'Hard', key: 2, bg: 'rgba(255,159,10,0.15)', border: '#ff9f0a', color: '#ff9f0a' },
    { label: 'Good', key: 3, bg: 'rgba(10,132,255,0.15)', border: '#0a84ff', color: '#0a84ff' },
    { label: 'Easy', key: 4, bg: 'rgba(48,209,88,0.15)', border: '#30d158', color: '#30d158' },
    { label: 'Perfect', key: 5, bg: 'rgba(100,210,255,0.15)', border: '#64d2ff', color: '#64d2ff' },
  ]

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🃏 Flashcards</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            <input type="checkbox" checked={useSmartQueue} onChange={e => setUseSmartQueue(e.target.checked)} style={{ marginRight: 4 }} />
            Smart Order
          </label>
          <select value={topic} onChange={e => { setTopic(e.target.value); setIdx(0); setFlipped(false); setAiExp(null) }}
            style={{ width: 160, padding: '10px 14px', fontSize: 13 }}>
            <option>All</option>
            {TOPICS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
        <span>Card {idx + 1} of {filtered.length}</span>
        <TopicTag topic={card.t} />
      </div>

      {/* Flip Card */}
      <div className="flip-perspective" style={{ height: 340, marginBottom: 24, cursor: 'pointer' }}
        onClick={() => setFlipped(f => !f)}>
        <div className={`flip-card ${flipped ? 'flipped' : ''}`} style={{ width: '100%', height: '100%' }}>
          {/* Front */}
          <div className="flip-face glass" style={{
            background: 'rgba(15,23,42,0.7)',
            flexDirection: 'column',
            gap: 16,
          }}>
            <TopicTag topic={card.t} />
            <p style={{ fontSize: 20, fontWeight: 600, textAlign: 'center', lineHeight: 1.6, maxWidth: 420 }}>
              {card.q}
            </p>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Tap to reveal</span>
          </div>
          {/* Back */}
          <div className="flip-face flip-back glass" style={{
            background: 'linear-gradient(145deg, rgba(34,197,94,0.08), rgba(15,23,42,0.8))',
            flexDirection: 'column',
            gap: 12,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: 1 }}>ANSWER</span>
            <p style={{ fontSize: 17, textAlign: 'center', lineHeight: 1.7, maxWidth: 440 }}>
              {card.a}
            </p>
          </div>
        </div>
      </div>

      {/* AI Explain */}
      {flipped && apiKey && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={handleExplain} disabled={aiLoading}
            className="btn btn-ghost" style={{ fontSize: 13 }}>
            {aiLoading ? '⏳ Loading...' : aiExp ? '🤖 Explained' : '🤖 Explain This'}
          </button>
          {aiExp && (
            <div className="glass" style={{ marginTop: 12, padding: 16, fontSize: 13, lineHeight: 1.7, textAlign: 'left' }}
              dangerouslySetInnerHTML={{ __html: renderMd(aiExp) }} />
          )}
        </div>
      )}

      {/* Rating Buttons (only show when flipped) */}
      {flipped && (
        <div className="animate-fade-up">
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            How well did you know this?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {ratings.map(r => (
              <button key={r.key} onClick={() => rate(r.key)}
                style={{
                  padding: '14px 0', borderRadius: 14, fontWeight: 700, fontSize: 12,
                  background: r.bg, border: `1.5px solid ${r.border}`, color: r.color,
                  cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}>
                {r.label}<br />
                <span style={{ fontSize: 10, opacity: 0.6 }}>({r.key})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
        ⌨️ Space = flip · 1-5 = rate
      </p>
    </div>
  )
}
