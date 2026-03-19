'use client'

import { useState } from 'react'
import { useApp, aiExplainCard, renderMd } from '@/lib/store'
import { FLASHCARDS, TOPICS } from '@/data/questions'
import { Confetti } from './shared'

export function CramMode() {
  const { reviewCard, getDueCards, apiKey, recordAction } = useApp()
  const [topic, setTopic] = useState('All')
  const [started, setStarted] = useState(false)
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [aiExp, setAiExp] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const startCram = () => {
    const filtered = topic === 'All'
      ? FLASHCARDS
      : FLASHCARDS.filter(c => c.t === topic)
    
    setCards(filtered.sort(() => Math.random() - 0.5))
    setCurrentIndex(0)
    setShowAnswer(false)
    setReviewed(0)
    setStarted(true)
  }

  const handleDeeperClick = async () => {
    const card = cards[currentIndex]
    if (!apiKey || !card) return
    setAiLoading(true)
    try {
      const response = await aiExplainCard(apiKey, card.q, card.a)
      setAiExp(response)
    } catch(e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  const handleRate = (quality) => {
    const card = cards[currentIndex]
    reviewCard(card.id, quality)
    recordAction('cram', card.t, card.id, quality >= 3)
    const newReviewed = reviewed + 1

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
      setReviewed(newReviewed)
      setAiExp(null)
    } else {
      // Show celebration screen
      setReviewed(newReviewed)
      setCurrentIndex(-1)
    }
  }

  if (!started) {
    return (
      <div className="page-container" style={{ paddingTop: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Cram Mode</h1>

        <div className="card-lg" style={{ marginBottom: '24px' }}>
          <p style={{ color: '#a1a1a6', marginBottom: '16px' }}>
            Quick review mode. See answer first, then rate quickly.
          </p>

          <label style={{ display: 'block', fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
            SELECT TOPIC
          </label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="input"
            style={{ marginBottom: '16px' }}
          >
            <option>All</option>
            {TOPICS.map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <button
            onClick={startCram}
            className="btn btn-primary btn-lg btn-block"
          >
            Start Cram
          </button>
        </div>
      </div>
    )
  }

  if (currentIndex === -1) {
    return (
      <div className="page-container" style={{ paddingTop: '24px', textAlign: 'center' }}>
        <Confetti />
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          You reviewed every card!
        </h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
          Total reviewed: <span style={{ fontWeight: '700', color: '#30d158' }}>{reviewed}</span>
        </p>
        <button
          onClick={() => setStarted(false)}
          className="btn btn-primary btn-lg btn-block"
        >
          Back to Menu
        </button>
      </div>
    )
  }

  const card = cards[currentIndex]

  return (
    <div className="page-container" style={{ paddingTop: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '13px', color: '#a1a1a6' }}>
          Card <span style={{ fontWeight: '700' }}>{currentIndex + 1}</span> of <span style={{ fontWeight: '700' }}>{cards.length}</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#30d158' }}>
          Reviewed: {reviewed}
        </div>
      </div>

      <div className="progress-bar" style={{ marginBottom: '24px' }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      <div className="card-lg" style={{
        marginBottom: '24px',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        {!showAnswer ? (
          <>
            <div style={{
              fontSize: '14px',
              color: '#a1a1a6',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}>
              Question
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '500',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}>
              {card.q}
            </div>
            <button
              onClick={() => setShowAnswer(true)}
              className="btn btn-primary"
            >
              Show Answer
            </button>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '14px',
              color: '#a1a1a6',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}>
              Answer
            </div>
            <div style={{
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}>
              {card.a}
            </div>

            {apiKey && (
              <button
                onClick={handleDeeperClick}
                disabled={aiLoading}
                className="btn btn-secondary btn-block"
                style={{ marginBottom: '12px', fontSize: '13px' }}
              >
                {aiLoading ? '⏳ Loading...' : '🤖 Deeper'}
              </button>
            )}

            {aiExp && (
              <div className="card" style={{ marginBottom: '12px', padding: '12px', fontSize: '13px', lineHeight: '1.5', background: 'rgba(48, 209, 88, 0.1)' }} dangerouslySetInnerHTML={{ __html: renderMd(aiExp) }} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                onClick={() => handleRate(1)}
                className="btn btn-secondary"
                style={{
                  fontSize: '12px',
                  background: 'rgba(255, 69, 58, 0.2)',
                  color: '#ff453a',
                  border: '1px solid #ff453a',
                }}
              >
                Again
              </button>
              <button
                onClick={() => handleRate(3)}
                className="btn btn-secondary"
                style={{
                  fontSize: '12px',
                  background: 'rgba(10, 132, 255, 0.2)',
                  color: '#0a84ff',
                  border: '1px solid #0a84ff',
                }}
              >
                Good
              </button>
              <button
                onClick={() => handleRate(5)}
                className="btn btn-primary"
                style={{
                  fontSize: '12px',
                }}
              >
                Easy
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
