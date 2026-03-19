'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { MULTIPLE_CHOICE, TOPICS } from '@/data/questions'
import { TopicTag, Confetti } from './shared'
import { aiExplain } from '@/lib/store'

export function Quiz() {
  const { xp, setStreak, unlockAchievementIfEarned, apiKey, recordAction, getSmartQueue, getNextRecommendation } = useApp()
  const [topic, setTopic] = useState('All')
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [answered, setAnswered] = useState(null)
  const [aiExp, setAiExp] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [nextRec, setNextRec] = useState(null)
  const [recLoading, setRecLoading] = useState(false)

  const startQuiz = () => {
    const filtered = topic === 'All'
      ? MULTIPLE_CHOICE
      : MULTIPLE_CHOICE.filter(q => q.t === topic)
    
    const selected = filtered.sort(() => Math.random() - 0.5).slice(0, 15)
    setQuestions(selected)
    setCurrentIndex(0)
    setScore(0)
    setStarted(true)
    setShowResults(false)
  }

  const handleAnswer = async (selectedIndex) => {
    const q = questions[currentIndex]
    const isCorrect = selectedIndex === q.c
    setAnswered(selectedIndex)
    recordAction('quiz', q.t, q.id, isCorrect)

    if (isCorrect) {
      setScore(score + 1)
    } else if (!isCorrect && apiKey) {
      setAiLoading(true)
      const exp = await aiExplain(apiKey, q.q, q.o[q.c], q.o[selectedIndex])
      setAiExp(exp)
      setAiLoading(false)
    }
  }

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setAnswered(null)
      setAiExp(null)
    } else {
      setShowResults(true)
      if (score + 1 === questions.length) {
        unlockAchievementIfEarned(5)
      }
      // Get next recommendation
      if (apiKey) {
        setRecLoading(true)
        const percentage = (score + 1) / questions.length
        const rec = await getNextRecommendation('Quiz', percentage, topic === 'All' ? 'All Topics' : topic)
        setNextRec(rec)
        setRecLoading(false)
      }
    }
  }

  if (!started) {
    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Quiz Mode</h1>

        <div className="card-lg" style={{ marginBottom: '24px' }}>
          <p style={{ color: '#a1a1a6', marginBottom: '16px' }}>
            Test your knowledge with 15 multiple choice questions.
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
            onClick={startQuiz}
            className="btn btn-primary btn-lg btn-block"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="container" style={{ paddingTop: '24px', textAlign: 'center' }}>
        {percentage >= 80 && <Confetti />}
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚'}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          {percentage}%
        </h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
          You scored {score} out of {questions.length}
        </p>

        {nextRec && (
          <div className="card-lg" style={{ marginBottom: '24px', background: 'rgba(48, 209, 88, 0.1)' }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '14px', color: '#30d158' }}>
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

        {recLoading && (
          <div style={{ marginBottom: '24px', color: '#a1a1a6', fontSize: '13px' }}>
            ⏳ Getting AI recommendation...
          </div>
        )}

        <button
          onClick={() => setStarted(false)}
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
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '13px', color: '#a1a1a6' }}>
          Question <span style={{ fontWeight: '700' }}>{currentIndex + 1}</span> of <span style={{ fontWeight: '700' }}>{questions.length}</span>
        </div>
        <TopicTag topic={q.t} />
      </div>

      <div className="progress-bar" style={{ marginBottom: '24px' }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="card-lg" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', lineHeight: '1.5' }}>
          {q.q}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {q.o.map((option, i) => {
            const isSelected = answered === i
            const isCorrect = i === q.c
            const showResult = answered !== null
            let bgColor = '#2c2c2e'
            if (showResult && isSelected && isCorrect) bgColor = '#30d158'
            if (showResult && isSelected && !isCorrect) bgColor = '#ff453a'
            if (showResult && !isSelected && isCorrect) bgColor = '#30d158'

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered !== null}
                className="btn btn-secondary btn-block"
                style={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  opacity: answered !== null && !isSelected && !isCorrect ? 0.5 : 1,
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: bgColor,
                  marginRight: '12px',
                  fontSize: '12px',
                  color: (showResult && (isCorrect || isSelected)) ? '#fff' : '#a1a1a6',
                }}>
                  {showResult && isCorrect ? '✓' : showResult && isSelected && !isCorrect ? '✗' : String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            )
          })}
        </div>

        {answered !== null && (
          <div style={{ marginTop: '16px' }}>
            {answered === q.c ? (
              <div style={{ color: '#30d158', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                ✓ Correct!
              </div>
            ) : (
              <>
                <div style={{ color: '#ff453a', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  ✗ Not quite. The correct answer is: {q.o[q.c]}
                </div>
                {aiExp && (
                  <div className="card" style={{ padding: '12px', fontSize: '13px', lineHeight: '1.5', background: 'rgba(48, 209, 88, 0.1)', marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>🤖 Why?</div>
                    {aiExp}
                  </div>
                )}
                {aiLoading && (
                  <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '12px' }}>
                    ⏳ Getting explanation...
                  </div>
                )}
              </>
            )}
            <button
              onClick={handleNext}
              className="btn btn-primary btn-block"
              style={{ marginTop: '12px' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <div style={{ fontSize: '13px', color: '#a1a1a6', textAlign: 'center' }}>
        Score: <span style={{ fontWeight: '700', color: '#30d158' }}>{score}</span> correct
      </div>
    </div>
  )
}
