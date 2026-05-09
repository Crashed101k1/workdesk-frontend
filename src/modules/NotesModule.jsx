import React, { useState, useEffect, useRef, useMemo } from 'react'
import '../styles/notesModule.css'

// ─── Constants & Helpers ──────────────────────────────────────────────────────
const COLORS = [
  { id: 'default', hex: 'transparent' },
  { id: 'yellow',  hex: '#FBBF24' },
  { id: 'green',   hex: '#34D399' },
  { id: 'blue',    hex: '#60A5FA' },
  { id: 'red',     hex: '#F87171' },
  { id: 'purple',  hex: '#A78BFA' }
]

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

function newNote() {
  return {
    id: Date.now(),
    title: '',
    body: '',
    color: 'default',
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Markdown Preview Link Parser ─────────────────────────────────────────────
function parseMarkdownPreview(text) {
  if (!text) return 'Nota vacía'
  // Only extract first 80 chars for preview, but safely split
  const snippet = text.slice(0, 80) + (text.length > 80 ? '…' : '')
  
  const parts = []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0, m
  
  while ((m = regex.exec(snippet)) !== null) {
    if (m.index > last) parts.push(snippet.slice(last, m.index))
    parts.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer" className="note-link" onClick={e => e.stopPropagation()}>
        {m[1]}
      </a>
    )
    last = regex.lastIndex
  }
  if (last < snippet.length) parts.push(snippet.slice(last))
  
  return parts.length ? parts : snippet
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NotesModule({ data = {}, onChange }) {
  const [notes, setNotes]           = useState(data.notes || [])
  const [activeId, setActiveId]     = useState(null)
  const [isEditing, setIsEditing]   = useState(false) // Used for narrow mobile view slide
  const [searchQuery, setSearchQuery] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  const titleRef = useRef(null)
  const bodyRef  = useRef(null)

  // Sync up to parent whenever notes change
  useEffect(() => {
    onChange?.({ ...data, notes })
  }, [notes])

  // Select first note automatically if none selected, but don't enter edit mode
  useEffect(() => {
    if (!activeId && notes.length > 0) {
      setActiveId(notes[0].id)
    }
  }, [notes, activeId])

  const activeNote = notes.find(n => n.id === activeId) ?? null

  // ── Derived Data ────────────────────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const filtered = notes.filter(n => {
      if (!q) return true
      const t = n.title?.toLowerCase() || ''
      const b = n.body?.toLowerCase() || ''
      return t.includes(q) || b.includes(q)
    })
    // Sort: Pinned first, then by updatedAt descending
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })
  }, [notes, searchQuery])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const cleanupEmpty = () => {
    if (activeNote && !(activeNote.title || '').trim() && !(activeNote.body || '').trim()) {
      setNotes(prev => prev.filter(n => n.id !== activeId))
    }
  }

  const addNote = () => {
    cleanupEmpty()
    const n = newNote()
    setNotes(prev => [n, ...prev])
    setActiveId(n.id)
    setIsEditing(true)
    setTimeout(() => titleRef.current?.focus(), 100)
  }

  const deleteNote = (id, e) => {
    if (e) e.stopPropagation()
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      if (id === activeId) {
        setActiveId(next[0]?.id ?? null)
        setIsEditing(false)
      }
      return next
    })
  }

  const patchActive = (patch) => {
    setNotes(prev => prev.map(n =>
      n.id === activeId
        ? { ...n, ...patch, updatedAt: new Date().toISOString() }
        : n
    ))
  }

  const togglePin = () => patchActive({ pinned: !activeNote.pinned })

  const openNote = (id) => {
    if (activeId !== id) cleanupEmpty()
    setActiveId(id)
    setIsEditing(true)
  }

  const backToList = () => {
    cleanupEmpty()
    setIsEditing(false)
  }

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return
    const close = () => setShowColorPicker(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [showColorPicker])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`notes-module ${isEditing ? 'is-editing' : ''}`}>
      
      <div className="notes-layout">
        {/* ── SIDEBAR (List) ── */}
        <div className="notes-sidebar">
          {/* Header */}
          <div className="notes-header">
            <span className="notes-title">NOTAS</span>
            <span className="notes-count">{notes.length}</span>
            <button className="notes-add-btn" onClick={addNote} title="Nueva nota">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          {notes.length > 0 && (
            <div className="notes-search-wrap">
              <svg className="notes-search-icon" viewBox="0 0 24 24" width="12" height="12" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                className="notes-search-input"
                placeholder="Buscar notas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* List */}
          {notes.length === 0 ? (
            <div className="notes-empty">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" opacity=".3">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <p>No hay notas aún</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="notes-empty">No se encontraron notas</div>
          ) : (
            <div className="notes-list">
              {filteredNotes.map(n => (
                <div
                  key={n.id}
                  className={`notes-list-item color-${n.color} ${n.id === activeId ? 'active' : ''}`}
                  onClick={() => openNote(n.id)}
                >
                  <div className="notes-item-header">
                    <span className="notes-item-title">{n.title || <em>Sin título</em>}</span>
                    <div className="notes-item-icons">
                      {n.pinned && (
                        <svg className="notes-icon-pin" viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                          <path d="M16 13V5c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v8l-2 3v2h5v4l1 1 1-1v-4h5v-2l-2-3z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="notes-item-preview">
                    {parseMarkdownPreview(n.body)}
                  </span>
                  <span className="notes-item-date">{formatDateTime(n.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── EDITOR PANE ── */}
        <div className="notes-editor-pane">
          {activeNote ? (
            <>
              {/* Toolbar */}
              <div className="notes-editor-toolbar">
                <button className="notes-back-btn" onClick={backToList}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Volver
                </button>
                
                <div className="notes-editor-actions">
                  {/* Pin Toggle */}
                  <button 
                    className={`notes-action-btn ${activeNote.pinned ? 'active' : ''}`} 
                    onClick={togglePin}
                    title={activeNote.pinned ? "Desfijar" : "Fijar nota"}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill={activeNote.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path d="M16 13V5c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v8l-2 3v2h5v4l1 1 1-1v-4h5v-2l-2-3z"/>
                    </svg>
                  </button>
                  
                  {/* Color Picker */}
                  <div className="notes-color-picker">
                    <button 
                      className="notes-action-btn" 
                      style={activeNote.color !== 'default' ? { color: COLORS.find(c => c.id === activeNote.color)?.hex } : {}}
                      onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker) }}
                      title="Color"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" />
                        <path d="M2 12h20" />
                      </svg>
                    </button>
                    {showColorPicker && (
                      <div className="notes-color-popup" onPointerDown={e => e.stopPropagation()}>
                        {COLORS.map(c => (
                          <div 
                            key={c.id} 
                            className={`notes-color-swatch ${activeNote.color === c.id ? 'active' : ''}`}
                            style={{ background: c.hex === 'transparent' ? 'rgba(255,255,255,0.1)' : c.hex }}
                            onClick={() => { patchActive({ color: c.id }); setShowColorPicker(false) }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button className="notes-action-btn danger" onClick={() => deleteNote(activeNote.id)} title="Eliminar nota">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 6h18M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" />
                      <path d="M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editor Fields */}
              <input
                ref={titleRef}
                className="notes-edit-title"
                placeholder="Título de la nota..."
                value={activeNote.title}
                onChange={e => patchActive({ title: e.target.value })}
              />
              <textarea
                ref={bodyRef}
                className="notes-edit-body"
                placeholder="Escribe tu nota aquí... (Soporta links en vista previa)"
                value={activeNote.body}
                onChange={e => patchActive({ body: e.target.value })}
              />
            </>
          ) : (
            <div className="notes-empty">Selecciona o crea una nota para empezar</div>
          )}
        </div>
      </div>
    </div>
  )
}
