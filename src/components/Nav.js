'use client'

import { useApp } from '@/lib/store'
import { LEVELS } from '@/data/questions'

export function Nav({ currentPage, onPageChange }) {
  const { xp, getLevel } = useApp()
  const level = getLevel()
  const lvl = LEVELS.find(l => l.level === level)

  const pages = [
    { id: 'Home', icon: '🏠' },
    { id: 'Cards', icon: '🃏' },
    { id: 'Quiz', icon: '❓' },
    { id: 'Learn', icon: '📖' },
    { id: 'Speed', icon: '⚡' },
    { id: 'Cram', icon: '💪' },
    { id: 'Test', icon: '📝' },
    { id: 'Label', icon: '🫀' },
    { id: 'Fill', icon: '✏️' },
    { id: 'Order', icon: '🔢' },
    { id: 'Match', icon: '🔗' },
    { id: 'AI Study', icon: '🧠' },
    { id: 'Review', icon: '🔄' },
    { id: 'AI Tutor', icon: '🤖' },
    { id: 'Notes', icon: '📘' },
    { id: 'Stats', icon: '📊' },
    { id: 'Settings', icon: '⚙️' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(5,11,24,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="max-w-5xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <span className="text-xl">🧬</span>
            <span className="font-extrabold text-[#22c55e] text-base hidden sm:inline">Bio</span>
            <span className="text-xs bg-[#22c55e]/15 text-[#22c55e] px-2 py-0.5 rounded-full font-bold hidden md:inline">
              Lv{level} {lvl?.title || ''}
            </span>
          </div>
          <div className="flex-1 flex gap-1.5 overflow-x-auto scroll-hide py-1">
            {pages.map(p => (
              <button
                key={p.id}
                onClick={() => onPageChange(p.id)}
                className={`nav-pill ${currentPage === p.id ? 'active' : ''}`}
              >
                <span>{p.icon}</span>
                <span className="hidden sm:inline">{p.id}</span>
              </button>
            ))}
          </div>
          <div className="shrink-0 text-xs font-bold text-[#22c55e]">{xp} XP</div>
        </div>
      </div>
    </nav>
  )
}
