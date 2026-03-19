'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { FLASHCARDS, MULTIPLE_CHOICE, TRUE_FALSE, FIB, ORD, TOPICS, TOPIC_COLORS, CONCEPTS } from '@/data/questions'
import { TopicTag } from './shared'

export function AIStudyMode() {
  const { apiKey, askAI, recordAction, recordSession, getWeaknessProfile, cardStats } = useApp()

  // Session config
  const [sessionLength, setSessionLength] = useState(null) // minutes
  const [started, setStarted] = useState(false)
  const [focusTopic, setFocusTopic] = useState('All')

  // Session state
  const [phase, setPhase] = useState('teach') // 'teach' | 'question' | 'feedback' | 'summary'
  const [currentTopic, setCurrentTopic] = useState('')
  const [teachContent, setTeachContent] = useState('')
  const [teachPages, setTeachPages] = useState([])
  const [currentTeachPage, setCurrentTeachPage] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [sessionLog, setSessionLog] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [lastWrongConcept, setLastWrongConcept] = useState(null)
  const [topicBreakdown, setTopicBreakdown] = useState({})

  const timerRef = useRef(null)
  const bottomRef = useRef(null)
  const [timerActive, setTimerActive] = useState(false)

  // Timer pauses when loading
  useEffect(() => {
    if (!timerActive || sessionDone || loading) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setSessionDone(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timerActive, sessionDone, loading])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [phase, feedback, teachContent, currentQuestion])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const startSession = async () => {
    setStarted(true)
    setTimeLeft(sessionLength * 60)
    setQuestionNumber(0)
    setCorrect(0)
    setWrong(0)
    setSessionLog([])
    setSessionDone(false)
    setAiSummary(null)
    setTopicBreakdown({})
    setLastWrongConcept(null)
    setTimerActive(false)

    const profile = getWeaknessProfile()
    const weakestTopic = focusTopic !== 'All' ? focusTopic :
      (profile.topicScores ? Object.entries(profile.topicScores).sort((a, b) => a[1] - b[1])[0]?.[0] : 'Tissues') || 'Tissues'

    setCurrentTopic(weakestTopic)

    try {
      await generateTeachPhase(weakestTopic, profile)
    } catch (e) {
      console.error('startSession failed:', e)
      const concept = CONCEPTS.find(c => c.id === weakestTopic.toLowerCase()) || CONCEPTS[0]
      setTeachContent(concept?.body || 'Review this topic.')
      setPhase('teach')
      setLoading(false)
    }
    setTimerActive(true)
  }

  const generateTeachPhase = async (topic, profile) => {
    setPhase('teach')
    setLoading(true)
    setCurrentTeachPage(0)

    const concept = CONCEPTS.find(c =>
      c.title?.toLowerCase().includes(topic.toLowerCase()) ||
      c.id?.toLowerCase() === topic.toLowerCase()
    ) || CONCEPTS[0]
    const fallbackContent = concept?.body || `Let's review ${topic}.`

    if (apiKey && askAI) {
      try {
        const weakAreas = profile?.weakConcepts?.join(', ') || 'unknown'
        const prompt = `SNC2D quick review: ${topic}. Student weak at: ${weakAreas}. Give exactly 4 bullet points, 1 sentence each. Format: **Term** — explanation. End with 1 memory trick. No intro/outro.`

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
        const response = await Promise.race([askAI(prompt, 200), timeoutPromise])
        
        // Split into pages (2-3 bullet points per page)
        const lines = response.split('\n').filter(l => l.trim())
        const pages = []
        for (let i = 0; i < lines.length; i += 2) {
          pages.push(lines.slice(i, i + 2).join('\n'))
        }
        setTeachPages(pages.length > 0 ? pages : [response])
        setTeachContent(pages[0] || response)
      } catch (e) {
        console.error('AI teach failed:', e)
        setTeachContent(fallbackContent)
        setTeachPages([fallbackContent])
      }
    } else {
      setTeachContent(fallbackContent)
      setTeachPages([fallbackContent])
    }
    setLoading(false)
  }

  const nextTeachPage = () => {
    if (currentTeachPage < teachPages.length - 1) {
      setCurrentTeachPage(currentTeachPage + 1)
      setTeachContent(teachPages[currentTeachPage + 1])
    } else {
      // All lesson pages shown, move to questions
      generateQuestion()
    }
  }

  const skipLesson = () => {
    generateQuestion()
  }

  const generateQuestion = async () => {
    setPhase('question')
    setLoading(true)
    setUserAnswer('')
    setSelectedOption(null)
    setFeedback(null)

    const num = questionNumber + 1
    setQuestionNumber(num)

    if (apiKey) {
      try {
        const profile = getWeaknessProfile()
        let targetConcept = currentTopic
        
        // If last answer was wrong, drill same concept
        if (lastWrongConcept) {
          targetConcept = lastWrongConcept
        }

        const prompt = `Generate a multiple choice question about ${targetConcept} for Grade 10 SNC2D biology. Focus on ${profile.weakConcepts.slice(0, 2).join(', ') || 'key concepts'}. Return ONLY valid JSON, no other text. No markdown. {"type":"mc","question":"...","options":["A)...","B)...","C)...","D)..."],"correct":0,"explanation":"..."}`

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        const response = await Promise.race([askAI(prompt, 200), timeoutPromise])

        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const q = JSON.parse(jsonMatch[0])
          setCurrentQuestion(q)
        } else {
          fallbackQuestion()
        }
      } catch (e) {
        console.error('AI question generation failed:', e)
        fallbackQuestion()
      }
    } else {
      fallbackQuestion()
    }
    setLoading(false)
  }

  const fallbackQuestion = () => {
    const allQuestions = MULTIPLE_CHOICE.filter(q => q.t === currentTopic)
    if (allQuestions.length === 0) {
      setPhase('summary')
      return
    }
    const q = allQuestions[Math.floor(Math.random() * allQuestions.length)]
    setCurrentQuestion({
      type: 'mc',
      question: q.q,
      options: q.o,
      correct: q.c,
      explanation: `The correct answer is ${q.o[q.c]}`
    })
  }

  const handleAnswer = async (selectedIdx) => {
    setSelectedOption(selectedIdx)
    const isCorrect = selectedIdx === currentQuestion.correct
    
    if (isCorrect) {
      setCorrect(c => c + 1)
      setLastWrongConcept(null)
    } else {
      setWrong(w => w + 1)
      // Track this concept for drilling
      setLastWrongConcept(currentTopic)
    }

    recordAction('ai-study', currentTopic, `q${questionNumber}`, isCorrect)
    
    // Update topic breakdown
    setTopicBreakdown(prev => ({
      ...prev,
      [currentTopic]: (prev[currentTopic] || [0, 0]).map((v, i) => i === 0 ? v + (isCorrect ? 1 : 0) : v + 1)
    }))

    setFeedback({
      correct: isCorrect,
      explanation: currentQuestion.explanation
    })

    // If API available, provide hint for wrong answers
    if (!isCorrect && apiKey) {
      try {
        const hint = await askAI(`Question: "${currentQuestion.question}". Correct answer: "${currentQuestion.options[currentQuestion.correct]}". Give a 1-sentence hint that doesn't reveal the answer.`, 100)
        setFeedback(prev => ({ ...prev, hint }))
      } catch (e) {
        // Silent fail for hint
      }
    }
  }

  const nextQuestion = () => {
    if (questionNumber >= 12 || timeLeft <= 0) {
      finishSession()
    } else {
      generateQuestion()
    }
  }

  const finishSession = async () => {
    setSessionDone(true)
    setPhase('summary')
    
    recordSession('AI Study', currentTopic, correct, correct + wrong, Math.round((sessionLength * 60 - timeLeft) / 60))

    if (apiKey) {
      try {
        const topicsStr = Object.entries(topicBreakdown).map(([t, [c, total]]) => `${t}: ${c}/${total}`).join(', ')
        const prompt = `Student completed AI study session. Results: ${correct}/${correct + wrong} correct. Topics: ${topicsStr}. Give brief review summary (2-3 sentences) with 2 specific concepts to review. Format as JSON: {"summary":"...","reviewConcepts":["concept1","concept2"]}`
        
        const response = await Promise.race([
          askAI(prompt, 150),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ])
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          setAiSummary(JSON.parse(jsonMatch[0]))
        }
      } catch (e) {
        console.error('Summary generation failed:', e)
      }
    }
  }

  const getHintButton = async () => {
    if (!apiKey || !currentQuestion) return
    setLoading(true)
    try {
      const hint = await askAI(`Question: "${currentQuestion.question}". Give a 1-sentence hint without revealing the answer.`, 100)
      setFeedback(prev => ({ ...prev, hint }))
    } catch (e) {
      console.error('Hint failed:', e)
    }
    setLoading(false)
  }

  if (!started) {
    return (
      <div className="page-container" style={{ paddingTop: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>🧠 AI Study Mode</h1>
        
        <div className="card-lg" style={{ marginBottom: '24px' }}>
          <p style={{ color: '#a1a1a6', marginBottom: '16px' }}>
            AI-powered personalized study sessions with adaptive lessons and bite-sized questions.
          </p>

          <label style={{ display: 'block', fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
            SESSION LENGTH
          </label>
          <select
            value={sessionLength || ''}
            onChange={(e) => setSessionLength(parseInt(e.target.value))}
            className="input"
            style={{ marginBottom: '16px' }}
          >
            <option value="">Select duration...</option>
            <option value="10">10 minutes</option>
            <option value="20">20 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>

          <label style={{ display: 'block', fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
            FOCUS TOPIC
          </label>
          <select
            value={focusTopic}
            onChange={(e) => setFocusTopic(e.target.value)}
            className="input"
            style={{ marginBottom: '20px' }}
          >
            <option>All</option>
            {TOPICS.map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <button
            onClick={startSession}
            disabled={!sessionLength}
            className="btn btn-primary btn-lg btn-block"
            style={{ opacity: sessionLength ? 1 : 0.5 }}
          >
            {sessionLength ? 'Start Session' : 'Select a duration'}
          </button>
        </div>

        <div className="card" style={{ background: 'rgba(48, 209, 88, 0.1)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#30d158' }}>✨ Features</h3>
          <ul style={{ fontSize: '12px', color: '#a1a1a6', lineHeight: '1.8' }}>
            <li>• Bite-sized lessons with skip option</li>
            <li>• AI-generated questions drilled on weak concepts</li>
            <li>• Progress indicator and timer</li>
            <li>• Session summary with topic breakdown</li>
            <li>• Hints available for stuck questions</li>
          </ul>
        </div>
      </div>
    )
  }

  if (sessionDone && phase === 'summary') {
    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0
    
    return (
      <div className="animate-fade-up" style={{ paddingTop: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
          Session Complete! 🎉
        </h1>

        <div className="card-lg" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>
            {accuracy >= 80 ? '🌟' : accuracy >= 60 ? '👏' : '💪'}
          </div>
          <div style={{ fontSize: '14px', color: '#a1a1a6', marginBottom: '16px' }}>
            Your Accuracy
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', marginBottom: '12px', color: accuracy >= 80 ? '#30d158' : '#ff9f0a' }}>
            {accuracy}%
          </div>
          <div style={{ fontSize: '13px', color: '#a1a1a6' }}>
            {correct} correct · {wrong} incorrect
          </div>
        </div>

        {aiSummary && (
          <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.1), rgba(10, 132, 255, 0.1))' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#30d158' }}>
              🤖 AI Feedback
            </div>
            <p style={{ fontSize: '13px', color: '#a1a1a6', lineHeight: '1.6', marginBottom: '12px' }}>
              {aiSummary.summary}
            </p>
            {aiSummary.reviewConcepts && (
              <div>
                <div style={{ fontSize: '12px', color: '#a1a1a6', marginBottom: '8px', fontWeight: '600' }}>
                  To review:
                </div>
                {aiSummary.reviewConcepts.map((concept, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#ff9f0a', marginBottom: '4px' }}>
                    • {concept}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {Object.keys(topicBreakdown).length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#a1a1a6' }}>
              📊 TOPIC BREAKDOWN
            </div>
            {Object.entries(topicBreakdown).map(([topic, [c, total]]) => (
              <div key={topic} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>{topic}</span>
                  <span style={{ fontWeight: '700', color: c >= total * 0.8 ? '#30d158' : '#ff9f0a' }}>
                    {c}/{total}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${total > 0 ? (c / total) * 100 : 0}%`,
                    background: c >= total * 0.8 ? '#30d158' : '#ff9f0a'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { setStarted(false); setSessionDone(false) }}
          className="btn btn-primary btn-lg btn-block"
        >
          New Session
        </button>
      </div>
    )
  }

  if (phase === 'teach') {
    return (
      <div className="animate-fade-up" style={{ paddingTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: '700' }}>📚 Learn: {currentTopic}</h1>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            {currentTeachPage + 1} of {teachPages.length}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
          <span>{formatTime(timeLeft)}</span>
          <span>Question 0/~12</span>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#a1a1a6' }}>Loading lesson...</p>
          </div>
        ) : (
          <>
            <div className="glass" style={{ padding: '20px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.7' }}
              dangerouslySetInnerHTML={{ __html: renderMd(teachContent) }} />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={skipLesson} className="btn btn-ghost" style={{ flex: 1 }}>
                Skip to Questions
              </button>
              <button onClick={nextTeachPage} className="btn btn-primary" style={{ flex: 1 }}>
                {currentTeachPage < teachPages.length - 1 ? 'Next' : 'Start Questions'}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  if (phase === 'question' && currentQuestion) {
    return (
      <div className="animate-fade-up" style={{ paddingTop: '24px' }} ref={bottomRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#a1a1a6' }}>
            Question {questionNumber}/12
          </h2>
          <div style={{ fontSize: '13px', fontWeight: '700', color: timeLeft < 60 ? '#ff453a' : '#fff' }}>
            {formatTime(timeLeft)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
          <span style={{ color: '#22c55e', fontWeight: '600' }}>✅ {correct}</span>
          <span style={{ color: '#ff453a', fontWeight: '600' }}>❌ {wrong}</span>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#a1a1a6' }}>Generating question...</p>
          </div>
        ) : (
          <>
            <div className="glass" style={{ padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', lineHeight: '1.6' }}>
                {currentQuestion.question}
              </p>
            </div>

            {selectedOption === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {currentQuestion.options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(i)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(48,209,88,0.1)'
                      e.currentTarget.style.borderColor = '#30d158'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="glass" style={{
                  padding: '16px',
                  marginBottom: '16px',
                  background: feedback.correct ? 'rgba(34,197,94,0.1)' : 'rgba(255,69,58,0.1)',
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    color: feedback.correct ? '#22c55e' : '#ff453a'
                  }}>
                    {feedback.correct ? '✅ Correct!' : '❌ Not quite'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1a6', lineHeight: '1.6' }}>
                    {feedback.explanation}
                  </div>
                  {feedback.hint && (
                    <div style={{ fontSize: '12px', color: '#64d2ff', marginTop: '8px', fontStyle: 'italic' }}>
                      Hint: {feedback.hint}
                    </div>
                  )}
                </div>

                <button onClick={nextQuestion} className="btn btn-primary btn-block">
                  Next Question
                </button>
              </>
            )}

            {selectedOption === null && !loading && (
              <button onClick={getHintButton} disabled={loading} className="btn btn-ghost" style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}>
                💡 Get Hint
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="page-container" style={{ paddingTop: '24px', textAlign: 'center' }}>
      <p style={{ color: '#a1a1a6' }}>Loading...</p>
    </div>
  )
}
