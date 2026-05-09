import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import '../styles/taskModule.css'


// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY = {
  high:   { label: 'Alta',   color: '#F87171' },
  medium: { label: 'Media',  color: '#FBBF24' },
  normal: { label: 'Normal', color: '#6EE7B7' },
}
const RANK = { high: 0, medium: 1, normal: 2 }
function nextPriority(p) { return p === 'normal' ? 'high' : p === 'high' ? 'medium' : 'normal' }

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupByDate(items) {
  const groups = {}
  items.forEach(item => {
    const key = item.createdAt ? new Date(item.createdAt).toDateString() : 'Sin fecha'
    if (!groups[key]) groups[key] = { date: item.createdAt || new Date().toISOString(), items: [] }
    groups[key].items.push(item)
  })
  return Object.entries(groups).sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
}

function getDueDateStatus(dueDate) {
  if (!dueDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = dueDate.split('-')
  const due = new Date(Number(y), Number(m) - 1, Number(d))
  const diff = Math.ceil((due - today) / 86400000)
  if (diff < 0)  return { label: `Venció hace ${Math.abs(diff)}d`, cls: 'overdue' }
  if (diff === 0) return { label: 'Vence hoy',     cls: 'today' }
  if (diff === 1) return { label: 'Vence mañana',  cls: 'future' }
  return { label: `Vence en ${diff}d`, cls: 'future' }
}

// Renders [text](url) links safely
function parseMarkdown(text) {
  if (!text) return null
  const parts = []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer" className="task-link">{m[1]}</a>)
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ item, onClose, onSave, onAddSubtask, onToggleSubtask, onDeleteSubtask }) {
  const [title,    setTitle]    = useState(item.title || '')
  const [body,     setBody]     = useState(item.text || '')
  const [dueDate,  setDueDate]  = useState(item.dueDate || '')
  const [newSub,   setNewSub]   = useState('')

  const handleSave = () => onSave({ title: title.trim(), text: body.trim(), dueDate })

  const addSub = () => {
    const t = newSub.trim()
    if (!t) return
    onAddSubtask(t)
    setNewSub('')
  }

  const completedSubs = (item.subtasks || []).filter(s => s.done).length
  const totalSubs     = (item.subtasks || []).length

  return (
    <div className="task-modal-backdrop" onClick={onClose}>
      <div className="task-modal" onClick={e => e.stopPropagation()}>
        {/* Scrollable content */}
        <div className="task-modal-scroll">
          {/* Header */}
          <div className="task-modal-header">
            <span className="task-modal-priority-dot" style={{ background: PRIORITY[item.priority]?.color || '#6EE7B7' }} />
            <input
              className="task-modal-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título de la tarea…"
            />
            <button className="task-modal-close" onClick={onClose} aria-label="Cerrar">
              <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Due date */}
          <div className="task-modal-date-row">
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            <input type="date" className="task-modal-date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          {/* Description */}
          <div className="task-modal-section-label">Descripción</div>
          <textarea
            className="task-modal-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={'Escribe una descripción…\nPuedes usar links: [Texto](https://url.com)'}
            rows={4}
          />
          {body && (
            <div className="task-modal-preview">
              <span className="task-modal-preview-label">Vista previa:</span>
              <p className="task-modal-preview-text">{parseMarkdown(body)}</p>
            </div>
          )}

          {/* Subtasks */}
          <div className="task-modal-section-label">
            Subtareas
            {totalSubs > 0 && <span className="task-subtask-progress">{completedSubs}/{totalSubs}</span>}
          </div>
          {totalSubs > 0 && (
            <div className="task-subtask-bar">
              <div className="task-subtask-fill" style={{ width: `${(completedSubs / totalSubs) * 100}%` }} />
            </div>
          )}

          <ul className="task-subtask-list">
            {(item.subtasks || []).map(sub => (
              <li key={sub.id} className={`task-subtask-item ${sub.done ? 'task-subtask--done' : ''}`}>
                <button
                  className={`task-checkbox task-subtask-check ${sub.done ? 'checked' : ''}`}
                  onClick={() => onToggleSubtask(sub.id)}
                >
                  {sub.done && (
                    <svg viewBox="0 0 12 12" fill="none" width="9" height="9">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <span className="task-subtask-text">{sub.text}</span>
                <button className="task-act-btn task-act-delete" onClick={() => onDeleteSubtask(sub.id)}>
                  <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <div className="task-subtask-add-row">
            <input
              className="task-subtask-input"
              placeholder="Nueva subtarea…"
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSub() }}
            />
            <button className="task-add-btn" onClick={addSub} aria-label="Agregar subtarea">
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>{/* end scroll */}

        {/* Sticky footer */}
        <div className="task-modal-footer">
          <button className="task-edit-cancel" onClick={onClose}>Cancelar</button>
          <button className="task-modal-done-btn" onClick={handleSave}>
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaskModule({ data = {}, onChange }) {
  const [items,           setItems]           = useState(data.items || [])
  const [filter,          setFilter]          = useState('all')
  const [sortByPri,       setSortByPri]       = useState(false)
  const [newTitle,        setNewTitle]        = useState('')
  const [newText,         setNewText]         = useState('')
  const [newDueDate,      setNewDueDate]      = useState('')
  const [detailId,        setDetailId]        = useState(null)
  const [collapsedGroups, setCollapsedGroups] = useState({})

  const dragItem     = useRef(null)
  const dragOverItem = useRef(null)
  const newTextRef   = useRef(null)
  const onChangRef   = useRef(onChange)

  useEffect(() => { onChangRef.current = onChange }, [onChange])
  useEffect(() => { onChangRef.current?.({ ...data, items }) }, [items])

  // Derived
  const filtered = items.filter(i =>
    filter === 'all' ? true : filter === 'pending' ? !i.done : i.done
  )
  const sorted = sortByPri
    ? [...filtered].sort((a, b) => RANK[a.priority] - RANK[b.priority])
    : filtered
  const grouped      = groupByDate(sorted)
  const pendingCount = items.filter(i => !i.done).length
  const totalCount   = items.length
  const doneCount    = items.filter(i => i.done).length
  const detailItem   = items.find(i => i.id === detailId) || null

  // CRUD
  const addTask = useCallback(() => {
    const title = newTitle.trim()
    const text  = newText.trim()
    if (!title && !text) return
    setItems(prev => [
      ...prev,
      { id: Date.now(), title, text, dueDate: newDueDate, done: false,
        priority: 'normal', createdAt: new Date().toISOString(), order: prev.length, subtasks: [] }
    ])
    setNewTitle(''); setNewText(''); setNewDueDate('')
    newTextRef.current?.focus()
  }, [newTitle, newText, newDueDate])

  const toggleDone    = useCallback((id) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i)), [])
  const cyclePriority = useCallback((id) => setItems(prev => prev.map(i => i.id === id ? { ...i, priority: nextPriority(i.priority) } : i)), [])
  const removeItem    = useCallback((id) => setItems(prev => prev.filter(i => i.id !== id)), [])
  const clearDone     = useCallback(() => setItems(prev => prev.filter(i => !i.done)), [])
  const toggleGroup   = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))

  // Modal callbacks
  const saveDetail = useCallback((patch) => {
    setItems(prev => prev.map(i => i.id === detailId ? { ...i, ...patch } : i))
    setDetailId(null)
  }, [detailId])

  const addSubtask = useCallback((text) => {
    setItems(prev => prev.map(i => i.id === detailId
      ? { ...i, subtasks: [...(i.subtasks || []), { id: Date.now(), text, done: false }] }
      : i
    ))
  }, [detailId])

  const toggleSubtask = useCallback((subId) => {
    setItems(prev => prev.map(i => i.id === detailId
      ? { ...i, subtasks: (i.subtasks || []).map(s => s.id === subId ? { ...s, done: !s.done } : s) }
      : i
    ))
  }, [detailId])

  const deleteSubtask = useCallback((subId) => {
    setItems(prev => prev.map(i => i.id === detailId
      ? { ...i, subtasks: (i.subtasks || []).filter(s => s.id !== subId) }
      : i
    ))
  }, [detailId])

  // Drag & drop
  const handleDragStart = (e, idx) => { dragItem.current = idx; e.currentTarget.style.opacity = '0.5' }
  const handleDragEnter = (e, idx) => { dragOverItem.current = idx; e.currentTarget.classList.add('task-drag-over') }
  const handleDragLeave = (e) => e.currentTarget.classList.remove('task-drag-over')
  const handleDrop = (e) => {
    e.currentTarget.classList.remove('task-drag-over')
    const from = dragItem.current, to = dragOverItem.current
    if (from === null || to === null || from === to) return
    const copy = [...items]
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    setItems(copy.map((it, i) => ({ ...it, order: i })))
    dragItem.current = dragOverItem.current = null
  }
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = ''; dragItem.current = dragOverItem.current = null }
  const handleNewKey  = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask() } }

  return (
    <div className="task-module">

      {/* Modal — rendered via Portal to escape parent transform/stacking context */}
      {detailItem && ReactDOM.createPortal(
        <TaskDetailModal
          item={detailItem}
          onClose={() => setDetailId(null)}
          onSave={saveDetail}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
        />,
        document.body
      )}

      {/* Header */}
      <div className="task-header">
        <div className="task-header-left">
          <span className="task-count-pill">
            {pendingCount}<span className="task-count-total">/{totalCount}</span>
          </span>
        </div>

        <div className="task-filters">
          {['all', 'pending', 'done'].map(f => (
            <button key={f} className={`task-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Hechas'}
            </button>
          ))}
        </div>

        <button
          className={`task-sort-btn ${sortByPri ? 'active' : ''}`}
          title={sortByPri ? 'Quitar orden' : 'Ordenar por prioridad'}
          onClick={() => setSortByPri(s => !s)}
        >
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M2 4h7M2 8h5M2 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M12 3v9M12 12l-2-2M12 12l2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {doneCount > 0 && (
          <button className="task-clear-btn" title={`Limpiar ${doneCount} completada${doneCount > 1 ? 's' : ''}`} onClick={clearDone}>
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
              <path d="M2 4h10M5 4V2h4v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 4l.7 7.3A1 1 0 004.7 12h4.6a1 1 0 001-.7L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{doneCount}</span>
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="task-list">
        {sorted.length === 0 && (
          <div className="task-empty">
            {filter === 'all' ? 'No hay tareas aún' : filter === 'pending' ? 'Todo completado 🎉' : 'Ninguna tarea completada'}
          </div>
        )}

        {grouped.map(([dateKey, group]) => {
          const isCollapsed = !!collapsedGroups[dateKey]
          return (
            <div key={dateKey} className="task-date-group">
              <button className="task-date-label" onClick={() => toggleGroup(dateKey)} aria-expanded={!isCollapsed}>
                <svg className={`task-group-chevron ${isCollapsed ? 'collapsed' : ''}`} viewBox="0 0 10 10" fill="none" width="10" height="10">
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {formatDate(group.date)}
                <span className="task-group-count">{group.items.length}</span>
              </button>

              {!isCollapsed && group.items.map((item) => {
                const ds       = getDueDateStatus(item.dueDate)
                const totalS   = (item.subtasks || []).length
                const doneS    = (item.subtasks || []).filter(s => s.done).length
                return (
                  <div
                    key={item.id}
                    className={`task-item ${item.done ? 'task-item--done' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, items.indexOf(item))}
                    onDragEnter={(e) => handleDragEnter(e, items.indexOf(item))}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {/* Priority */}
                    <button
                      className="task-priority-dot"
                      style={{ background: PRIORITY[item.priority]?.color || '#6EE7B7' }}
                      title={`Prioridad: ${PRIORITY[item.priority]?.label} — click para cambiar`}
                      onClick={(e) => { e.stopPropagation(); cyclePriority(item.id) }}
                    />

                    {/* Checkbox */}
                    <button
                      className={`task-checkbox ${item.done ? 'checked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleDone(item.id) }}
                    >
                      {item.done && (
                        <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>

                    {/* Content → opens modal */}
                    <div className="task-content" onClick={() => setDetailId(item.id)}>
                      <div className="task-item-header-row">
                        {item.title && <span className="task-item-title">{item.title}</span>}
                        {!item.done && ds && (
                          <span className={`task-due-badge due-${ds.cls}`}>{ds.label}</span>
                        )}
                      </div>
                      {item.text && <span className="task-item-text">{parseMarkdown(item.text)}</span>}
                      {!item.title && !item.text && <span className="task-item-text task-placeholder">Sin contenido — click para editar</span>}
                      {totalS > 0 && (
                        <div className="task-subtask-pill">
                          <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                            <path d="M2 6l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>{doneS}/{totalS}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="task-item-actions">
                      <button className="task-act-btn" title="Ver detalle" onClick={() => setDetailId(item.id)}>
                        <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M7 5v4M7 4.5v-.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button className="task-act-btn task-act-delete" title="Eliminar" onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}>
                        <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Add area */}
      <div className="task-add-area">
        <div className="task-add-title-row">
          <input
            className="task-new-title"
            placeholder="Título de la tarea…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleNewKey}
          />
          <input
            type="date"
            className="task-new-date"
            title="Fecha límite"
            value={newDueDate}
            onChange={e => setNewDueDate(e.target.value)}
          />
        </div>
        <div className="task-add-row">
          <input
            ref={newTextRef}
            className="task-new-text"
            placeholder="Descripción (opcional)…"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleNewKey}
          />
          <button className="task-add-btn" onClick={addTask} aria-label="Agregar tarea">
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
