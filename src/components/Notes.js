'use client'

import { useState } from 'react'
import { TOPICS, CONCEPTS } from '@/data/questions'

export function Notes() {
  const [expandedTopics, setExpandedTopics] = useState({})

  const toggleTopic = (topic) => {
    setExpandedTopics({
      ...expandedTopics,
      [topic]: !expandedTopics[topic],
    })
  }

  return (
    <div className="container" style={{ paddingTop: '24px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>📚 Study Notes</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {CONCEPTS.map(concept => (
          <div key={concept.id} className="card">
            <button
              onClick={() => toggleTopic(concept.id)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '0',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {concept.title}
              </div>
              <div style={{
                fontSize: '14px',
                transform: expandedTopics[concept.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}>
                ▼
              </div>
            </button>

            {expandedTopics[concept.id] && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #424245',
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#e5e5ea',
                whiteSpace: 'pre-wrap',
              }}>
                {concept.body}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
