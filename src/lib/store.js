'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

// Simple hash function for passwords (client-side only)
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [cardStats, setCardStats] = useState({})
  const [xp, setXp] = useState(0)
  const [achievements, setAchievements] = useState([])
  const [studyLog, setStudyLog] = useState([])
  const [apiKey, setApiKey] = useState('')
  const [masteredCards, setMasteredCards] = useState([])
  const [streak, setStreak] = useState(0)
  const [diagramsDone, setDiagramsDone] = useState([])
  const [studyHistory, setStudyHistory] = useState([])
  const [testDate, setTestDate] = useState(null)
  const [sessionHistory, setSessionHistory] = useState([])
  const [aiCache, setAiCache] = useState({})

  useEffect(() => {
    const accounts = localStorage.getItem('biomaster_accounts')
    const lastUser = localStorage.getItem('biomaster_lastUser')
    if (accounts && lastUser) {
      const accountsData = JSON.parse(accounts)
      if (accountsData[lastUser]) {
        const userData = accountsData[lastUser].data
        setCurrentUser(lastUser)
        setUser(lastUser)
        setCardStats(userData.cardStats || {})
        setXp(userData.xp || 0)
        setAchievements(userData.achievements || [])
        setApiKey(userData.apiKey || '')
        setMasteredCards(userData.masteredCards || [])
        setStreak(userData.streak || 0)
        setDiagramsDone(userData.diagramsDone || [])
        setStudyHistory(userData.studyHistory || [])
        setTestDate(userData.testDate || null)
        setSessionHistory(userData.sessionHistory || [])
      }
    }
  }, [])

  useEffect(() => {
    if (user && currentUser) {
      const accounts = JSON.parse(localStorage.getItem('biomaster_accounts') || '{}')
      accounts[currentUser] = accounts[currentUser] || {}
      accounts[currentUser].data = {
        cardStats,
        xp,
        achievements,
        apiKey,
        masteredCards,
        streak,
        diagramsDone,
        studyLog,
        studyHistory,
        testDate,
        sessionHistory,
      }
      localStorage.setItem('biomaster_accounts', JSON.stringify(accounts))
    }
  }, [user, currentUser, cardStats, xp, achievements, apiKey, masteredCards, streak, diagramsDone, studyLog, studyHistory, testDate, sessionHistory])

  const registerUser = async (username, password) => {
    if (!username.trim() || !password) {
      throw new Error('Username and password required')
    }
    const accounts = JSON.parse(localStorage.getItem('biomaster_accounts') || '{}')
    if (accounts[username]) {
      throw new Error('Username already taken')
    }
    const passwordHash = await hashPassword(password)
    accounts[username] = {
      passwordHash,
      data: {
        cardStats: {},
        xp: 0,
        achievements: [],
        apiKey: '',
        masteredCards: [],
        streak: 0,
        diagramsDone: [],
        studyLog: [],
        studyHistory: [],
        testDate: null,
        sessionHistory: [],
      }
    }
    localStorage.setItem('biomaster_accounts', JSON.stringify(accounts))
    localStorage.setItem('biomaster_lastUser', username)
    setCurrentUser(username)
    setUser(username)
    setCardStats({})
    setXp(0)
    setAchievements([])
    setApiKey('')
    setMasteredCards([])
    setStreak(0)
    setDiagramsDone([])
    setStudyHistory([])
    setTestDate(null)
    setSessionHistory([])
  }

  const loginUser = async (username, password) => {
    if (!username.trim() || !password) {
      throw new Error('Username and password required')
    }
    const accounts = JSON.parse(localStorage.getItem('biomaster_accounts') || '{}')
    if (!accounts[username]) {
      throw new Error('User not found')
    }
    const passwordHash = await hashPassword(password)
    if (accounts[username].passwordHash !== passwordHash) {
      throw new Error('Invalid password')
    }
    const userData = accounts[username].data
    localStorage.setItem('biomaster_lastUser', username)
    setCurrentUser(username)
    setUser(username)
    setCardStats(userData.cardStats || {})
    setXp(userData.xp || 0)
    setAchievements(userData.achievements || [])
    setApiKey(userData.apiKey || '')
    setMasteredCards(userData.masteredCards || [])
    setStreak(userData.streak || 0)
    setDiagramsDone(userData.diagramsDone || [])
    setStudyHistory(userData.studyHistory || [])
    setTestDate(userData.testDate || null)
    setSessionHistory(userData.sessionHistory || [])
  }

  const logoutUser = () => {
    setUser(null)
    setCurrentUser(null)
    setCardStats({})
    setXp(0)
    setAchievements([])
    setApiKey('')
    setMasteredCards([])
    setStreak(0)
    setDiagramsDone([])
    setStudyHistory([])
    setTestDate(null)
    setSessionHistory([])
    localStorage.removeItem('biomaster_lastUser')
  }

  const reviewCard = (cardId, quality) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const stats = cardStats[cardId] || {
      interval: 1,
      ease: 2.5,
      repetitions: 0,
      nextReview: today,
    }

    let { interval, ease, repetitions } = stats

    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1
      } else if (repetitions === 1) {
        interval = 3
      } else {
        interval = Math.round(interval * ease)
      }
      repetitions++
      ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    } else {
      repetitions = 0
      interval = 1
    }

    const nextReviewDate = new Date(now)
    nextReviewDate.setDate(nextReviewDate.getDate() + interval)

    setCardStats({
      ...cardStats,
      [cardId]: {
        interval,
        ease,
        repetitions,
        nextReview: nextReviewDate.toISOString().split('T')[0],
        lastReview: today,
        quality,
      }
    })

    let earnedXP = 10
    if (quality === 5) earnedXP = 25
    else if (quality === 4) earnedXP = 15

    setXp(prev => prev + earnedXP)

    if (quality >= 4 && !masteredCards.includes(cardId)) {
      setMasteredCards(prev => [...prev, cardId])
      unlockAchievementIfEarned(1)
    }

    setStudyLog(prev => [...prev, {
      cardId,
      quality,
      date: today,
      xpEarned: earnedXP,
    }])
  }

  const unlockAchievementIfEarned = (achId) => {
    if (!achievements.includes(achId)) {
      setAchievements(prev => [...prev, achId])
    }
  }

  const getDueCards = (allCards) => {
    const today = new Date().toISOString().split('T')[0]
    return allCards.filter(card => {
      const stats = cardStats[card.id]
      if (!stats) return true
      return stats.nextReview <= today
    })
  }

  const getMasteryForTopic = (topic, allCards) => {
    const topicCards = allCards.filter(c => c.t === topic)
    const mastered = topicCards.filter(c => masteredCards.includes(c.id))
    return topicCards.length > 0 ? Math.round((mastered.length / topicCards.length) * 100) : 0
  }

  const getWeakCards = (allCards) => {
    return allCards.filter(card => {
      const stats = cardStats[card.id]
      return stats && stats.quality <= 2 && stats.repetitions > 0
    }).slice(0, 5)
  }

  const getLevel = () => {
    const levels = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]
    for (let i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i]) return i + 1
    }
    return 1
  }

  // Record a study action for AI analysis
  const recordAction = (type, topic, cardId, correct, timeSpent = 0) => {
    const entry = {
      type,
      topic,
      cardId,
      correct,
      timeSpent,
      timestamp: new Date().toISOString(),
    }
    setStudyHistory(prev => [...prev, entry])
  }

  // Record a completed study session
  const recordSession = (mode, topic, score, total, duration) => {
    const entry = {
      mode,
      topic,
      score,
      total,
      duration,
      timestamp: new Date().toISOString(),
    }
    setSessionHistory(prev => [...prev, entry])
  }

  // Analyze study history to find weaknesses (local computation)
  const getWeaknessProfile = () => {
    const topics = {}
    const concepts = {}
    let totalCorrect = 0
    let totalAttempts = 0

    studyHistory.forEach(entry => {
      if (!topics[entry.topic]) {
        topics[entry.topic] = { correct: 0, total: 0 }
      }
      topics[entry.topic].total++
      if (entry.correct) {
        topics[entry.topic].correct++
        totalCorrect++
      }
      totalAttempts++
    })

    const topicScores = {}
    const weakConcepts = []
    const strongConcepts = []

    Object.entries(topics).forEach(([topic, data]) => {
      const score = data.total > 0 ? data.correct / data.total : 0
      topicScores[topic] = Math.round(score * 100)
      if (score < 0.6) {
        weakConcepts.push(topic)
      } else if (score >= 0.85) {
        strongConcepts.push(topic)
      }
    })

    return {
      topicScores,
      weakConcepts,
      strongConcepts,
      totalAccuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      studiedToday: studyHistory.filter(e => e.timestamp.startsWith(new Date().toISOString().split('T')[0])).length,
      predictedTestReadiness: Math.min(99, totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100 * 1.1) : 0),
    }
  }

  // Get smart card queue ranked by need (local computation)
  const getSmartQueue = (allCards, count = 15) => {
    const today = new Date().toISOString().split('T')[0]
    const weakProfile = getWeaknessProfile()

    const scored = allCards.map(card => {
      let score = 0
      const stats = cardStats[card.id]
      const weakCards = studyHistory.filter(e => !e.correct).map(e => e.cardId)

      if (!stats || stats.nextReview <= today) {
        score += 100
      }

      if (weakCards.includes(card.id)) {
        score += 50
      }

      if (weakProfile.weakConcepts.includes(card.t)) {
        score += 30
      }

      if (!stats) {
        score += 20
      }

      if (stats && stats.quality >= 4) {
        score -= 40
      }

      return { card, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.card)
  }

  // Get all wrong answers for review
  const getWrongAnswers = (allCards) => {
    const wrongCardIds = studyHistory
      .filter(e => !e.correct)
      .map(e => e.cardId)
    
    // Deduplicate
    const uniqueWrongIds = [...new Set(wrongCardIds)]
    
    return allCards.filter(card => uniqueWrongIds.includes(card.id))
  }

  // Generate AI study plan (calls GPT-4o once per session)
  const generateStudyPlan = async () => {
    if (!apiKey) return null
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bm_ai_study_plan') : null
    if (cached) return JSON.parse(cached)

    try {
      const weakProfile = getWeaknessProfile()
      const prompt = `Student stats: Accuracy: ${weakProfile.totalAccuracy}%, Weak areas: ${weakProfile.weakConcepts.join(', ') || 'none'}, Strong: ${weakProfile.strongConcepts.join(', ') || 'none'}, Studied today: ${weakProfile.studiedToday} items, Test readiness: ${weakProfile.predictedTestReadiness}%.

Create a personalized study plan. Reply ONLY with valid JSON (no markdown, no backticks): {
  "focus": "topic name",
  "activities": ["Flashcards on X", "Quiz on Y", "Speed Round"],
  "message": "Motivational message (1 sentence)"
}`

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 200,
          messages: [
            { role: 'system', content: 'You are a study coach. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ]
        })
      })

      const d = await r.json()
      let planText = d.choices[0].message.content.trim()

      // Strip markdown code blocks if present
      planText = planText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

      const plan = JSON.parse(planText)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('bm_ai_study_plan', JSON.stringify(plan))
      }
      return plan
    } catch (e) {
      console.error('AI study plan error:', e)
      return null
    }
  }

  // Get next activity recommendation after completing a mode
  const getNextRecommendation = async (justFinished, score, topic) => {
    if (!apiKey) return null

    try {
      const weakProfile = getWeaknessProfile()
      const percentage = Math.round(score * 100)

      const prompt = `Student just finished ${justFinished} on ${topic}, scored ${percentage}%.
Weak areas: ${weakProfile.weakConcepts.slice(0, 3).join(', ') || 'none'}.

What should they do next? Reply ONLY with valid JSON (no markdown, no backticks): {
  "mode": "Quiz|Flashcards|Speed Round|etc",
  "topic": "topic name",
  "reason": "brief reason"
}`

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 100,
          messages: [
            { role: 'system', content: 'You are a study coach. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ]
        })
      })

      const d = await r.json()
      let recText = d.choices[0].message.content.trim()

      // Strip markdown code blocks if present
      recText = recText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

      return JSON.parse(recText)
    } catch (e) {
      console.error('AI recommendation error:', e)
      return null
    }
  }

  const askAI = async (question, maxTokens = 300) => {
    if (!apiKey) throw new Error('API key not set')

    // Check cache (first 100 chars as key)
    const cacheKey = question.substring(0, 100)
    if (aiCache[cacheKey]) {
      return aiCache[cacheKey]
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'SNC2D biology tutor. Be concise.',
          },
          {
            role: 'user',
            content: question,
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get AI response')
    }

    const data = await response.json()
    const result = data.choices[0].message.content

    // Cache the response
    setAiCache(prev => ({
      ...prev,
      [cacheKey]: result
    }))

    return result
  }

  return (
    <AppContext.Provider value={{
      user,
      currentUser,
      registerUser,
      loginUser,
      logoutUser,
      cardStats,
      reviewCard,
      xp,
      achievements,
      unlockAchievementIfEarned,
      studyLog,
      apiKey,
      setApiKey,
      masteredCards,
      streak,
      setStreak,
      diagramsDone,
      setDiagramsDone,
      getDueCards,
      getMasteryForTopic,
      getWeakCards,
      getLevel,
      askAI,
      studyHistory,
      recordAction,
      recordSession,
      getWeaknessProfile,
      getSmartQueue,
      getWrongAnswers,
      generateStudyPlan,
      getNextRecommendation,
      testDate,
      setTestDate,
      sessionHistory,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}

export async function aiExplain(apiKey, question, correctAns, wrongAns) {
  if (!apiKey) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o', max_tokens: 150,
        messages: [
          { role: 'system', content: 'Grade 10 biology tutor. Be concise (2-3 sentences max).' },
          { role: 'user', content: `Student answered "${wrongAns}" for: "${question}". Correct answer: "${correctAns}". Explain why correct answer is right and theirs was wrong.` }
        ]
      })
    });
    const d = await r.json();
    return d.choices[0].message.content;
  } catch { return null; }
}

export async function aiStudyPlan(apiKey, stats) {
  if (!apiKey) return null;
  const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bm_ai_plan') : null;
  if (cached) return cached;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o', max_tokens: 100,
        messages: [
          { role: 'system', content: 'Study coach for Grade 10 biology. Give a personalized 2-sentence recommendation.' },
          { role: 'user', content: `Student stats: ${stats}. What should they focus on today?` }
        ]
      })
    });
    const d = await r.json();
    const plan = d.choices[0].message.content;
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('bm_ai_plan', plan);
    return plan;
  } catch { return null; }
}

export async function aiExplainCard(apiKey, q, a) {
  if (!apiKey) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o', max_tokens: 150,
        messages: [
          { role: 'system', content: 'Grade 10 biology tutor. Explain simply with a helpful mnemonic or memory trick.' },
          { role: 'user', content: `Explain this for a Grade 10 student: Q: ${q} A: ${a}` }
        ]
      })
    });
    const d = await r.json();
    return d.choices[0].message.content;
  } catch { return null; }
}

export function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
}
