'use client'

import { useState, useEffect } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { MULTIPLE_CHOICE } from '@/data/questions'
import { Confetti } from './shared'

export function SpeedRound() {
  const { xp, unlockAchievementIfEarned, apiKey, askAI, recordAction, getNextRecommendation } = useApp()
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(8)
  const [finished, setFinished] = useState(false)
  const [aiTips, setAiTips] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [nextRec, setNextRec] = useState(null)

  const startRound = () => {
    const selected = MULTIPLE_CHOICE.sort(() => Math.random() - 0.5)
    setQuestions(selected)
    setStarted(true)
    setCurrentIndex(0)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setTimeLeft(8)
    setFinished(false)
    setAiTips(null)
  }

  useEffect(() => {
    if (!started || finished) return

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          moveNext(false)
          return 8
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, finished, currentIndex])

  useEffect(() => {
    if (finished && apiKey && !aiTips) {
      getAiTips()
    }
  }, [finished])

  const getAiTips = async () => {
    setAiLoading(true)
    try {
      const wrongCount = questions.length - score
      const response = await askAI(`Student completed a speed round quiz. They got ${score} out of ${questions.length} correct (${wrongCount} wrong). Give them 2 specific, actionable study tips to improve next time.`)
      setAiTips(response)
    } catch(e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  const moveNext = async (correct) => {
    const q = questions[currentIndex]
    recordAction('speed', q.t, q.id, correct)

    if (correct) {
      const newScore = score + 1
      const newCombo = combo + 1
      setScore(newScore)
      setCombo(newCombo)
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo)
      }
    } else {
      setCombo(0)
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setTimeLeft(8)
    } else {
      setFinished(true)
      if (score >= 10) {
        unlockAchievementIfEarned(6)
      }
      // Get next recommendation
      if (apiKey) {
        const percentage = (score + 1) / questions.length
        const rec = await getNextRecommendation('Speed Round', percentage, 'Mixed Topics')
        setNextRec(rec)
      }
    }
  }

  const handleAnswer = (selectedIndex) => {
    const q = questions[currentIndex]
    moveNext(selectedIndex === q.c)
  }

  if (!started) {
    return (
      <div className="container" style={{ paddingTop: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>⚡ Speed Round</h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
          8 seconds per question. Test your speed!
        </p>
        <button
          onClick={startRound}
          className="btn btn-primary btn-lg btn-block"
        >
          Start Speed Round
        </button>
      </div>
    )
  }

  if (finished) {
    const showCelebration = score >= 20 || maxCombo >= 10
    return (
      <div className="container" style={{ paddingTop: '24px', textAlign: 'center' }}>
        {showCelebration && <Confetti />}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          {score} Correct
        </h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
          Max Combo: <span style={{ fontWeight: '700', color: '#30d158' }}>{maxCombo}</span> 🔥
        </p>

        {nextRec && (
          <div className="card-lg" style={{ marginBottom: '24px', background: 'rgba(10, 132, 255, 0.1)' }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '14px', color: '#0a84ff' }}>
              🤖 AI Recommends Next
            </div>
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              Try: <span style={{ fontWeight: '600' }}>{nextRec.mode}</span> on <span style={{ fontWeight: '600' }}>{nextRec.topic}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1a6' }}>
              {nextRec.reason}
            </div>
          </div>
        )}

        {aiTips && (
          <div className="card-lg" style={{ marginBottom: '24px', background: 'rgba(48, 209, 88, 0.1)' }}>
            <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#30d158' }}>
              🤖 AI Study Tips
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: renderMd(aiTips) }} />
          </div>
        )}

        {aiLoading && (
          <div style={{ marginBottom: '24px', color: '#a1a1a6', fontSize: '13px' }}>
            ⏳ Getting AI tips...
          </div>
        )}

        <button
          onClick={startRound}
          className="btn btn-primary btn-lg btn-block"
        >
          Try Again
        </button>
      </div>
    )
  }

  const q = questions[currentIndex]

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>
          {score} <span style={{ fontSize: '13px', color: '#a1a1a6' }}>correct</span>
        </div>
        <div style={{
          fontSize: '32px',
          fontWeight: '700',
          color: timeLeft <= 2 ? '#ff453a' : '#30d158',
        }}>
          {timeLeft}s
        </div>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>
          🔥 <span style={{ color: '#30d158' }}>{combo}</span>
        </div>
      </div>

      <div className="card-lg" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', lineHeight: '1.5' }}>
          {q.q}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}>
          {q.o.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="btn btn-secondary"
              style={{
                padding: '16px',
                height: 'auto',
                textAlign: 'center',
                fontSize: '13px',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
