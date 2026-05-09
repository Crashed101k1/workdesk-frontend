import React, { useState, useMemo, useCallback } from 'react'
import '../styles/progressModule.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupTasksByDate(items) {
  const groups = {}
  items.forEach(item => {
    // Group by dueDate so tasks due on different days appear in separate bars.
    // Tasks with no dueDate fall into a "Sin fecha" bucket.
    const dueDateStr = item.dueDate   // format: "YYYY-MM-DD" or ""
    const key  = dueDateStr ? dueDateStr : 'sin-fecha'
    const date = dueDateStr ? new Date(dueDateStr + 'T00:00:00').toISOString() : null
    if (!groups[key]) groups[key] = { date, dueDateStr, items: [] }
    groups[key].items.push(item)
  })
  // Sort: dated groups first (newest due first), "sin-fecha" last
  return Object.entries(groups).sort((a, b) => {
    if (a[0] === 'sin-fecha') return 1
    if (b[0] === 'sin-fecha') return -1
    return new Date(b[0]) - new Date(a[0])
  })
}

function formatGroupTitle(dueDateStr) {
  if (!dueDateStr) return 'Sin fecha de vencimiento'
  const today    = new Date(); today.setHours(0,0,0,0)
  const [y,m,d]  = dueDateStr.split('-')
  const due      = new Date(Number(y), Number(m)-1, Number(d))
  const diff     = Math.ceil((due - today) / 86400000)
  const label    = formatDate(due.toISOString())
  if (diff < 0)  return `${label} · vencida`
  if (diff === 0) return `${label} · vence hoy`
  if (diff === 1) return `${label} · vence mañana`
  return label
}

function getColorClass(pct) {
  if (pct === 100) return 'color-done'
  if (pct >= 67)   return 'color-good'
  if (pct >= 34)   return 'color-warn'
  return 'color-danger'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProgressModule({ data = {}, onChange, allTasks = [] }) {
  // Collapsed groups: Set of dateKeys
  const [collapsed, setCollapsed]   = useState(new Set())
  // Notes: { [dateKey]: string }
  const [notes, setNotes]           = useState(data.notes || {})
  // Which bar is in note-edit mode
  const [editingNote, setEditingNote] = useState(null)
  const [noteDraft, setNoteDraft]   = useState('')

  // Auto-generated bars from allTasks grouped by dueDate
  const bars = useMemo(() => {
    return groupTasksByDate(allTasks).map(([dateKey, group]) => {
      const total = group.items.length
      const done  = group.items.filter(i => i.done).length
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0
      // dateKey is either "YYYY-MM-DD" or "sin-fecha"
      const title = formatGroupTitle(group.dueDateStr)
      return { dateKey, dueDateStr: group.dueDateStr, title, total, done, pct, items: group.items }
    }).filter(b => b.total > 0)
  }, [allTasks])

  const totalTasks    = allTasks.length
  const completedTasks = allTasks.filter(t => t.done).length
  const overallPct    = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Toggle collapse
  const toggleCollapse = useCallback((key) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  // Note management
  const openNote = (key) => {
    setEditingNote(key)
    setNoteDraft(notes[key] || '')
  }
  const saveNote = (key) => {
    const updated = { ...notes, [key]: noteDraft.trim() }
    setNotes(updated)
    setEditingNote(null)
    onChange?.({ ...data, notes: updated })
  }

  return (
    <div className="prog-module">

      {/* Header */}
      <div className="prog-header">
        <div className="prog-overall-pill">
          Tareas
          <span>{completedTasks}/{totalTasks}</span>
        </div>
        <div className="prog-overall-pill" style={{ marginLeft: 'auto' }}>
          Global
          <span style={{ color: getColorClass(overallPct) === 'color-done' ? '#6EE7B7'
                                : getColorClass(overallPct) === 'color-good' ? '#4ecdc4'
                                : getColorClass(overallPct) === 'color-warn' ? '#FBBF24' : '#F87171' }}>
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Overall bar */}
      <div className="prog-overall-bar">
        <div className="prog-overall-track">
          <div className="prog-overall-fill" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Bar list */}
      <div className="prog-list">
        {bars.length === 0 ? (
          <div className="prog-empty">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="13" width="4" height="8" rx="1"/>
              <rect x="10" y="9" width="4" height="12" rx="1"/>
              <rect x="17" y="5" width="4" height="16" rx="1"/>
            </svg>
            Agrega tareas en el módulo de tareas para ver tu progreso aquí
          </div>
        ) : (
          bars.map((bar) => {
            const isOpen     = !collapsed.has(bar.dateKey)
            const isComplete = bar.pct === 100
            const hasNote    = Boolean(notes[bar.dateKey])
            const isEditing  = editingNote === bar.dateKey

            return (
              <div
                key={bar.dateKey}
                className={`prog-bar-card ${isComplete ? 'complete' : ''}`}
              >
                {/* Clickable header */}
                <div className="prog-bar-header" onClick={() => toggleCollapse(bar.dateKey)}>
                  <svg
                    className={`prog-bar-chevron ${isOpen ? 'open' : ''}`}
                    viewBox="0 0 10 10" fill="none" width="10" height="10"
                  >
                    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>

                  <span className="prog-bar-title">{bar.title}</span>

                  {isComplete && (
                    <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
                      <circle cx="7" cy="7" r="6" fill="rgba(110,231,183,0.15)" stroke="rgba(110,231,183,0.4)" strokeWidth="1"/>
                      <path d="M4 7l2.5 2.5 4-4" stroke="#6EE7B7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}

                  <span className={`prog-bar-badge ${isComplete ? 'done' : ''}`}>
                    {bar.done}/{bar.total}
                  </span>

                  {/* Note button — stops propagation so it doesn't toggle collapse */}
                  <button
                    className={`prog-note-btn ${hasNote ? 'has-note' : ''}`}
                    title={hasNote ? 'Ver/editar nota' : 'Agregar nota'}
                    onClick={e => { e.stopPropagation(); isEditing ? setEditingNote(null) : openNote(bar.dateKey) }}
                  >
                    <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                      <path d="M2 10V12h2l5.5-5.5-2-2L2 10zM11.4 4.1a1 1 0 000-1.5l-.9-.9a1 1 0 00-1.5 0L8 3l2 2 1.4-1.4z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Progress track — always visible */}
                <div className="prog-bar-track-wrap">
                  <div className="prog-track">
                    <div
                      className={`prog-fill ${getColorClass(bar.pct)}`}
                      style={{ '--fill-w': `${bar.pct}%`, width: `${bar.pct}%` }}
                    />
                  </div>
                </div>

                {/* Completion badge */}
                {isComplete && (
                  <div className="prog-complete-badge">
                    <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                      <path d="M2 7l3.5 3.5 6.5-6.5" stroke="#6EE7B7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    ¡Todas las tareas del día completadas!
                  </div>
                )}

                {/* Expanded body */}
                {isOpen && (
                  <div className="prog-bar-body">
                    <span className="prog-percent-label">{bar.pct}% completado</span>

                    {/* Task pills */}
                    <div className="prog-task-pills">
                      {bar.items.map(t => (
                        <span key={t.id} className={`prog-task-pill ${t.done ? 'done' : ''}`}>
                          {t.title || t.text || 'Sin título'}
                        </span>
                      ))}
                    </div>

                    {/* Note area */}
                    {isEditing ? (
                      <div className="prog-note-area">
                        <textarea
                          className="prog-note-input"
                          rows={2}
                          placeholder="Agrega una nota para este día…"
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(bar.dateKey) } }}
                          autoFocus
                        />
                        <button className="prog-note-save" onClick={() => saveNote(bar.dateKey)}>Guardar</button>
                      </div>
                    ) : hasNote ? (
                      <p className="prog-note-display" onClick={() => openNote(bar.dateKey)}>
                        📝 {notes[bar.dateKey]}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
