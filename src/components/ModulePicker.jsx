import React, { useState } from 'react'

const TYPES = [
  { id: 'tasks',    label: 'Checklista de tareas',  desc: 'Lista con casillas para tareas',          tooltip: 'Lista de tareas con casillas para marcar y organizar tu trabajo. Útil para seguir pasos, priorizar y llevar el seguimiento de actividades.' },
  { id: 'pomodoro', label: 'Pomodoro',               desc: 'Temporizador estilo Pomodoro',             tooltip: 'Temporizador Pomodoro para gestionar ciclos de trabajo y descansos, mejorar concentración y planificar sesiones enfocadas.' },
  { id: 'progress', label: 'Barra de progreso',      desc: 'Seguimiento visual del progreso',          tooltip: 'Barra de progreso que muestra visualmente el avance de una tarea o proyecto en porcentaje o unidades completadas.' },
  { id: 'notes',    label: 'Notas rápidas',          desc: 'Bloc de notas con fecha de edición',       tooltip: 'Bloc de notas para escribir apuntes rápidos. Cada nota guarda su fecha y hora de última edición y puedes tener varias notas activas.' },
  { id: 'music',    label: 'Música (YouTube)',       desc: 'Reproductor de música integrado',          tooltip: 'Inserta tus canciones o playlists favoritas de YouTube Music o YouTube para escucharlas mientras trabajas.' },
]

function Icon({ id }) {
  if (id === 'tasks') return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="2" y="5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 8.2l1.2 1.2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 8h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 13h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 18h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )

  if (id === 'pomodoro') return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 10v4l3 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  if (id === 'notes') return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )

  if (id === 'music') return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )

  // progress -> bars
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3" y="12" width="3.6" height="9" rx="0.6" fill="currentColor" />
      <rect x="10.2" y="8" width="3.6" height="13" rx="0.6" fill="currentColor" />
      <rect x="17.4" y="5" width="3.6" height="16" rx="0.6" fill="currentColor" />
    </svg>
  )
}

export default function ModulePicker({ onAdd, disabledTypes = [] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="module-picker">
      <div className="dropdown">
        <button className="add-module-btn" onClick={() => setOpen(s => !s)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agregar Módulo
        </button>
        {open && (
          <div className="dropdown-menu show module-list">
            {TYPES.map(t => {
              const isDisabled = disabledTypes.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`dropdown-item ${isDisabled ? 'disabled' : ''}`}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  aria-describedby={`tooltip-${t.id}`}
                  onClick={() => { if (isDisabled) return; onAdd(t.id); setOpen(false) }}
                >
                  <span className="module-icon">
                    <span className={`icon-anim ${isDisabled ? 'muted' : ''}`} aria-hidden>
                      <Icon id={t.id} />
                    </span>
                  </span>
                  <div className="module-item-body">
                    <div className="module-label">{t.label}</div>
                    <div className="module-desc">{t.desc}</div>
                  </div>
                  {t.tooltip && (
                    <div className="module-tooltip" id={`tooltip-${t.id}`} role="tooltip">
                      {t.tooltip}
                    </div>
                  )}
                  {isDisabled && <span className="added-badge">Agregado</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
