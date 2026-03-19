'use client'

import { useState } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { ORD } from '@/data/questions'

export function Ordering() {
  const app = useApp()
  const { apiKey, askAI, recordAction } = app
  const addXp = app.addXp || (() => {})
  const doLog = app.doLog || (() => {})
  const [selected, setSelected] = useState(null)
  const [built, setBuilt] = useState([])
  const [pool, setPool] = useState([])
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [aiMnemonic, setAiMnemonic] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const start = (seq) => { setSelected(seq); setBuilt([]); setPool([...seq.seq].sort(() => Math.random() - 0.5)); setChecked(false); setScore(0); setAiMnemonic(null) }
  const addItem = (item) => { setBuilt(b => [...b, item]); setPool(p => p.filter(x => x !== item)) }
  const removeItem = (item) => { setBuilt(b => b.filter(x => x !== item)); setPool(p => [...p, item]) }
  const reset = () => { setBuilt([]); setPool([...selected.seq].sort(() => Math.random() - 0.5)); setChecked(false); setAiMnemonic(null) }
  
  const check = () => {
    const s = built.filter((item, i) => item === selected.seq[i]).length
    const isCorrect = s === selected.seq.length
    recordAction('ordering', selected.t, selected.id, isCorrect)
    setScore(s)
    setChecked(true)
    addXp(s * 5)
    doLog()
    if (s < selected.seq.length && apiKey) {
      getMnemonic()
    }
  }

  const getMnemonic = async () => {
    if (!selected) return
    setAiLoading(true)
    try {
      const sequence = selected.seq.join(' → ')
      const response = await askAI(`Create a memorable mnemonic or memory trick to remember this sequence: ${sequence}. Keep it short and creative.`)
      setAiMnemonic(response)
    } catch(e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  if (!selected) return (
    <div className="page-container animate-fade-up">
      <h1 className="text-2xl font-bold mb-6">🔢 Ordering</h1>
      <p className="text-white/40 text-sm mb-6">Put the items in the correct order</p>
      <div className="space-y-3">
        {ORD.map(seq => (
          <button key={seq.id} onClick={() => start(seq)} className="glass glass-interactive w-full p-5 text-left">
            <div className="font-bold text-lg">{seq.title}</div>
            <div className="text-sm text-white/40 mt-1">{seq.seq.length} items · {seq.t}</div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-container animate-fade-up">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔢 {selected.title}</h2>
        <button onClick={() => setSelected(null)} className="btn btn-ghost text-sm">← Back</button>
      </div>

      {checked && (
        <div className={`glass p-4 mb-4 text-center border-2 ${score === selected.seq.length ? 'border-green-500' : 'border-orange-500'}`}>
          <span className="text-xl font-black">{score}/{selected.seq.length} correct {score === selected.seq.length && '🎉'}</span>
        </div>
      )}

      <div className="glass p-4 mb-4">
        <p className="text-xs text-white/40 mb-3">Your sequence: ({built.length}/{selected.seq.length})</p>
        <div className="min-h-[48px] flex flex-wrap gap-2">
          {built.map((item, i) => {
            const isOk = checked && item === selected.seq[i]
            const isWrong = checked && item !== selected.seq[i]
            return (
              <button key={item + i} onClick={() => !checked && removeItem(item)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${isOk ? 'bg-green-500/20 text-green-400 border border-green-500' : isWrong ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                {i + 1}. {item}
              </button>
            )
          })}
          {built.length === 0 && <span className="text-white/20 text-sm">Click items below to build sequence...</span>}
        </div>
      </div>

      {!checked && (
        <div className="glass p-4 mb-4">
          <p className="text-xs text-white/40 mb-3">Available items:</p>
          <div className="flex flex-wrap gap-2">
            {pool.map(item => (
              <button key={item} onClick={() => addItem(item)} className="px-3 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition border border-white/10">
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {checked && score < selected.seq.length && aiMnemonic && (
        <div className="glass p-4 mb-4">
          <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#30d158' }}>
            🤖 Memory Trick
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: renderMd(aiMnemonic) }} />
        </div>
      )}

      {checked && score < selected.seq.length && aiLoading && (
        <div className="glass p-4 mb-4 text-center" style={{ color: '#a1a1a6', fontSize: '13px' }}>
          ⏳ Getting memory trick...
        </div>
      )}

      <div className="flex gap-3">
        {!checked ? (
          <>
            <button onClick={reset} className="btn btn-ghost flex-1">Reset</button>
            <button onClick={check} disabled={built.length !== selected.seq.length} className={`btn flex-1 ${built.length === selected.seq.length ? 'btn-green' : 'btn-ghost opacity-50'}`}>
              Check ({built.length}/{selected.seq.length})
            </button>
          </>
        ) : (
          <>
            <button onClick={() => start(selected)} className="btn btn-green flex-1">Try Again</button>
            <button onClick={() => setSelected(null)} className="btn btn-ghost flex-1">Back</button>
          </>
        )}
      </div>

      {checked && score !== selected.seq.length && (
        <div className="glass p-4 mt-4">
          <p className="text-xs text-white/40 mb-2">Correct order:</p>
          <div className="flex flex-wrap gap-2">
            {selected.seq.map((item, i) => (
              <span key={i} className="text-sm text-green-400">{i + 1}. {item}{i < selected.seq.length - 1 ? ' →' : ''}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
