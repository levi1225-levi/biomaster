'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Nav } from '@/components/Nav'
import { Dashboard } from '@/components/Dashboard'
import { Flashcards } from '@/components/Flashcards'
import { Quiz } from '@/components/Quiz'
import { SpeedRound } from '@/components/SpeedRound'
import { CramMode } from '@/components/CramMode'
import { GuidedStudy } from '@/components/GuidedStudy'
import { PracticeTest } from '@/components/PracticeTest'
import { DiagramLabelling } from '@/components/DiagramLabelling'
import { AITutor } from '@/components/AITutor'
import { Notes } from '@/components/Notes'
import { Analytics } from '@/components/Analytics'
import { Settings } from '@/components/Settings'
import { FillInBlank } from '@/components/FillInBlank'
import { Ordering } from '@/components/Ordering'
import { Matching } from '@/components/Matching'
import { AIStudyMode } from '@/components/AIStudyMode'
import { WrongReview } from '@/components/WrongReview'

function AuthScreen({ onLogin, onRegister }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    setLoading(true)
    try {
      await onRegister(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="card-lg" style={{
        maxWidth: '400px',
        width: '100%',
        animation: 'fadeUp 0.6s ease-out',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>📚</div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: '700', textAlign: 'center' }}>
          BioMaster
        </h1>
        <p style={{ color: '#a1a1a6', marginBottom: '24px', fontSize: '14px', textAlign: 'center' }}>
          Master SNC2D Biology with interactive study tools
        </p>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #424245',
        }}>
          <button
            onClick={() => { setTab('login'); setError(''); setPassword(''); setConfirmPassword('') }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'none',
              color: tab === 'login' ? '#30d158' : '#a1a1a6',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              borderBottom: tab === 'login' ? '2px solid #30d158' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); setPassword(''); setConfirmPassword('') }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'none',
              color: tab === 'register' ? '#30d158' : '#a1a1a6',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              borderBottom: tab === 'register' ? '2px solid #30d158' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Create Account
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              style={{ marginBottom: '12px' }}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              style={{ marginBottom: '16px' }}
              disabled={loading}
            />
            {error && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 69, 58, 0.1)',
                color: '#ff453a',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              style={{ marginBottom: '12px' }}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              style={{ marginBottom: '12px' }}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              style={{ marginBottom: '16px' }}
              disabled={loading}
            />
            {error && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 69, 58, 0.1)',
                color: '#ff453a',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div style={{
          marginTop: '20px',
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(48, 209, 88, 0.1)',
          fontSize: '13px',
          color: '#a1a1a6',
        }}>
          <p style={{ marginBottom: '8px' }}>Welcome! This app includes:</p>
          <ul style={{ textAlign: 'left', lineHeight: '1.8' }}>
            <li>72 flashcards with spaced repetition</li>
            <li>57 multiple choice questions</li>
            <li>24 true/false questions</li>
            <li>Interactive diagrams</li>
            <li>AI tutor with OpenAI integration</li>
            <li>Progress tracking & achievements</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user, loginUser, registerUser } = useApp()
  const [currentPage, setCurrentPage] = useState('Home')

  const renderPage = () => {
    switch (currentPage) {
      case 'Home': return <Dashboard />
      case 'Cards': return <Flashcards />
      case 'Quiz': return <Quiz />
      case 'Learn': return <GuidedStudy />
      case 'Speed': return <SpeedRound />
      case 'Cram': return <CramMode />
      case 'Test': return <PracticeTest />
      case 'Label': return <DiagramLabelling />
      case 'Fill': return <FillInBlank />
      case 'Order': return <Ordering />
      case 'Match': return <Matching />
      case 'AI Study': return <AIStudyMode />
      case 'Review': return <WrongReview />
      case 'AI Tutor': return <AITutor />
      case 'Notes': return <Notes />
      case 'Stats': return <Analytics />
      case 'Settings': return <Settings />
      default: return <Dashboard />
    }
  }

  if (!user) {
    return <AuthScreen onLogin={loginUser} onRegister={registerUser} />
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="page-container">
        {renderPage()}
      </div>
    </div>
  )
}
