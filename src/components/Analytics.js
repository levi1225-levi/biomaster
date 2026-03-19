'use client'

import { useApp } from '@/lib/store'
import { FLASHCARDS, TOPICS, TOPIC_COLORS, LEVELS } from '@/data/questions'

export function Analytics() {
  const { xp, masteredCards, getMasteryForTopic, getLevel } = useApp()
  const level = getLevel()

  const kpis = [
    { label: 'Cards Studied', value: masteredCards.length, icon: '📚' },
    { label: 'Total XP', value: xp, icon: '⭐' },
    { label: 'Current Level', value: `Level ${level}`, icon: '🎖️' },
    { label: 'Accuracy', value: '85%', icon: '🎯' },
  ]

  const topicMastery = TOPICS.map(topic => ({
    topic,
    mastery: getMasteryForTopic(topic, FLASHCARDS),
    color: TOPIC_COLORS[topic],
  }))

  const heatmapData = Array(84).fill(0).map((_, i) => {
    const level = Math.floor(Math.random() * 5)
    return level
  })

  return (
    <div className="page-container" style={{ paddingTop: '24px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>📊 Analytics</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '11px', color: '#a1a1a6' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
        Topic Mastery
      </h2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {topicMastery.map((item, i) => (
          <div key={i} className="card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <div style={{ fontWeight: '600' }}>{item.topic}</div>
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: item.color,
              }}>
                {item.mastery}%
              </div>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${item.mastery}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
        12-Week Activity
      </h2>
      <div className="card" style={{
        padding: '16px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '6px',
          marginBottom: '12px',
        }}>
          {heatmapData.map((level, i) => (
            <div
              key={i}
              className={`heatmap-cell level-${level}`}
              title={`Week ${Math.floor(i / 7) + 1}, Day ${(i % 7) + 1}`}
            />
          ))}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#a1a1a6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>12 weeks of activity</span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span>Less</span>
            <div className="heatmap-cell level-0" />
            <div className="heatmap-cell level-1" />
            <div className="heatmap-cell level-2" />
            <div className="heatmap-cell level-3" />
            <div className="heatmap-cell level-4" />
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="card-lg" style={{
        marginTop: '24px',
        background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.1) 0%, rgba(10, 132, 255, 0.1) 100%)',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
          AI Insights
        </h3>
        <p style={{ fontSize: '13px', color: '#a1a1a6', lineHeight: '1.6' }}>
          You're making great progress! Keep focusing on the Digestive system to complete mastery.
          Consider reviewing Respiratory system cards for reinforcement.
        </p>
      </div>
    </div>
  )
}
