'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { FLASHCARDS, MULTIPLE_CHOICE, TRUE_FALSE, LEVELS, ACHIEVEMENTS } from '@/data/questions'
import { ProgressRing, TopicTag } from './shared'
import { aiStudyPlan } from '@/lib/store'

export function Dashboard() {
  const { user, xp, masteredCards, achievements, getDueCards, getLevel, apiKey, generateStudyPlan, getWeaknessProfile, studyHistory, testDate, sessionHistory } = useApp()
  const [aiPlan, setAiPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [weaknessProfile, setWeaknessProfile] = useState(null)
  const [daysUntilTest, setDaysUntilTest] = useState(null)
  const [testUrgency, setTestUrgency] = useState(null)

  useEffect(() => {
    // Generate weakness profile (local computation - always works)
    setWeaknessProfile(getWeaknessProfile())
  }, [])

  useEffect(() => {
    // Calculate days until test
    if (testDate) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const test = new Date(testDate)
      test.setHours(0, 0, 0, 0)
      const diff = Math.ceil((test - now) / (1000 * 60 * 60 * 24))
      setDaysUntilTest(diff)
      
      if (diff <= 0) setTestUrgency('past')
      else if (diff < 3) setTestUrgency('critical')
      else if (diff < 7) setTestUrgency('warning')
      else setTestUrgency('normal')
    }
  }, [testDate])

  useEffect(() => {
    if (apiKey && !aiPlan) {
      setPlanLoading(true)
      generateStudyPlan().then(plan => {
        setAiPlan(plan)
        setPlanLoading(false)
      }).catch(err => {
        console.error('Error generating plan:', err)
        setPlanLoading(false)
      })
    }
  }, [apiKey, generateStudyPlan])

  const dueCards = getDueCards(FLASHCARDS)
  const level = getLevel()
  const levelInfo = LEVELS.find(l => l.level === level)

  // Calculate time studied
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const timeStudiedToday = (studyHistory || [])
    .filter(h => h.timestamp.startsWith(today))
    .reduce((acc, h) => acc + (h.timeSpent || 0), 0)
  const timeStudiedWeek = (studyHistory || [])
    .filter(h => h.timestamp.startsWith(weekAgo) || h.timestamp > weekAgo)
    .reduce((acc, h) => acc + (h.timeSpent || 0), 0)

  const stats = [
    { label: 'Mastered', value: masteredCards.length, icon: '✅' },
    { label: 'Due Today', value: dueCards.length, icon: '📌' },
    { label: 'Achievements', value: achievements.length, icon: '🏆' },
    { label: 'Study Streak', value: '0 days', icon: '🔥' },
  ]

  const modes = [
    { name: 'Flashcards', icon: '🎴', desc: 'Spaced repetition', color: 'linear-gradient(135deg, #0a84ff 0%, #30d158 100%)' },
    { name: 'Quiz', icon: '❓', desc: '15 questions', color: 'linear-gradient(135deg, #30d158 0%, #ff9f0a 100%)' },
    { name: 'Speed Round', icon: '⚡', desc: '8 sec timer', color: 'linear-gradient(135deg, #ff9f0a 0%, #ff453a 100%)' },
    { name: 'Cram Mode', icon: '📚', desc: 'Quick review', color: 'linear-gradient(135deg, #ff453a 0%, #bf5af2 100%)' },
    { name: 'Guided Study', icon: '📖', desc: 'Learn & test', color: 'linear-gradient(135deg, #bf5af2 0%, #0a84ff 100%)' },
    { name: 'Practice Test', icon: '📝', desc: '25 questions', color: 'linear-gradient(135deg, #0a84ff 0%, #ff453a 100%)' },
    { name: 'Diagram Labels', icon: '🔬', desc: 'Label diagrams', color: 'linear-gradient(135deg, #ff453a 0%, #ff9f0a 100%)' },
    { name: 'Fill in Blank', icon: '✏️', desc: 'Type answers', color: 'linear-gradient(135deg, #ff9f0a 0%, #30d158 100%)' },
    { name: 'Ordering', icon: '🔢', desc: 'Build sequences', color: 'linear-gradient(135deg, #30d158 0%, #bf5af2 100%)' },
    { name: 'Matching', icon: '🔗', desc: 'Connect pairs', color: 'linear-gradient(135deg, #bf5af2 0%, #ff9f0a 100%)' },
    { name: 'AI Study', icon: '🧠', desc: 'AI-powered', color: 'linear-gradient(135deg, #64d2ff 0%, #30d158 100%)' },
    { name: 'Wrong Review', icon: '🔄', desc: 'Fix mistakes', color: 'linear-gradient(135deg, #ff9f0a 0%, #bf5af2 100%)' },
    { name: 'AI Tutor', icon: '🤖', desc: 'Chat with AI', color: 'linear-gradient(135deg, #ff9f0a 0%, #bf5af2 100%)' },
  ]

  const getTestUrgencyColor = () => {
    if (testUrgency === 'critical') return 'rgba(255,69,58,0.12)'
    if (testUrgency === 'warning') return 'rgba(255,159,10,0.12)'
    return 'rgba(48,209,88,0.12)'
  }

  const getTestUrgencyBorder = () => {
    if (testUrgency === 'critical') return '#ff453a'
    if (testUrgency === 'warning') return '#ff9f0a'
    return '#30d158'
  }

  const getTestAdvice = () => {
    if (!daysUntilTest) return ''
    if (daysUntilTest <= 0) return 'Test day is here! Go show what you\'ve learned!'
    if (daysUntilTest <= 1) return 'Test tomorrow! Do a final review session and get good rest.'
    if (daysUntilTest <= 3) return 'Test in ' + daysUntilTest + ' days. Focus on weak areas and do practice tests.'
    if (daysUntilTest <= 7) return 'Test in ' + daysUntilTest + ' days. Balanced review of all topics.'
    return 'Test in ' + daysUntilTest + ' days. Build a strong foundation across all topics.'
  }

  const recentSessions = (sessionHistory || []).slice(-10).reverse()

  return (
    <div className="page-container" style={{ paddingTop: '24px', animation: 'fadeUp 0.6s ease-out' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
        Welcome, {user}! 👋
      </h1>
      <p style={{ color: '#a1a1a6', marginBottom: '24px', fontSize: '14px' }}>
        You're a {levelInfo?.title || 'Novice'}. Keep learning!
      </p>

      {/* Test Date Countdown */}
      {testDate && daysUntilTest !== null && (
        <div className="card" style={{
          marginBottom: '24px',
          background: getTestUrgencyColor(),
          borderLeft: `4px solid ${getTestUrgencyBorder()}`,
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#a1a1a6', fontWeight: '700', marginBottom: '4px' }}>
                TEST COUNTDOWN
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: testUrgency === 'critical' ? '#ff453a' : testUrgency === 'warning' ? '#ff9f0a' : '#30d158' }}>
                {daysUntilTest > 0 ? daysUntilTest + ' days' : 'Today!'}
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1a6', lineHeight: '1.5' }}>
                {getTestAdvice()}
              </div>
            </div>
            <div style={{ fontSize: '40px', opacity: 0.7 }}>📅</div>
          </div>
        </div>
      )}

      <div className="grid-2col" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {stats.map((stat, i) => (
          <div key={i} className="card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{ fontSize: '24px' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#a1a1a6' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '16px', fontWeight: '700' }}>
          ⏱️ TIME STUDIED
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {Math.floor(timeStudiedToday / 60)}m
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1a6' }}>Today</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {(timeStudiedWeek / 3600).toFixed(1)}h
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1a6' }}>This Week</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '8px' }}>
          LEVEL PROGRESS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${((xp - (levelInfo?.xp || 0)) / ((LEVELS[level]?.xp || 2700) - (levelInfo?.xp || 0))) * 100}%`,
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600' }}>
            {xp} / {LEVELS[Math.min(level, 9)]?.xp || 2700} XP
          </div>
        </div>
      </div>

      {apiKey && aiPlan && (
        <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.15), rgba(10, 132, 255, 0.1))' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#30d158' }}>
            🤖 Your AI Study Plan
          </div>
          <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '4px' }}>
            Today's Focus: <span style={{ fontWeight: '600', color: '#fff' }}>{aiPlan.focus}</span>
          </div>
          {weaknessProfile && (
            <div style={{ fontSize: '12px', color: '#a1a1a6', marginBottom: '12px' }}>
              Test Readiness: <span style={{ fontWeight: '700', color: '#30d158' }}>{weaknessProfile.predictedTestReadiness}%</span>
            </div>
          )}
          <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
            {aiPlan.message}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {aiPlan.activities && aiPlan.activities.slice(0, 4).map((activity, i) => (
              <button key={i} className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 12px' }}>
                {activity}
              </button>
            ))}
          </div>
        </div>
      )}

      {apiKey && planLoading && (
        <div className="card" style={{ marginBottom: '24px', background: 'rgba(48, 209, 88, 0.1)' }}>
          <div style={{ fontSize: '13px', color: '#a1a1a6' }}>⏳ Generating AI study plan...</div>
        </div>
      )}

      {weaknessProfile && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '12px', fontWeight: '700' }}>
            📊 TOPIC STRENGTH
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
            {Object.entries(weaknessProfile.topicScores).map(([topic, score]) => (
              <div key={topic}>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>{topic}</div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${score}%`,
                    background: score >= 80 ? '#30d158' : score >= 60 ? '#ff9f0a' : '#ff453a',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '12px', fontWeight: '700' }}>
            📈 RECENT SESSIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSessions.map((session, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto',
                gap: '12px',
                alignItems: 'center',
                paddingBottom: '8px',
                borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                <div style={{ fontSize: '16px' }}>
                  {session.mode === 'flashcard' ? '🃏' : session.mode === 'quiz' ? '❓' : '⚡'}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>{session.topic}</div>
                  <div style={{ fontSize: '10px', color: '#a1a1a6' }}>{session.mode}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: session.score >= session.total * 0.8 ? '#30d158' : '#ff9f0a' }}>
                  {session.score}/{session.total}
                </div>
                <div style={{ fontSize: '10px', color: '#a1a1a6' }}>
                  {Math.round(session.duration / 60)}m ago
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
        Study Modes
      </h2>
      <div className="grid-2col" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {modes.map((mode, i) => (
          <div key={i} className="card" style={{
            background: mode.color,
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }} onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(48, 209, 88, 0.2)'
          }} onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{mode.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{mode.name}</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>{mode.desc}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
        Recent Achievements
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}>
        {ACHIEVEMENTS.slice(0, 9).map((ach, i) => (
          <div
            key={i}
            className="card"
            style={{
              textAlign: 'center',
              opacity: achievements.includes(ach.id) ? 1 : 0.4,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{ach.icon}</div>
            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}>
              {ach.name}
            </div>
            <div style={{ fontSize: '10px', color: '#a1a1a6' }}>
              {ach.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
