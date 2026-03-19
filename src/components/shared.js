'use client'

import { useState, useEffect } from 'react'

export function Confetti() {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 3000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  const colors = ['#30d158','#0a84ff','#ff453a','#ff9f0a','#bf5af2','#ffd60a','#ff375f','#64d2ff'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {Array.from({length: 30}).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${Math.random() * 100}%`, top: -10,
          width: 8 + Math.random() * 8, height: 8 + Math.random() * 8,
          background: colors[Math.floor(Math.random() * colors.length)],
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confettiDrop ${2 + Math.random() * 2}s ease-out ${Math.random() * 0.5}s forwards`
        }} />
      ))}
    </div>
  );
}

export function ProgressRing({ percentage, size = 120, label = '' }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="progress-ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2c2c2e"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#30d158"
          strokeWidth="4"
          className="progress-ring-circle"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="progress-ring-text">
        <div style={{ fontSize: '18px', fontWeight: '700' }}>
          {percentage}%
        </div>
        {label && <div style={{ fontSize: '11px', marginTop: '2px', color: '#a1a1a6' }}>
          {label}
        </div>}
      </div>
    </div>
  )
}

export function TopicTag({ topic }) {
  const topicClass = topic.toLowerCase()
  return (
    <span className={`topic-tag ${topicClass}`}>
      {topic}
    </span>
  )
}

export function AchievementPopup({ achievement, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
    }} className="animate-slideIn">
      <div className="card-lg" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        minWidth: '200px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px' }}>{achievement.icon}</div>
        <div style={{ fontWeight: '700' }}>{achievement.name}</div>
        <div style={{ fontSize: '13px', color: '#a1a1a6' }}>
          {achievement.desc}
        </div>
      </div>
    </div>
  )
}
