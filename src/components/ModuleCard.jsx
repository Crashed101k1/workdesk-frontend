import React, { useRef, useState, memo } from 'react'

// ─── Accent identity per module type ─────────────────────────────────────────
const TYPE_META = {
  tasks:    { color: '#6EE7B7', label: 'Tareas',    icon: (<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M3.5 6.5l1 1 1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 7h7M10 10.5h7M10 14h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><rect x="2" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>) },
  pomodoro: { color: '#F87171', label: 'Pomodoro',  icon: (<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="11" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M10 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 2v2M8 1.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>) },
  progress: { color: '#60A5FA', label: 'Progreso',  icon: (<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="11" width="3" height="7" rx="0.8" fill="currentColor"/><rect x="8.5" y="7" width="3" height="11" rx="0.8" fill="currentColor"/><rect x="15" y="4" width="3" height="14" rx="0.8" fill="currentColor"/></svg>) },
  notes:    { color: '#FBBF24', label: 'Notas',     icon: (<svg viewBox="0 0 20 20" fill="none"><path d="M12 2H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M12 2v5h5M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>) },
}
const PALETTE = ['#6EE7B7','#F87171','#60A5FA','#FBBF24','#A78BFA','#34D399','#FB923C']

// ─── Component ────────────────────────────────────────────────────────────────
const ModuleCard = memo(function ModuleCard({ module, onUpdate, onRemove, children }) {
  const cardRef     = useRef(null)
  const [showPalette, setShowPalette] = useState(false)

  const meta   = TYPE_META[module.type] ?? { color: '#6EE7B7', label: module.type, icon: null }
  const accent = module.color || meta.color

  // ── Drag ──────────────────────────────────────────────────────────────────
  const handleDragStart = (e) => {
    if (module.pinned) return
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const card = cardRef.current
    card.setPointerCapture(e.pointerId)
    card.style.zIndex    = '999'
    card.style.willChange = 'left, top'
    card.style.transition = 'none'
    card.style.userSelect = 'none'

    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startCardX  = module.x
    const startCardY  = module.y
    let   curX = startCardX
    let   curY = startCardY

    const onMove = (ev) => {
      curX = Math.max(0, startCardX + (ev.clientX - startMouseX))
      curY = Math.max(0, startCardY + (ev.clientY - startMouseY))
      // Mutate DOM directly — no React state, no re-render lag
      card.style.left = curX + 'px'
      card.style.top  = curY + 'px'
    }

    const onUp = () => {
      card.releasePointerCapture(e.pointerId)
      card.style.zIndex     = ''
      card.style.willChange = ''
      card.style.transition = ''
      card.style.userSelect = ''
      card.removeEventListener('pointermove',   onMove)
      card.removeEventListener('pointerup',     onUp)
      card.removeEventListener('pointercancel', onUp)
      // Commit final position to React state once
      onUpdate({ x: curX, y: curY })
    }

    card.addEventListener('pointermove',   onMove)
    card.addEventListener('pointerup',     onUp)
    card.addEventListener('pointercancel', onUp)
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  const handleResizeStart = (e) => {
    e.stopPropagation()
    const card = cardRef.current
    card.setPointerCapture(e.pointerId)

    const startX = e.clientX, startY = e.clientY
    const origW  = module.width,  origH = module.height
    let curW = origW, curH = origH

    const onMove = (ev) => {
      curW = Math.max(220, origW + (ev.clientX - startX))
      curH = Math.max(140, origH + (ev.clientY - startY))
      card.style.width  = curW + 'px'
      card.style.height = curH + 'px'
    }
    const onUp = () => {
      card.releasePointerCapture(e.pointerId)
      card.removeEventListener('pointermove',   onMove)
      card.removeEventListener('pointerup',     onUp)
      card.removeEventListener('pointercancel', onUp)
      onUpdate({ width: curW, height: curH })
    }
    card.addEventListener('pointermove',   onMove)
    card.addEventListener('pointerup',     onUp)
    card.addEventListener('pointercancel', onUp)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className={`module-card ${module.pinned ? 'module-card--pinned' : ''}`}
      style={{
        position: 'absolute',
        left:   module.x,
        top:    module.y,
        width:  module.width,
        height: module.height,
        '--accent': accent,
      }}
    >
      {/* Accent bar */}
      <div className="module-accent-bar" style={{ background: accent }} />

      {/* Header */}
      <div className="module-header" onPointerDown={handleDragStart}>
        <div className="module-header-left">
          <span className="module-type-icon" style={{ color: accent }}>
            {meta.icon}
          </span>
          <span className="module-title">{meta.label}</span>
        </div>

        <div className="module-actions">
          {/* Color picker dot */}
          <button
            className="module-action-btn module-color-btn"
            title="Cambiar color"
            onPointerDown={(e) => { e.stopPropagation(); setShowPalette(s => !s) }}
            style={{ background: accent }}
            aria-label="Cambiar color del módulo"
          />
          {showPalette && (
            <div className="color-palette" onPointerDown={e => e.stopPropagation()}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  className="color-swatch"
                  style={{ background: c }}
                  onPointerDown={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowPalette(false) }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          )}

          {/* Pin */}
          <button
            className={`module-action-btn module-pin-btn ${module.pinned ? 'active' : ''}`}
            title={module.pinned ? 'Desfijar' : 'Fijar módulo'}
            onPointerDown={(e) => { e.stopPropagation(); onUpdate({ pinned: !module.pinned }) }}
            aria-pressed={module.pinned}
          >
            {module.pinned ? (
              <svg viewBox="0 0 16 16" fill="none"><path d="M5 1h6M8 1v3M4 4h8l-1 5H5L4 4zM8 9v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none"><path d="M5 1h6M8 1v3M4 4h8l-1 5H5L4 4zM8 9v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 1"/><path d="M6 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            )}
          </button>

          {/* Close */}
          <button
            className="module-action-btn module-close-btn"
            title="Eliminar módulo"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(module.id)}
            aria-label="Eliminar módulo"
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="module-body">{children}</div>

      {/* Resize handle */}
      <div className="resizer" onPointerDown={handleResizeStart} aria-hidden>
        <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
          <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/>
        </svg>
      </div>
    </div>
  )
})

export default ModuleCard
