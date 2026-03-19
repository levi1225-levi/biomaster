'use client'

import { useState } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { SHORT_ANSWER } from '@/data/questions'
import { TopicTag } from './shared'

export function ShortAnswer() {
  const { apiKey, askAI, recordAction } = useApp()
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [aiEval, setAiEval] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [questions] = useState(() => [...SHORT_ANSWER].sort(() => Math.random() - 0.5))

  const evaluateAnswer = async () => {
    if (!answer.trim()) return

    const q = questions[idx]
    setAiLoading(true)
    setSubmitted(true)

    try {
      if (!apiKey) {
        // Basic word overlap check without API
        const studentWords = answer.toLowerCase().split(/\s+/)
        const keyPointWords = q.keyPoints.join(' ').toLowerCase().split(/\s+/)
        const hitKeyPoints = q.keyPoints.filter(kp => {
          const kpWords = kp.toLowerCase().split(/\s+/)
          return kpWords.some(word => studentWords.includes(word))
        })

        const baseScore = Math.round((hitKeyPoints.length / q.keyPoints.length) * 100)
        setAiEval({
          score: Math.min(baseScore + 20, 100),
          feedback: `Good effort! You covered ${hitKeyPoints.length}/${q.keyPoints.length} key points.`,
          keyPointsHit: hitKeyPoints,
        })
        setScore(prev => prev + Math.round(baseScore / 2))
      } else {
        // Use GPT to evaluate
        const prompt = `Student answered: "${answer}"
Question: "${q.q}"
Key points: ${q.keyPoints.join(', ')}
Model answer: "${q.modelAnswer}"

Rate 0-100 and give brief feedback. Return ONLY valid JSON (no markdown):
{
  "score": number,
  "feedback": "string",
  "keyPointsHit": ["string array of key points they hit"]
}`

        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 200,
            messages: [
              { role: 'system', content: 'You are a biology teacher grading student responses. Be encouraging but honest.' },
              { role: 'user', content: prompt }
            ]
          })
        })

        const d = await r.json()
        let evalText = d.choices[0].message.content.trim()

        // Strip markdown code blocks if present
        evalText = evalText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

        const evaluation = JSON.parse(evalText)
        setAiEval(evaluation)
        setScore(prev => prev + Math.round(evaluation.score / 2))
      }

      recordAction('short_answer', q.t, q.id, true, 0)
    } catch (e) {
      console.error('Evaluation error:', e)
      setAiEval({
        score: 0,
        feedback: 'Error evaluating answer. Please try again.',
        keyPointsHit: [],
      })
    } finally {
      setAiLoading(false)
    }
  }

  const nextQuestion = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1)
      setAnswer('')
      setSubmitted(false)
      setAiEval(null)
    } else {
      setDone(true)
    }
  }

  // Start screen
  if (!started) {
    return (
      <div className="page-container animate-fade-up text-center">
        <h1 className="text-2xl font-bold mb-6">✍️ Short Answer</h1>
        <div className="glass p-8">
          <p className="text-white/70 mb-2 text-lg">{SHORT_ANSWER.length} questions</p>
          <p className="text-white/40 text-sm mb-6">Write detailed responses and get AI feedback</p>
          <button onClick={() => setStarted(true)} className="btn btn-green text-lg px-8 py-4">Start</button>
        </div>
      </div>
    )
  }

  // Done screen
  if (done) {
    return (
      <div className="page-container animate-fade-up text-center">
        <div className="glass p-10">
          <div className="text-6xl mb-4">{score >= questions.length * 40 ? '🎉' : '📚'}</div>
          <div className="text-4xl font-black mb-2">{Math.round(score)}/{questions.length * 50}</div>
          <div className="text-white/40 mb-6">{Math.round((score / (questions.length * 50)) * 100)}%</div>
          <button
            onClick={() => {
              setStarted(false)
              setIdx(0)
              setScore(0)
              setDone(false)
              setAnswer('')
              setSubmitted(false)
              setAiEval(null)
            }}
            className="btn btn-green px-8 py-3"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const q = questions[idx]

  return (
    <div className="page-container animate-fade-up py-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <TopicTag topic={q.t} />
        <span className="text-white/40 text-sm">
          Question {idx + 1} of {questions.length}
        </span>
      </div>

      <div className="glass p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{q.q}</h2>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your detailed answer here..."
          disabled={submitted || aiLoading}
          className="input w-full"
          style={{
            minHeight: '150px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />

        {!submitted ? (
          <button
            onClick={evaluateAnswer}
            disabled={!answer.trim() || aiLoading}
            className="btn btn-green w-full mt-4"
          >
            {aiLoading ? 'Evaluating...' : 'Submit Answer'}
          </button>
        ) : null}
      </div>

      {aiEval && (
        <div className="glass p-6 mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div className="text-4xl font-black" style={{ color: '#30d158' }}>
              {Math.round(aiEval.score)}
            </div>
            <span className="text-white/60">/ 100</span>
          </div>

          <p className="text-white mb-4">{aiEval.feedback}</p>

          <div style={{ marginBottom: '16px' }}>
            <h4 className="text-sm font-semibold text-white/70 mb-2">Key Points Covered:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {q.keyPoints.map((kp, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: aiEval.keyPointsHit?.includes(kp) ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 159, 10, 0.1)',
                    color: aiEval.keyPointsHit?.includes(kp) ? '#30d158' : '#ff9f0a',
                    fontSize: '14px',
                  }}
                >
                  {aiEval.keyPointsHit?.includes(kp) ? '✓' : '○'} {kp}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 159, 10, 0.1)', color: '#ff9f0a', fontSize: '13px' }}>
            <strong>Model Answer:</strong>
            <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{q.modelAnswer}</p>
          </div>

          <button onClick={nextQuestion} className="btn btn-green w-full">
            {idx + 1 === questions.length ? 'View Results' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  )
}
