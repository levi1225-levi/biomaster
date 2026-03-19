'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { FLASHCARDS } from '@/data/questions'
import { TopicTag } from './shared'

export function WrongReview() {
  const { studyHistory, recordAction, apiKey, aiExplainCard } = useApp()
  const [wrongCards, setWrongCards] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [aiExp, setAiExp] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [correctOnSecond, setCorrectOnSecond] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)

  useEffect(() => {
    // Get all wrong card IDs from study history
    const wrongCardIds = studyHistory
      .filter(entry => !entry.correct)
      .map(entry => entry.cardId)
    
    // Deduplicate
    const uniqueWrongIds = [...new Set(wrongCardIds)]
    
    // Get the actual card objects
    const cards = FLASHCARDS.filter(card => uniqueWrongIds.includes(card.id))
    setWrongCards(cards)
  }, [studyHistory])

  const cardStartTime = useRef(null)
  const card = wrongCards[idx]

  const startSession = () => {
    setSessionStarted(true)
    setIdx(0)
    setFlipped(false)
    setAiExp(null)
    setCorrectOnSecond(0)
  }

  const rate = useCallback((isCorrect) => {
    if (!card) return
    const timeSpent = cardStartTime.current ? Math.round((Date.now() - cardStartTime.current) / 1000) : 0
    recordAction('wrong-review', card.t, card.id, isCorrect, timeSpent)
    if (isCorrect) {
      setCorrectOnSecond(prev => prev + 1)
    }
    cardStartTime.current = null
    setFlipped(false)
    setAiExp(null)
    setIdx(i => (i + 1) % wrongCards.length)
  }, [card, wrongCards, recordAction])

  useEffect(() => {
    if (card && !cardStartTime.current) {
      cardStartTime.current = Date.now()
    }
  }, [card])

  const handleExplain = async () => {
    if (!apiKey || !card) return
    setAiLoading(true)
    const exp = await aiExplainCard(apiKey, card.q, card.a)
    setAiExp(exp)
    setAiLoading(false)
  }

  if (!sessionStarted) {
    return (
      <div className="animate-fade-up">
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>🔄 Wrong Answer Review</h1>
        
        {wrongCards.length === 0 ? (
          <div className="card-lg" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Great job!</h2>
            <p style={{ color: '#a1a1a6', fontSize: 14, marginBottom: 20 }}>
              You haven't gotten any wrong answers yet, or you haven't studied enough questions to have wrong answers to review.
            </p>
            <p style={{ color: '#a1a1a6', fontSize: 13 }}>
              Keep studying and practicing! Once you get some questions wrong, they'll appear here so you can review them.
            </p>
          </div>
        ) : (
          <div className="card-lg" style={{ marginBottom: 24 }}>
            <p style={{ color: '#a1a1a6', marginBottom: 16, fontSize: 14 }}>
              You have {wrongCards.length} card{wrongCards.length !== 1 ? 's' : ''} to review. Let's practice these concepts again!
            </p>
            <button
              onClick={startSession}
              className="btn btn-primary btn-lg btn-block"
            >
              Start Review Session
            </button>
          </div>
        )}
      </div>
    )
  }

  if (wrongCards.length === 0) {
    return (
      <div className="animate-fade-up">
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#fff' }}>No cards to review</p>
          <button onClick={() => setSessionStarted(false)} className="btn btn-ghost">
            Back
          </button>
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="animate-fade-up">
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#fff' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🔄 Review</h1>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {idx + 1} of {wrongCards.length}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
        <span>Correct on second try: <strong style={{ color: '#22c55e' }}>{correctOnSecond}</strong></span>
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

      {/* Rating Buttons */}
      {flipped && (
        <div className="animate-fade-up">
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            Do you know this now?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => rate(false)}
              style={{
                padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 12,
                background: 'rgba(255,69,58,0.15)', border: '1.5px solid #ff453a', color: '#ff453a',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
              Not Yet
            </button>
            <button onClick={() => rate(true)}
              style={{
                padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 12,
                background: 'rgba(48,209,88,0.15)', border: '1.5px solid #30d158', color: '#30d158',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
              Yes, Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
