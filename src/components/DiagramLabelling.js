'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { DIAGRAMS } from '@/data/questions'

export function DiagramLabelling() {
  const { diagramsDone, setDiagramsDone } = useApp()
  const [selectedDiagram, setSelectedDiagram] = useState(null)
  const [selectedLabel, setSelectedLabel] = useState(null)
  const [placedLabels, setPlacedLabels] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  const startDiagram = (diagram) => {
    setSelectedDiagram(diagram)
    setPlacedLabels({})
    setShowResults(false)
    setSelectedLabel(null)
  }

  const handleLabelSlot = (labelId) => {
    if (selectedLabel !== null) {
      setPlacedLabels({
        ...placedLabels,
        [labelId]: selectedLabel,
      })
      setSelectedLabel(null)
    } else if (placedLabels[labelId]) {
      // Remove the label if clicking on it
      const newPlaced = { ...placedLabels }
      delete newPlaced[labelId]
      setPlacedLabels(newPlaced)
    }
  }

  const checkAnswers = () => {
    let correct = 0
    selectedDiagram.labels.forEach(label => {
      if (placedLabels[label.id] === label.id) {
        correct++
      }
    })
    setScore(correct)
    setShowResults(true)
  }

  const resetDiagram = () => {
    setPlacedLabels({})
    setShowResults(false)
    setScore(0)
  }

  if (!selectedDiagram) {
    return (
      <div className="page-container" style={{ paddingTop: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Diagram Labelling</h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: '12px',
        }}>
          {DIAGRAMS.map(diagram => (
            <button
              key={diagram.id}
              onClick={() => startDiagram(diagram)}
              className="card"
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#30d158'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#424245'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔬</div>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                {diagram.title}
              </h2>
              <p style={{ fontSize: '12px', color: '#a1a1a6' }}>
                {diagram.labels.length} labels
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ paddingTop: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setSelectedDiagram(null)}
          className="btn btn-secondary btn-sm"
        >
          ← Back
        </button>
      </div>

      <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
        {selectedDiagram.title}
      </h1>

      {!showResults ? (
        <>
          <div className="grid-2col" style={{
            display: 'grid',
            gridTemplateColumns: '55% 1fr',
            gap: '24px',
            marginBottom: '24px',
          }}>
            {/* Image with overlaid label slots */}
            <div>
              <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '12px' }}>
                DIAGRAM
              </div>
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '100%',
                background: `url(${selectedDiagram.image}) center/contain no-repeat`,
              }}>
                {/* Overlaid label buttons */}
                {selectedDiagram.labels.map((label) => {
                  const labelId = label.id
                  const hasLabel = placedLabels[labelId]
                  return (
                    <button
                      key={labelId}
                      onClick={() => handleLabelSlot(labelId)}
                      style={{
                        position: 'absolute',
                        left: `${label.x}%`,
                        top: `${label.y}%`,
                        transform: 'translate(-50%, -50%)',
                        minWidth: '50px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: hasLabel ? 'rgba(48, 209, 88, 0.8)' : 'rgba(45, 45, 48, 0.8)',
                        color: hasLabel ? '#000' : '#fff',
                        border: '1px solid ' + (hasLabel ? '#30d158' : '#666'),
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        zIndex: 10,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(48, 209, 88, 0.5)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {hasLabel 
                        ? selectedDiagram.labels.find(l => l.id === placedLabels[labelId])?.text 
                        : `#${labelId}`
                      }
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Word bank on the right */}
            <div>
              <div style={{ fontSize: '13px', color: '#a1a1a6', marginBottom: '12px' }}>
                WORD BANK
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDiagram.labels.map((label) => {
                  const isPlaced = Object.values(placedLabels).includes(label.id)
                  const isSelected = selectedLabel === label.id
                  return (
                    <button
                      key={label.id}
                      onClick={() => setSelectedLabel(isSelected ? null : label.id)}
                      className="btn btn-secondary btn-block"
                      style={{
                        background: isSelected ? '#30d158' : undefined,
                        color: isSelected ? '#000' : undefined,
                        opacity: isPlaced ? 0.4 : 1,
                        fontSize: '13px',
                        pointerEvents: isPlaced ? 'auto' : 'auto',
                      }}
                      disabled={false}
                    >
                      {label.text}
                    </button>
                  )
                })}
              </div>

              <div style={{ 
                marginTop: '20px', 
                padding: '12px', 
                background: 'rgba(48, 209, 88, 0.1)', 
                borderRadius: '8px',
                fontSize: '12px',
                color: '#a1a1a6',
              }}>
                <div style={{ fontWeight: '700', marginBottom: '4px', color: '#30d158' }}>
                  How to play:
                </div>
                <div>1. Click a word from the bank</div>
                <div>2. Click a numbered slot on the diagram</div>
                <div>3. Click a placed word to remove it</div>
                <div style={{ marginTop: '8px', fontWeight: '700' }}>
                  Placed: {Object.keys(placedLabels).length} / {selectedDiagram.labels.length}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={checkAnswers}
            disabled={Object.keys(placedLabels).length < selectedDiagram.labels.length}
            className="btn btn-primary btn-lg btn-block"
            style={{
              opacity: Object.keys(placedLabels).length < selectedDiagram.labels.length ? 0.5 : 1,
            }}
          >
            Check Answers
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {score === selectedDiagram.labels.length ? '🎉' : '👍'}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            {score} / {selectedDiagram.labels.length}
          </h2>
          <p style={{ color: '#a1a1a6', marginBottom: '24px' }}>
            {score === selectedDiagram.labels.length ? 'Perfect!' : 'Good effort!'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={resetDiagram}
              className="btn btn-secondary btn-block"
            >
              Try Again
            </button>
            <button
              onClick={() => setSelectedDiagram(null)}
              className="btn btn-primary btn-block"
            >
              Next Diagram
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
