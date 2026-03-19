'use client'

import { useState } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { FLASHCARDS, MULTIPLE_CHOICE, TRUE_FALSE, TOPICS, CONCEPTS, TOPIC_COLORS } from '@/data/questions'

export function GuidedStudy() {
  const { reviewCard, apiKey, askAI, recordAction } = useApp()
  const [currentTopic, setCurrentTopic] = useState(TOPICS[0])
  const [phase, setPhase] = useState('concept')
  const [mcIndex, setMcIndex] = useState(0)
  const [tfIndex, setTfIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [bonusQuestion, setBonusQuestion] = useState(null)
  const [bonusLoading, setBonusLoading] = useState(false)

  const topicMCQuestions = MULTIPLE_CHOICE.filter(q => q.t === currentTopic)
  const topicTFQuestions = TRUE_FALSE.filter(q => q.t === currentTopic)

  const handleMCAnswer = (selectedIndex) => {
    const q = topicMCQuestions[mcIndex]
    const isCorrect = selectedIndex === q.c
    recordAction('guided', currentTopic, q.id, isCorrect)
    if (isCorrect) {
      setScore(score + 1)
    }
    if (mcIndex < topicMCQuestions.length - 1) {
      setMcIndex(mcIndex + 1)
    } else {
      setPhase('truefalse')
      setTfIndex(0)
    }
  }

  const handleTFAnswer = (correct) => {
    const q = topicTFQuestions[tfIndex]
    const isCorrect = correct === q.a
    recordAction('guided', currentTopic, q.id, isCorrect)
    if (isCorrect) {
      setScore(score + 1)
    }
    if (tfIndex < topicTFQuestions.length - 1) {
      setTfIndex(tfIndex + 1)
    } else {
      // Generate bonus question with AI
      if (apiKey && !bonusQuestion) {
        generateBonusQuestion()
      } else {
        advanceToNextTopic()
      }
    }
  }

  const generateBonusQuestion = async () => {
    setBonusLoading(true)
    try {
      const response = await askAI(`Student just completed the ${currentTopic} section. They got ${score} out of ${topicMCQuestions.length + topicTFQuestions.length} correct. Generate one bonus question about ${currentTopic} that tests a common misconception. Format as: "QUESTION: [question text]" and "ANSWER: [answer]"`)
      setBonusQuestion(response)
    } catch(e) {
      console.error(e)
      advanceToNextTopic()
    }
    setBonusLoading(false)
  }

  const advanceToNextTopic = () => {
    const nextTopic = TOPICS[TOPICS.indexOf(currentTopic) + 1]
    if (nextTopic) {
      setCurrentTopic(nextTopic)
      setPhase('concept')
      setMcIndex(0)
      setTfIndex(0)
      setScore(0)
      setBonusQuestion(null)
    } else {
      setPhase('complete')
    }
  }

  const conceptIndex = TOPICS.indexOf(currentTopic)
  const concept = CONCEPTS[conceptIndex]
  const conceptText = concept?.body || concept || ''

  if (phase === 'complete') {
    return (
      <div className="container" style={{ paddingTop: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          Course Complete!
        </h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
          You've mastered all topics.
        </p>
        <button
          onClick={() => {
            setCurrentTopic(TOPICS[0])
            setPhase('concept')
            setMcIndex(0)
            setTfIndex(0)
            setScore(0)
            setBonusQuestion(null)
          }}
          className="btn btn-primary btn-lg btn-block"
        >
          Start Over
        </button>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700' }}>{currentTopic}</h1>
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          background: TOPIC_COLORS[currentTopic],
          color: '#000',
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {phase === 'concept' ? 'Learn' : phase === 'multiplechoice' ? 'MC Quiz' : phase === 'truefalse' ? 'True/False' : 'Bonus'}
        </div>
      </div>

      {phase === 'concept' && (
        <div className="card-lg" style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '15px',
            lineHeight: '1.8',
            marginBottom: '20px',
          }}>
            {conceptText}
          </div>
          <button
            onClick={() => setPhase('multiplechoice')}
            className="btn btn-primary btn-block"
          >
            Test Your Knowledge
          </button>
        </div>
      )}

      {phase === 'multiplechoice' && topicMCQuestions.length > 0 && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
              Question {mcIndex + 1} of {topicMCQuestions.length}
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${((mcIndex + 1) / topicMCQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="card-lg" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
              {topicMCQuestions[mcIndex].q}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topicMCQuestions[mcIndex].o.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleMCAnswer(i)}
                  className="btn btn-secondary btn-block"
                  style={{ justifyContent: 'flex-start' }}
                >
                  {String.fromCharCode(65 + i)}: {opt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === 'truefalse' && topicTFQuestions.length > 0 && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
              Statement {tfIndex + 1} of {topicTFQuestions.length}
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${((tfIndex + 1) / topicTFQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="card-lg" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '24px', lineHeight: '1.6' }}>
              {topicTFQuestions[tfIndex].s}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => handleTFAnswer(true)}
                className="btn btn-secondary"
                style={{
                  background: 'rgba(48, 209, 88, 0.2)',
                  color: '#30d158',
                  border: '1px solid #30d158',
                  padding: '16px',
                }}
              >
                True
              </button>
              <button
                onClick={() => handleTFAnswer(false)}
                className="btn btn-secondary"
                style={{
                  background: 'rgba(255, 69, 58, 0.2)',
                  color: '#ff453a',
                  border: '1px solid #ff453a',
                  padding: '16px',
                }}
              >
                False
              </button>
            </div>
          </div>
        </>
      )}

      {bonusQuestion && (
        <div className="card-lg" style={{ marginBottom: '24px', background: 'rgba(48, 209, 88, 0.1)' }}>
          <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#30d158' }}>
            🤖 Bonus Challenge
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: bonusQuestion.replace(/QUESTION:/g, '<strong>Q:</strong>').replace(/ANSWER:/g, '<strong>A:</strong>') }} />
          <button
            onClick={advanceToNextTopic}
            className="btn btn-primary btn-block"
            style={{ marginTop: '12px' }}
          >
            Continue →
          </button>
        </div>
      )}

      {bonusLoading && (
        <div style={{ textAlign: 'center', color: '#a1a1a6', fontSize: '13px', marginBottom: '24px' }}>
          ⏳ Generating bonus question...
        </div>
      )}
    </div>
  )
}
