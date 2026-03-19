'use client'

import { useState } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { FIB } from '@/data/questions'
import { TopicTag } from './shared'

export function FillInBlank() {
  const app = useApp()
  const { apiKey, askAI, recordAction } = app
  const addXp = app.addXp || (() => {})
  const doLog = app.doLog || (() => {})
  const [on, setOn] = useState(false)
  const [idx, setIdx] = useState(0)
  const [ans, setAns] = useState('')
  const [checked, setChecked] = useState(false)
  const [ok, setOk] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [aiMnemonic, setAiMnemonic] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [qs] = useState(() => [...FIB].sort(() => Math.random() - 0.5))

  const getMnemonic = async () => {
    const q = qs[idx]
    setAiLoading(true)
    try {
      const response = await askAI(`Create a memorable mnemonic or memory trick to remember the answer "${q.a[0]}" for the question "${q.q}". Keep it short and creative.`)
      setAiMnemonic(response)
    } catch(e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  if (!on) return (
    <div className="page-container animate-fade-up text-center">
      <h1 className="text-2xl font-bold mb-6">✏️ Fill in the Blank</h1>
      <div className="glass p-8">
        <p className="text-white/70 mb-2 text-lg">{FIB.length} questions</p>
        <p className="text-white/40 text-sm mb-6">Type the missing word</p>
        <button onClick={() => setOn(true)} className="btn btn-green text-lg px-8 py-4">Start</button>
      </div>
    </div>
  )

  if (done) return (
    <div className="page-container animate-fade-up text-center">
      <div className="glass p-10">
        <div className="text-6xl mb-4">{score >= qs.length * 0.8 ? '🎉' : '📚'}</div>
        <div className="text-4xl font-black mb-2">{score}/{qs.length}</div>
        <div className="text-white/40 mb-6">{Math.round(score / qs.length * 100)}%</div>
        <button onClick={() => { setOn(false); setIdx(0); setScore(0); setDone(false); setChecked(false); setAns(''); setAiMnemonic(null) }} className="btn btn-green px-8 py-3">Try Again</button>
      </div>
    </div>
  )

  const q = qs[idx]
  const check = () => {
    const isOk = q.a.some(a => a.toLowerCase() === ans.trim().toLowerCase())
    setOk(isOk)
    setChecked(true)
    recordAction('fillblank', q.t, q.id, isOk)
    if (isOk) {
      setScore(s => s + 1)
      addXp(10)
    } else if (apiKey) {
      getMnemonic()
    }
    doLog()
  }
  const next = () => { 
    if (idx + 1 >= qs.length) setDone(true)
    else { 
      setIdx(i => i + 1)
      setAns('')
      setChecked(false)
      setAiMnemonic(null)
    } 
  }

  return (
    <div className="page-container animate-fade-up">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">✏️ Fill in the Blank</h2>
        <span className="text-sm text-white/40">Q{idx + 1}/{qs.length} · {score} pts</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full mb-6 overflow-hidden"><div className="progress-bar-fill bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${((idx + 1) / qs.length) * 100}%` }} /></div>
      <div className="glass p-6 mb-4"><TopicTag topic={q.t} /><p className="text-lg font-semibold mt-3">{q.q}</p></div>
      {!checked ? (
        <div className="space-y-3">
          <input value={ans} onChange={e => setAns(e.target.value)} onKeyDown={e => e.key === 'Enter' && ans.trim() && check()} placeholder="Type your answer..." autoFocus />
          <button onClick={check} disabled={!ans.trim()} className={`btn w-full py-4 ${ans.trim() ? 'btn-green' : 'btn-ghost opacity-50'}`}>Check</button>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up">
          <div className={`glass p-4 ${ok ? 'border-2 border-green-500' : 'border-2 border-red-500'}`}>
            <p className="font-bold">{ok ? '✅ Correct!' : '❌ Incorrect'}</p>
            {!ok && <p className="text-sm text-green-400 mt-1">Answer: {q.a[0]}</p>}
          </div>
          {!ok && apiKey && (
            <>
              <button onClick={getMnemonic} disabled={aiLoading} className="btn btn-secondary w-full py-3" style={{ fontSize: '13px' }}>
                {aiLoading ? '⏳ Loading...' : aiMnemonic ? '🤖 Mnemonic' : '🤖 Remember This'}
              </button>
              {aiMnemonic && (
                <div className="glass p-4" style={{ fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: renderMd(aiMnemonic) }} />
              )}
            </>
          )}
          <button onClick={next} className="btn btn-green w-full py-4">{idx + 1 >= qs.length ? 'See Results' : 'Next →'}</button>
        </div>
      )}
    </div>
  )
}
