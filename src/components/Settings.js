'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { LEVELS, FLASHCARDS, CONCEPTS } from '@/data/questions'

export function Settings() {
  const { user, xp, logoutUser, apiKey, setApiKey, getLevel, testDate, setTestDate } = useApp()
  const [tempApiKey, setTempApiKey] = useState(apiKey || '')
  const [testingKey, setTestingKey] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [tempTestDate, setTempTestDate] = useState(testDate || '')
  const level = getLevel()
  const levelInfo = LEVELS.find(l => l.level === level)

  const handleTestConnection = async () => {
    setTestingKey(true)
    setTestResult(null)
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempApiKey}` },
        body: JSON.stringify({ model: 'gpt-4o', max_tokens: 10, messages: [{ role: 'user', content: 'Reply OK' }] })
      })
      if (response.ok) {
        setTestResult({ ok: true, msg: 'Connected! GPT-4o ready.' })
        setApiKey(tempApiKey)
      } else {
        const err = await response.json().catch(() => ({}))
        setTestResult({ ok: false, msg: err.error?.message || 'Invalid API key' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: 'Connection failed: ' + e.message })
    } finally {
      setTestingKey(false)
    }
  }

  const handleTestDateChange = (e) => {
    const newDate = e.target.value
    setTempTestDate(newDate)
    setTestDate(newDate)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters')
      return
    }

    setChangingPassword(true)

    try {
      // Hash the passwords
      async function hashPassword(password) {
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      }

      const oldHash = await hashPassword(oldPassword)
      const accounts = JSON.parse(localStorage.getItem('biomaster_accounts') || '{}')

      if (!accounts[user] || accounts[user].passwordHash !== oldHash) {
        setPasswordError('Current password is incorrect')
        setChangingPassword(false)
        return
      }

      const newHash = await hashPassword(newPassword)
      accounts[user].passwordHash = newHash
      localStorage.setItem('biomaster_accounts', JSON.stringify(accounts))

      setPasswordSuccess('Password changed successfully!')
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setTimeout(() => setShowChangePassword(false), 2000)
    } catch (err) {
      setPasswordError('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleExport = () => {
    let text = 'SNC2D BIOLOGY STUDY SHEET\n\n'
    CONCEPTS.forEach(c => { text += c.title + '\n' + '='.repeat(40) + '\n' + c.body + '\n\n' })
    text += '\nFLASHCARDS\n' + '='.repeat(40) + '\n\n'
    FLASHCARDS.forEach(c => { text += `Q: ${c.q}\nA: ${c.a}\n\n` })
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'SNC2D_Study_Sheet.txt'
    a.click()
  }

  return (
    <div className="animate-fade-up">
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>⚙️ Settings</h1>

      {/* Profile */}
      <div className="glass" style={{ textAlign: 'center', marginBottom: 20, padding: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🧬</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{user}</h2>
        <p style={{ color: '#22c55e', fontWeight: 700, fontSize: 16 }}>
          Level {level} · {levelInfo?.title || 'Novice'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
          {xp} XP
        </p>
        <button
          onClick={() => setShowChangePassword(!showChangePassword)}
          className="btn btn-ghost"
          style={{ marginTop: 16 }}
        >
          {showChangePassword ? 'Cancel' : 'Change Password'}
        </button>
      </div>

      {/* Change Password */}
      {showChangePassword && (
        <div className="glass" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔐 Change Password</h3>
          <form onSubmit={handleChangePassword}>
            <input
              type="password"
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={{ marginBottom: 10 }}
              disabled={changingPassword}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ marginBottom: 10 }}
              disabled={changingPassword}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              style={{ marginBottom: 12 }}
              disabled={changingPassword}
            />
            {passwordError && (
              <div style={{
                marginBottom: 12, padding: 10, borderRadius: 8, fontSize: 12,
                background: 'rgba(255,69,58,0.12)', color: '#ff453a'
              }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div style={{
                marginBottom: 12, padding: 10, borderRadius: 8, fontSize: 12,
                background: 'rgba(34,197,94,0.12)', color: '#22c55e'
              }}>
                {passwordSuccess}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-green"
              style={{ width: '100%' }}
              disabled={changingPassword}
            >
              {changingPassword ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Test Date */}
      <div className="glass" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📅 Test Date</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Set your test date to see a countdown and get personalized study advice
        </p>
        <input
          type="date"
          value={tempTestDate}
          onChange={handleTestDateChange}
          style={{ width: '100%', padding: '10px 12px', fontSize: 14, marginBottom: 8 }}
        />
        {testDate && (
          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
            ✅ Test date set for {new Date(testDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* OpenAI API */}
      <div className="glass" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🤖 OpenAI Integration</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Add your OpenAI API key for AI-powered tutoring (GPT-4o)
        </p>
        <input
          type="password"
          value={tempApiKey}
          onChange={(e) => setTempApiKey(e.target.value)}
          placeholder="sk-proj-..."
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleTestConnection}
            disabled={!tempApiKey || testingKey}
            className="btn btn-green"
            style={{ flex: 1, opacity: !tempApiKey || testingKey ? 0.5 : 1 }}
          >
            {testingKey ? 'Testing...' : 'Test Connection'}
          </button>
          {apiKey && (
            <button onClick={() => { setApiKey(''); setTempApiKey(''); setTestResult(null) }} className="btn btn-ghost">
              Remove
            </button>
          )}
        </div>
        {testResult && (
          <div style={{
            marginTop: 10, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: testResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(255,69,58,0.12)',
            color: testResult.ok ? '#22c55e' : '#ff453a'
          }}>
            {testResult.ok ? '✅' : '❌'} {testResult.msg}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="glass" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>📤 Export</h3>
        <button onClick={handleExport} className="btn btn-ghost" style={{ width: '100%' }}>
          Export Study Sheet (.txt)
        </button>
      </div>

      {/* Danger Zone */}
      <div className="glass" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#ff453a' }}>Danger Zone</h3>
        <button
          onClick={() => { if (confirm('Reset ALL progress? This cannot be undone.')) { localStorage.clear(); location.reload() } }}
          className="btn btn-danger" style={{ width: '100%', marginBottom: 8 }}
        >
          🗑️ Reset All Progress
        </button>
        <button onClick={() => { if (confirm('Log out?')) logoutUser() }} className="btn btn-ghost" style={{ width: '100%' }}>
          🚪 Log Out
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
        BioMaster v10 · Next.js 14 · OpenAI GPT-4o-mini
      </div>
    </div>
  )
}
