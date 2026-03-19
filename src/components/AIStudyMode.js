'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { FLASHCARDS, MULTIPLE_CHOICE, TRUE_FALSE, FIB, ORD, TOPICS, TOPIC_COLORS, CONCEPTS } from '@/data/questions'
import { TopicTag } from './shared'

// The AI generates questions in these formats
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'fill_blank', 'explain', 'ordering']

export function AIStudyMode() {
  const { apiKey, askAI, recordAction, getWeaknessProfile, cardStats } = useApp()

  // Session config
  const [sessionLength, setSessionLength] = useState(null) // minutes
  const [started, setStarted] = useState(false)
  const [focusTopic, setFocusTopic] = useState('All')

  // Session state
  const [phase, setPhase] = useState('teach') // 'teach' | 'question' | 'feedback' | 'summary'
  const [currentTopic, setCurrentTopic] = useState('')
  const [teachContent, setTeachContent] = useState('')
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

  const timerRef = useRef(null)
  const bottomRef = useRef(null)

  const [timerActive, setTimerActive] = useState(false)

  // Timer — only runs when timerActive is true (after first lesson loads)
  useEffect(() => {
    if (!timerActive || sessionDone) return
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
  }, [timerActive, sessionDone])

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
    setTimerActive(false) // Don't start timer yet

    // Get weakness profile to decide what to teach first
    const profile = getWeaknessProfile()
    const weakestTopic = focusTopic !== 'All' ? focusTopic :
      (profile.topicScores ? Object.entries(profile.topicScores).sort((a, b) => a[1] - b[1])[0]?.[0] : 'Tissues') || 'Tissues'

    setCurrentTopic(weakestTopic)

    try {
      await generateTeachPhase(weakestTopic, profile)
    } catch (e) {
      console.error('startSession failed:', e)
      // Force show static content so it doesn't hang
      const concept = CONCEPTS.find(c => c.id === weakestTopic.toLowerCase()) || CONCEPTS[0]
      setTeachContent(concept?.body || concept || 'Review this topic in the Notes section.')
      setPhase('teach')
      setLoading(false)
    }
    // NOW start the timer after lesson is loaded
    setTimerActive(true)
  }

  const [aiError, setAiError] = useState(null)

  const generateTeachPhase = async (topic, profile) => {
    setPhase('teach')
    setLoading(true)
    setAiError(null)

    // Always prepare static fallback
    const concept = CONCEPTS.find(c =>
      c.title?.toLowerCase().includes(topic.toLowerCase()) ||
      c.id?.toLowerCase() === topic.toLowerCase()
    ) || CONCEPTS[0]
    const fallbackContent = concept?.body || `Let's review ${topic}. Check the Notes section for full content.`

    if (apiKey && askAI) {
      try {
        const weakAreas = profile?.weakConcepts?.join(', ') || 'unknown'

        // Add timeout so it doesn't hang forever
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out (15s)')), 15000))
        const aiPromise = askAI(
          `You are a biology tutor giving a QUICK review for a Grade 10 SNC2D test. Topic: "${topic}". ` +
          `Student's weak areas: ${weakAreas}. ` +
          `Reference: ${concept?.body?.substring(0, 400) || topic}. ` +
          `Give a BITE-SIZED review (MAX 8 bullet points). Format EXACTLY like this:\n` +
          `**Key Point 1** — short explanation\n` +
          `**Key Point 2** — short explanation\n` +
          `Then add ONE memory trick at the end.\n` +
          `Keep each bullet to 1 sentence MAX. Be direct, no fluff. Focus on what they're weak at.`
        )

        const response = await Promise.race([aiPromise, timeoutPromise])
        setTeachContent(response)
      } catch (e) {
        const errMsg = e.message || 'Unknown error'
        console.error('AI teach failed:', errMsg)
        setAiError(`AI failed: ${errMsg}. Using saved notes instead.`)
        setTeachContent(fallbackContent)
      }
    } else {
      if (!apiKey) setAiError('No API key set. Using saved notes. Add your key in Settings for AI-powered lessons.')
      setTeachContent(fallbackContent)
    }
    setLoading(false)
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
        // Ask AI to generate a question based on weaknesses
        const profile = getWeaknessProfile()
        const weakAreas = profile?.weakConcepts?.slice(0, 3)?.join(', ') || currentTopic

        // Alternate question types
        const types = ['multiple_choice', 'true_false', 'fill_blank', 'explain']
        const qType = types[(num - 1) % types.length]

        let prompt = ''
        if (qType === 'multiple_choice') {
          prompt = `Generate a multiple choice question about ${currentTopic} for a Grade 10 biology test (SNC2D). Focus on: ${weakAreas}. ` +
            `Return ONLY valid JSON: {"type":"mc","question":"...","options":["A)...","B)...","C)...","D)..."],"correct":0,"explanation":"..."} ` +
            `where correct is the 0-based index of the right answer. Make it challenging but fair.`
        } else if (qType === 'true_false') {
          prompt = `Generate a true/false question about ${currentTopic} for SNC2D biology. Focus on: ${weakAreas}. ` +
            `Return ONLY valid JSON: {"type":"tf","statement":"...","answer":true,"explanation":"..."}`
        } else if (qType === 'fill_blank') {
          prompt = `Generate a fill-in-the-blank question about ${currentTopic} for SNC2D biology. Focus on: ${weakAreas}. ` +
            `Return ONLY valid JSON: {"type":"fill","question":"The ___ is responsible for...","answer":"word","explanation":"..."}`
        } else {
          prompt = `Generate a short-answer question about ${currentTopic} for SNC2D biology. Focus on: ${weakAreas}. ` +
            `Return ONLY valid JSON: {"type":"explain","question":"Explain how/why...","keyPoints":["point1","point2","point3"],"modelAnswer":"..."}`
        }

        // Add timeout
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        const response = await Promise.race([askAI(prompt), timeoutPromise])

        // Parse the JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const q = JSON.parse(jsonMatch[0])
          setCurrentQuestion(q)
        } else {
          fallbackQuestion()
        }
      } catch (e) {
        console.error('AI question generation failed:', e.message)
        fallbackQuestion()
      }
    } else {
      fallbackQuestion()
    }
    setLoading(false)
  }

  const fallbackQuestion = () => {
    // Use existing question bank as fallback
    const topicMC = MULTIPLE_CHOICE.filter(q => q.t === currentTopic || currentTopic === 'All')
    const topicTF = TRUE_FALSE.filter(q => q.t === currentTopic || currentTopic === 'All')
    const allQ = [...topicMC, ...topicTF]

    if (allQ.length === 0) {
      setCurrentQuestion({
        type: 'mc',
        question: 'What are the 4 primary tissue types?',
        options: ['Epithelial, Muscle, Connective, Nervous', 'Bone, Blood, Skin, Fat', 'Cell, Tissue, Organ, System', 'None of the above'],
        correct: 0,
        explanation: 'The 4 tissue types are Epithelial, Muscle, Connective, and Nervous.'
      })
      return
    }

    const picked = allQ[Math.floor(Math.random() * allQ.length)]

    if (picked.o) {
      // MC question
      setCurrentQuestion({
        type: 'mc',
        question: picked.q,
        options: picked.o,
        correct: picked.c,
        explanation: `The correct answer is: ${picked.o[picked.c]}`
      })
    } else {
      // TF question
      setCurrentQuestion({
        type: 'tf',
        statement: picked.s,
        answer: picked.a,
        explanation: picked.e || (picked.a ? 'This statement is true.' : 'This statement is false.')
      })
    }
  }

  const submitAnswer = async () => {
    if (!currentQuestion) return
    setPhase('feedback')

    let isCorrect = false
    const q = currentQuestion

    if (q.type === 'mc') {
      isCorrect = selectedOption === q.correct
    } else if (q.type === 'tf') {
      isCorrect = selectedOption === (q.answer ? 0 : 1)
    } else if (q.type === 'fill') {
      isCorrect = userAnswer.trim().toLowerCase() === q.answer.toLowerCase()
    } else if (q.type === 'explain') {
      // For explain questions, AI evaluates the answer
      if (apiKey && userAnswer.trim()) {
        setLoading(true)
        try {
          const evalResponse = await askAI(
            `Student was asked: "${q.question}". They answered: "${userAnswer}". ` +
            `The key points they should mention: ${q.keyPoints?.join(', ')}. ` +
            `Model answer: ${q.modelAnswer}. ` +
            `Rate their answer: was it correct? Give brief feedback. ` +
            `Return JSON: {"correct":true/false,"feedback":"..."}`
          )
          const match = evalResponse.match(/\{[\s\S]*\}/)
          if (match) {
            const result = JSON.parse(match[0])
            isCorrect = result.correct
            setFeedback({
              correct: isCorrect,
              message: result.feedback,
              modelAnswer: q.modelAnswer
            })
            setLoading(false)
            recordAction('ai_study', currentTopic, questionNumber, isCorrect)
            setSessionLog(prev => [...prev, { topic: currentTopic, type: q.type, correct: isCorrect }])
            if (isCorrect) setCorrect(c => c + 1)
            else setWrong(w => w + 1)
            return
          }
        } catch (e) {
          console.error(e)
        }
        setLoading(false)
      }
      // Default: mark as attempted
      isCorrect = userAnswer.trim().length > 20 // generous - if they wrote something substantial
    }

    recordAction('ai_study', currentTopic, questionNumber, isCorrect)
    setSessionLog(prev => [...prev, { topic: currentTopic, type: q.type, correct: isCorrect }])

    if (isCorrect) {
      setCorrect(c => c + 1)
      setFeedback({
        correct: true,
        message: '✅ Correct! ' + (q.explanation || ''),
        modelAnswer: null
      })
    } else {
      setWrong(w => w + 1)
      let msg = '❌ Not quite. '
      if (q.type === 'mc') msg += `The correct answer is: ${q.options[q.correct]}`
      else if (q.type === 'tf') msg += `The statement is ${q.answer ? 'TRUE' : 'FALSE'}.`
      else if (q.type === 'fill') msg += `The correct answer is: ${q.answer}`

      setFeedback({
        correct: false,
        message: msg + (q.explanation ? '\n\n' + q.explanation : ''),
        modelAnswer: q.type === 'explain' ? q.modelAnswer : null
      })
    }
  }

  const nextAction = async () => {
    // Decide: teach more or ask another question
    // After every 3 questions, switch topic or re-teach
    const total = correct + wrong

    if (total > 0 && total % 3 === 0) {
      // Switch to a new topic or re-teach current if struggling
      const accuracy = correct / total
      if (accuracy < 0.5) {
        // Re-teach current topic
        const profile = getWeaknessProfile()
        await generateTeachPhase(currentTopic, profile)
      } else {
        // Move to next topic
        const topicList = focusTopic !== 'All' ? [focusTopic] : TOPICS
        const currentIdx = topicList.indexOf(currentTopic)
        const nextTopic = topicList[(currentIdx + 1) % topicList.length]
        setCurrentTopic(nextTopic)
        const profile = getWeaknessProfile()
        await generateTeachPhase(nextTopic, profile)
      }
    } else {
      await generateQuestion()
    }
  }

  const endSession = async () => {
    setSessionDone(true)
    clearInterval(timerRef.current)

    if (apiKey && sessionLog.length > 0) {
      setLoading(true)
      try {
        const topicBreakdown = {}
        sessionLog.forEach(entry => {
          if (!topicBreakdown[entry.topic]) topicBreakdown[entry.topic] = { correct: 0, wrong: 0 }
          if (entry.correct) topicBreakdown[entry.topic].correct++
          else topicBreakdown[entry.topic].wrong++
        })

        const breakdown = Object.entries(topicBreakdown)
          .map(([t, s]) => `${t}: ${s.correct}/${s.correct + s.wrong} correct`)
          .join(', ')

        const response = await askAI(
          `Student just finished an AI study session. Results: ${correct} correct, ${wrong} wrong. ` +
          `Topic breakdown: ${breakdown}. ` +
          `Give a brief performance summary (2-3 sentences), then list 3 specific things to study next. Be encouraging.`
        )
        setAiSummary(response)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
  }

  // ═══════ RENDER: Session picker ═══════
  if (!started) {
    const profile = getWeaknessProfile()
    const lengths = [
      { min: 5, label: '5 min', desc: 'Quick review' },
      { min: 10, label: '10 min', desc: 'Short session' },
      { min: 20, label: '20 min', desc: 'Standard' },
      { min: 30, label: '30 min', desc: 'Deep dive' },
      { min: 45, label: '45 min', desc: 'Extended' },
      { min: 60, label: '1 hour', desc: 'Full session' },
    ]

    return (
      <div className="animate-fade-up">
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>🧠 AI Study Mode</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
          AI teaches you concepts, then tests your understanding with adaptive questions
        </p>

        {/* Focus Topic */}
        <div className="glass" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Focus Topic</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
            Choose a topic to focus on, or let AI decide based on your weaknesses
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={() => setFocusTopic('All')}
              className={`btn ${focusTopic === 'All' ? 'btn-green' : 'btn-ghost'}`}
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              🤖 AI Picks
            </button>
            {TOPICS.map(t => (
              <button
                key={t}
                onClick={() => setFocusTopic(t)}
                className={`btn ${focusTopic === t ? 'btn-green' : 'btn-ghost'}`}
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                {t}
              </button>
            ))}
          </div>
          {profile.topicScores && focusTopic === 'All' && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
              AI will focus on your weakest topic: <span style={{ color: '#ff453a' }}>
                {Object.entries(profile.topicScores).sort((a, b) => a[1] - b[1])[0]?.[0] || 'Tissues'}
              </span>
            </p>
          )}
        </div>

        {/* Session Length */}
        <div className="glass" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Session Length</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {lengths.map(l => (
              <button
                key={l.min}
                onClick={() => setSessionLength(l.min)}
                className="glass-interactive"
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: sessionLength === l.min ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
                  background: sessionLength === l.min ? 'rgba(34,197,94,0.1)' : 'rgba(15,23,42,0.4)',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: sessionLength === l.min ? '#22c55e' : '#fff' }}>
                  {l.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* What to expect */}
        <div className="glass" style={{ marginBottom: 24, background: 'rgba(34,197,94,0.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#22c55e' }}>How it works</h3>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            <p>1. AI explains key concepts for your weakest topics</p>
            <p>2. You get tested with MC, T/F, fill-blank, and written questions</p>
            <p>3. AI adapts based on your answers — more practice on what you get wrong</p>
            <p>4. After every 3 questions, AI re-teaches if you're struggling</p>
            <p>5. Session ends with a personalized summary and study tips</p>
          </div>
        </div>

        <button
          onClick={startSession}
          disabled={!sessionLength}
          className={`btn btn-lg ${sessionLength ? 'btn-green' : 'btn-ghost'}`}
          style={{ width: '100%', fontSize: 17, padding: '18px 0', opacity: sessionLength ? 1 : 0.5 }}
        >
          {sessionLength ? `Start ${sessionLength}-Minute Session` : 'Select a session length'}
        </button>

        {!apiKey && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
            💡 Add your OpenAI API key in Settings for AI-generated questions and explanations
          </p>
        )}
      </div>
    )
  }

  // ═══════ RENDER: Session done ═══════
  if (sessionDone) {
    const total = correct + wrong
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    return (
      <div className="animate-fade-up">
        <div className="glass" style={{ textAlign: 'center', padding: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>
            {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '💪' : '📚'}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Session Complete!</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            {sessionLength} minute AI study session
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="glass" style={{ padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>{correct}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Correct</div>
            </div>
            <div className="glass" style={{ padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ff453a' }}>{wrong}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Wrong</div>
            </div>
            <div className="glass" style={{ padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0a84ff' }}>{accuracy}%</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Accuracy</div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="glass" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>🤖 Generating your personalized summary...</p>
          </div>
        )}

        {aiSummary && (
          <div className="glass" style={{ marginBottom: 20, borderLeft: '3px solid #22c55e' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>🤖 AI Session Summary</h3>
            <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMd(aiSummary) }} />
          </div>
        )}

        <button onClick={() => { setStarted(false); setSessionLength(null) }} className="btn btn-green" style={{ width: '100%' }}>
          New Session
        </button>
      </div>
    )
  }

  // ═══════ RENDER: Active session ═══════
  return (
    <div className="animate-fade-up">
      {/* Timer bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🧠 AI Study</span>
          <TopicTag topic={currentTopic} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            ✅ {correct} · ❌ {wrong}
          </span>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: timeLeft < 60 ? '#ff453a' : timeLeft < 180 ? '#ff9f0a' : '#22c55e'
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: '#22c55e',
          width: `${(timeLeft / (sessionLength * 60)) * 100}%`,
          transition: 'width 1s linear'
        }} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass" style={{ padding: 32, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }} className="animate-pulse">🤖</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {phase === 'teach' ? 'Preparing your lesson...' : phase === 'feedback' ? 'Evaluating your answer...' : 'Generating a question...'}
          </p>
        </div>
      )}

      {/* Teach phase */}
      {phase === 'teach' && !loading && (
        <div>
          {aiError && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, fontSize: 13, background: 'rgba(255,159,10,0.1)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.2)' }}>
              ⚠️ {aiError}
            </div>
          )}
          <div className="glass" style={{ marginBottom: 16, borderLeft: '3px solid #0a84ff' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0a84ff', marginBottom: 12 }}>
              📖 Let's learn about {currentTopic}
            </h3>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.8)' }}
              dangerouslySetInnerHTML={{ __html: renderMd(teachContent) }} />
          </div>
          <button onClick={generateQuestion} className="btn btn-green" style={{ width: '100%', fontSize: 16, padding: '16px 0' }}>
            I'm ready — test me! →
          </button>
        </div>
      )}

      {/* Question phase */}
      {phase === 'question' && !loading && currentQuestion && (
        <div>
          <div className="glass" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>
              Question {questionNumber} · {currentQuestion.type === 'mc' ? 'Multiple Choice' : currentQuestion.type === 'tf' ? 'True/False' : currentQuestion.type === 'fill' ? 'Fill in the Blank' : 'Written Answer'}
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>
              {currentQuestion.question || currentQuestion.statement}
            </p>
          </div>

          {/* MC options */}
          {currentQuestion.type === 'mc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  style={{
                    padding: '14px 18px', borderRadius: 14, fontSize: 14, textAlign: 'left',
                    background: selectedOption === i ? 'rgba(34,197,94,0.15)' : 'rgba(15,23,42,0.6)',
                    border: selectedOption === i ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* TF options */}
          {currentQuestion.type === 'tf' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {['True', 'False'].map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => setSelectedOption(i)}
                  style={{
                    padding: '18px', borderRadius: 14, fontSize: 16, fontWeight: 700, textAlign: 'center',
                    background: selectedOption === i ? 'rgba(34,197,94,0.15)' : 'rgba(15,23,42,0.6)',
                    border: selectedOption === i ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)',
                    color: '#fff', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >
                  {opt === 'True' ? '✅' : '❌'} {opt}
                </button>
              ))}
            </div>
          )}

          {/* Fill blank input */}
          {currentQuestion.type === 'fill' && (
            <div style={{ marginBottom: 16 }}>
              <input
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && userAnswer.trim() && submitAnswer()}
                placeholder="Type your answer..."
                autoFocus
                style={{ fontSize: 16, marginBottom: 8 }}
              />
            </div>
          )}

          {/* Written answer */}
          {currentQuestion.type === 'explain' && (
            <div style={{ marginBottom: 16 }}>
              <textarea
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="Write your answer... (be thorough)"
                rows={4}
                style={{ fontSize: 14, resize: 'vertical', minHeight: 100 }}
              />
            </div>
          )}

          <button
            onClick={submitAnswer}
            disabled={
              (currentQuestion.type === 'mc' && selectedOption === null) ||
              (currentQuestion.type === 'tf' && selectedOption === null) ||
              ((currentQuestion.type === 'fill' || currentQuestion.type === 'explain') && !userAnswer.trim())
            }
            className="btn btn-green"
            style={{ width: '100%', fontSize: 16, padding: '16px 0', opacity: selectedOption !== null || userAnswer.trim() ? 1 : 0.5 }}
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Feedback phase */}
      {phase === 'feedback' && !loading && feedback && (
        <div>
          <div className="glass" style={{
            marginBottom: 16,
            borderLeft: `3px solid ${feedback.correct ? '#22c55e' : '#ff453a'}`,
            background: feedback.correct ? 'rgba(34,197,94,0.06)' : 'rgba(255,69,58,0.06)',
          }}>
            <div style={{ fontSize: 15, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMd(feedback.message) }} />
            {feedback.modelAnswer && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 700 }}>MODEL ANSWER</div>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>{feedback.modelAnswer}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={nextAction} className="btn btn-green" style={{ flex: 1, fontSize: 15, padding: '14px 0' }}>
              Continue →
            </button>
            <button onClick={endSession} className="btn btn-ghost" style={{ padding: '14px 20px', fontSize: 13 }}>
              End Session
            </button>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
