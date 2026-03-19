'use client'

import { useState, useMemo } from 'react'
import { useApp, renderMd } from '@/lib/store'
import { MATCH } from '@/data/questions'

export function Matching() {
  const app = useApp()
  const { apiKey, askAI, recordAction } = app
  const addXp = app.addXp || (() => {})
  const doLog = app.doLog || (() => {})
  const [selected, setSelected] = useState(null)
  const [pickedTerm, setPickedTerm] = useState(null)
  const [connections, setConnections] = useState({})
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [aiExplanation, setAiExplanation] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const shuffledDefs = useMemo(() => {
    if (!selected) return []
    return [...selected.pairs.map(p => p.def)].sort(() => Math.random() - 0.5)
  }, [selected])

  const start = (set) => { setSelected(set); setPickedTerm(null); setConnections({}); setChecked(false); setScore(0); setAiExplanation(null) }

  const pickDef = (def) => {
    if (!pickedTerm || checked) return
    setConnections(c => ({ ...c, [pickedTerm]: def }))
    setPickedTerm(null)
  }

  const check = () => {
    const s = selected.pairs.filter(p => connections[p.term] === p.def).length
    const isCorrect = s === selected.pairs.length
    recordAction('matching', selected.t, selected.id, isCorrect)
    setScore(s)
    setChecked(true)
    addXp(s * 5)
    doLog()
    if (s < selected.pairs.length && apiKey) {
      getExplanation()
    }
  }

  const getExplanation = async () => {
    if (!selected) return
    setAiLoading(true)
    try {
      const wrong = selected.pairs.filter(p => connections[p.term] !== p.def)
      const mistakes = wrong.map(p => `${p.term} (you said: ${connections[p.term] || 'skipped'})`).join(', ')
      const response = await askAI(`Student is learning matching concepts. They got these wrong: ${mistakes}. Briefly explain why each one is important to understand correctly.`)
      setAiExplanation(response)
    } catch(e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  const connectedDefs = Object.values(connections)

  if (!selected) return (
    <div className="page-container animate-fade-up">
      <h1 className="text-2xl font-bold mb-6">🔗 Matching</h1>
      <p className="text-white/40 text-sm mb-6">Connect terms with their definitions</p>
      <div className="space-y-3">
        {MATCH.map(set => (
          <button key={set.id} onClick={() => start(set)} className="glass glass-interactive w-full p-5 text-left">
            <div className="font-bold text-lg">{set.title}</div>
            <div className="text-sm text-white/40 mt-1">{set.pairs.length} pairs · {set.t}</div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-container animate-fade-up">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔗 {selected.title}</h2>
        <button onClick={() => setSelected(null)} className="btn btn-ghost text-sm">← Back</button>
      </div>

      {checked && (
        <div className={`glass p-4 mb-4 text-center border-2 ${score === selected.pairs.length ? 'border-green-500' : 'border-orange-500'}`}>
          <span className="text-xl font-black">{score}/{selected.pairs.length} correct {score === selected.pairs.length && '🎉'}</span>
        </div>
      )}

      <p className="text-xs text-white/40 mb-4">
        {pickedTerm ? `Selected "${pickedTerm}" — now click a definition` : 'Click a term, then click its matching definition'}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-white/50 mb-1">TERMS</p>
          {selected.pairs.map(p => {
            const isConnected = connections[p.term]
            const isPicked = pickedTerm === p.term
            const isOk = checked && connections[p.term] === p.def
            const isWrong = checked && connections[p.term] && connections[p.term] !== p.def
            return (
              <button key={p.term} onClick={() => { if (checked) return; if (isConnected && !checked) { setConnections(c => { const n = { ...c }; delete n[p.term]; return n }); return } setPickedTerm(isPicked ? null : p.term) }}
                className={`w-full p-3 rounded-xl text-sm font-semibold text-left transition border-2 ${
                  isOk ? 'bg-green-500/15 border-green-500 text-green-400' :
                  isWrong ? 'bg-red-500/15 border-red-500 text-red-400' :
                  isPicked ? 'bg-blue-500/15 border-blue-500 text-blue-400' :
                  isConnected ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' :
                  'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                {p.term}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-white/50 mb-1">DEFINITIONS</p>
          {shuffledDefs.map(def => {
            const isUsed = connectedDefs.includes(def)
            const matchedTerm = Object.entries(connections).find(([_, d]) => d === def)?.[0]
            const correctPair = selected.pairs.find(p => p.def === def)
            const isOk = checked && matchedTerm && correctPair && matchedTerm === correctPair.term
            const isWrong = checked && matchedTerm && correctPair && matchedTerm !== correctPair.term
            return (
              <button key={def} onClick={() => pickDef(def)} disabled={isUsed && !checked}
                className={`w-full p-3 rounded-xl text-xs text-left transition border-2 leading-relaxed ${
                  isOk ? 'bg-green-500/15 border-green-500 text-green-300' :
                  isWrong ? 'bg-red-500/15 border-red-500 text-red-300' :
                  isUsed ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 opacity-60' :
                  pickedTerm ? 'bg-white/5 border-orange-500/30 hover:border-orange-500 cursor-pointer' :
                  'bg-white/5 border-white/10'
                }`}>
                {def}
              </button>
            )
          })}
        </div>
      </div>

      {aiExplanation && (
        <div className="glass p-4 mt-4">
          <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#30d158' }}>
            🤖 AI Explanation
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: renderMd(aiExplanation) }} />
        </div>
      )}

      {aiLoading && (
        <div className="glass p-4 mt-4 text-center" style={{ color: '#a1a1a6', fontSize: '13px' }}>
          ⏳ Getting explanation...
        </div>
      )}

      <div className="flex gap-3 mt-6">
        {!checked ? (
          <button onClick={check} disabled={Object.keys(connections).length !== selected.pairs.length}
            className={`btn w-full ${Object.keys(connections).length === selected.pairs.length ? 'btn-green' : 'btn-ghost opacity-50'}`}>
            Check ({Object.keys(connections).length}/{selected.pairs.length})
          </button>
        ) : (
          <div className="flex gap-3 w-full">
            <button onClick={() => start(selected)} className="btn btn-green flex-1">Try Again</button>
            <button onClick={() => setSelected(null)} className="btn btn-ghost flex-1">Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
