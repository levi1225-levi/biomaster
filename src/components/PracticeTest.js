'use client'

import { useState, useEffect } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { MULTIPLE_CHOICE, TRUE_FALSE } from '@/data/questions'

export function PracticeTest() {
  const { unlockAchievementIfEarned, apiKey, askAI, recordAction } = useApp()
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [showMistakesOnly, setShowMistakesOnly] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const allQuestions = [
    ...MULTIPLE_CHOICE.slice(0, 15).map(q => ({ ...q, type: 'mc' })),
    ...TRUE_FALSE.slice(0, 10).map(q => ({ ...q, type: 'tf' })),
  ]

  const startTest = () => {
    setStarted(true)
    setAnswers({})
    setShowResults(false)
    setAiAnalysis(null)
  }

  const handleAnswer = (qIndex, answer) => {
    const q = allQuestions[qIndex]
    const isCorrect = q.type === 'mc' ? answer === q.c : answer === q.a
    recordAction('practice', q.t, q.id, isCorrect)
    setAnswers({
      ...answers,
      [qIndex]: answer,
    })
  }

  useEffect(() => {
    if (showResults && apiKey && !aiAnalysis) {
      getAiAnalysis()
    }
  }, [showResults])

  const getAiAnalysis = async () => {
    setAiLoading(true)
    try {
      const mistakes = []
      allQuestions.forEach((q, i) => {
        const isCorrect = q.type === 'mc' ? answers[i] === q.c : answers[i] === q.a
        if (!isCorrect) {
          const correctAns = q.type === 'mc' ? q.o[q.c] : (q.a ? 'True' : 'False')
          const studentAns = q.type === 'mc' ? q.o[answers[i]] : (answers[i] ? 'True' : 'False')
          mistakes.push(`Q: ${q.type === 'mc' ? q.q : q.s} | You said: "${studentAns}" | Correct: "${correctAns}"`)
        }
      })
      const mistakeSummary = mistakes.slice(0, 5).join('\n')
      const response = await askAI(`Student took a practice test and got ${score} out of ${allQuestions.length} correct. Here are their mistakes: ${mistakeSummary}. Provide 3 specific, actionable study recommendations to help them improve.`)
      setAiAnalysis(response)
    } catch(e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  const submitTest = () => {
    let correct = 0
    allQuestions.forEach((q, i) => {
      if (q.type === 'mc') {
        if (answers[i] === q.c) correct++
      } else {
        if (answers[i] === q.a) correct++
      }
    })
    setScore(correct)
    setShowResults(true)
    if (correct === allQuestions.length) {
      unlockAchievementIfEarned(5)
    }
  }

  if (!started) {
    return (
      <div className="container" style={{ paddingTop: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Practice Test</h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
          15 MC + 10 TF = 25 total questions
        </p>
        <button
          onClick={startTest}
          className="btn btn-primary btn-lg btn-block"
        >
          Start Test
        </button>
      </div>
    )
  }

  if (showResults) {
    const percentage = Math.round((score / allQuestions.length) * 100)
    const displayQuestions = showMistakesOnly
      ? allQuestions.filter((q, i) =>
          q.type === 'mc'
            ? answers[i] !== q.c
            : answers[i] !== q.a
        )
      : allQuestions

    return (
      <div className="container" style={{ paddingTop: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '📚'}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            {percentage}%
          </h1>
          <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
            You scored {score} out of {allQuestions.length}
          </p>
        </div>

        {aiAnalysis && (
          <div className="card-lg" style={{ marginBottom: '24px', background: 'rgba(48, 209, 88, 0.1)' }}>
            <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#30d158' }}>
              🤖 AI Analysis
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: renderMd(aiAnalysis) }} />
          </div>
        )}

        {aiLoading && (
          <div style={{ marginBottom: '24px', color: '#a1a1a6', fontSize: '13px', textAlign: 'center' }}>
            ⏳ Analyzing your performance...
          </div>
        )}

        <button
          onClick={() => setShowMistakesOnly(!showMistakesOnly)}
          className="btn btn-secondary btn-block"
          style={{ marginBottom: '16px' }}
        >
          {showMistakesOnly ? '📋 Show All Answers' : '❌ Show Mistakes Only'}
        </button>

        {displayQuestions.map((q, originalIndex) => {
          const i = allQuestions.indexOf(q)
          const isCorrect = q.type === 'mc'
            ? answers[i] === q.c
            : answers[i] === q.a

          return (
            <div key={i} className="card" style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '8px',
              }}>
                <div style={{
                  fontSize: '18px',
                  minWidth: '24px',
                }}>
                  {isCorrect ? '✅' : '❌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {q.type === 'mc' ? q.q : q.s}
                  </div>
                  {!isCorrect && (
                    <div style={{ fontSize: '13px', color: '#a1a1a6', marginTop: '4px' }}>
                      {q.type === 'mc'
                        ? `Correct: ${q.o[q.c]}`
                        : `Correct: ${q.a ? 'True' : 'False'}`
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-lg btn-block"
          >
            🖨️ Print Test
          </button>
          <button
            onClick={() => setStarted(false)}
            className="btn btn-primary btn-lg btn-block"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
          Progress
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${(Object.keys(answers).length / allQuestions.length) * 100}%`,
            }}
          />
        </div>
        <div style={{
          fontSize: '12px',
          color: '#a1a1a6',
          marginTop: '4px',
          textAlign: 'right',
        }}>
          {Object.keys(answers).length} / {allQuestions.length} answered
        </div>
      </div>

      {allQuestions.map((q, i) => (
        <div key={i} className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
            Question {i + 1}
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            {q.type === 'mc' ? q.q : q.s}
          </h3>

          {q.type === 'mc' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {q.o.map((opt, j) => (
                <button
                  key={j}
                  onClick={() => handleAnswer(i, j)}
                  className="btn btn-secondary"
                  style={{
                    background: answers[i] === j ? '#30d158' : undefined,
                    color: answers[i] === j ? '#000' : undefined,
                    justifyContent: 'flex-start',
                    fontSize: '13px',
                    padding: '10px 12px',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => handleAnswer(i, true)}
                className="btn btn-secondary"
                style={{
                  background: answers[i] === true ? '#30d158' : undefined,
                  color: answers[i] === true ? '#000' : undefined,
                }}
              >
                True
              </button>
              <button
                onClick={() => handleAnswer(i, false)}
                className="btn btn-secondary"
                style={{
                  background: answers[i] === false ? '#ff453a' : undefined,
                  color: answers[i] === false ? '#fff' : undefined,
                }}
              >
                False
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={submitTest}
        disabled={Object.keys(answers).length < allQuestions.length}
        className="btn btn-primary btn-lg btn-block"
        style={{
          marginTop: '24px',
          opacity: Object.keys(answers).length < allQuestions.length ? 0.5 : 1,
          cursor: Object.keys(answers).length < allQuestions.length ? 'not-allowed' : 'pointer',
        }}
      >
        Submit Test ({Object.keys(answers).length} / {allQuestions.length})
      </button>
    </div>
  )
}
