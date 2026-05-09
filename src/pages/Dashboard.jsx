import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ModulePicker from '../components/ModulePicker'
import ModuleCard from '../components/ModuleCard'
import TaskModule from '../modules/TaskModule'
import ProgressModule from '../modules/ProgressModule'
import PomodoroModule from '../modules/PomodoroModule'
import NotesModule from '../modules/NotesModule'
import MusicModule from '../modules/MusicModule'
import TutorialOverlay from '../components/TutorialOverlay'
import { modulesAPI } from '../services/api'
import '../styles/dashboard.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PALETTE = ['#00FFFF', '#FF00FF', '#39FF14', '#FFD300', '#00FF9C', '#7C00FF', '#FF006E']
const STORAGE_KEY = 'workdesk_modules'

// ─── Pure helpers (defined outside component — never recreated) ───────────────

function getColor(id) {
  return PALETTE[Math.abs(Number(id) || 0) % PALETTE.length]
}

/** Normalizes a module from any source (localStorage or MongoDB API).
 *  Handles both flat fields {x,y,width,height} and MongoDB nested {position:{x,y,width,height}}
 */
function sanitize(m, index = 0) {
  if (!m || typeof m !== 'object') return null

  // MongoDB returns _id as string; the frontend uses id
  const id = m.id ?? m._id?.toString() ?? String(Date.now() + index)

  // Position can come as flat fields OR nested inside m.position (MongoDB schema)
  const pos = m.position ?? {}
  const x = typeof m.x === 'number' ? m.x : (typeof pos.x === 'number' ? pos.x : 40 + index * 30)
  const y = typeof m.y === 'number' ? m.y : (typeof pos.y === 'number' ? pos.y : 40 + index * 30)
  const width = typeof m.width === 'number' ? m.width : (typeof pos.width === 'number' ? pos.width : (typeof m.w === 'number' ? m.w : 320))
  const height = typeof m.height === 'number' ? m.height : (typeof pos.height === 'number' ? pos.height : (typeof m.h === 'number' ? m.h : 200))

  return {
    id,
    type: m.type ?? 'tasks',
    x, y, width, height,
    pinned: Boolean(m.pinned),
    hidden: Boolean(m.hidden),
    timeOnDesk: typeof m.timeOnDesk === 'number' ? m.timeOnDesk : 0,
    color: m.color || getColor(id),
    content: m.content ?? {},
  }
}

function makeDefaultContent(type) {
  if (type === 'tasks') return { items: [] }
  if (type === 'progress') return { bars: [{ id: 1, title: 'Progreso ejemplo', total: 10, done: 3 }] }
  if (type === 'pomodoro') return { minutes: 25, seconds: 0, running: false }
  if (type === 'notes') return { notes: [] }
  if (type === 'music') return { url: '' }
  return {}
}

/** Keep only the last occurrence of each module type (prevents duplicates) */
function deduplicateByType(modules) {
  const seen = new Map()
  // Iterate in reverse so the LAST entry per type wins
  for (let i = modules.length - 1; i >= 0; i--) {
    const m = modules[i]
    if (m && m.type && !seen.has(m.type)) {
      seen.set(m.type, m)
    }
  }
  // Restore original order
  return modules.filter(m => m && seen.get(m.type)?.id === m.id)
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const sanitized = parsed.map((m, i) => sanitize(m, i)).filter(Boolean)
    return deduplicateByType(sanitized)
  } catch {
    return []
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout, onGoToProfile, onGoToToolHub }) {
  const [modules, setModules] = useState(loadFromStorage)
  const [isInitialLoading, setIsInitialLoading] = useState(() => loadFromStorage().length === 0)
  const [user, setUser] = useState(null)
  const [wallpaper, setWallpaper] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackData, setFeedbackData] = useState({ type: 'Sugerencia', message: '' })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' })
  const [showTutorial, setShowTutorial] = useState(false)
  
  // Widget states
  const [syncStatus, setSyncStatus] = useState('saved')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockFormat, setClockFormat] = useState('24h')
  
  const canvasRef = useRef(null)

  // ── Clock Effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // ── Load user info and settings ──────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('workdesk_user')
      if (raw) {
        const u = JSON.parse(raw)
        setUser(u)
        if (u.preferences && u.preferences.tutorialCompleted === false) {
          setShowTutorial(true)
        }
      }

      // Load wallpaper preference
      const wp = localStorage.getItem('workdesk_wallpaper')
      if (wp) setWallpaper(wp)

      // Load clock format preference
      const cf = localStorage.getItem('workdesk_clock_format')
      if (cf) setClockFormat(cf)
    } catch { /* ignore */ }
  }, [])

  // ── Close profile menu on outside click ──────────────────────────────────
  useEffect(() => {
    if (!showProfileMenu) return
    const close = () => setShowProfileMenu(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [showProfileMenu])

  // ── Cross-tab Session Protection ─────────────────────────────────────────
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'workdesk_token') {
        // If the token was removed or changed in another tab, log out immediately
        // to prevent this tab's state from overwriting the other user's data.
        onLogout()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [onLogout])

  // ── API sync on mount (background — never blocks UI) ─────────────────────
  useEffect(() => {
    const token = localStorage.getItem('workdesk_token')
    if (!token) {
      setIsInitialLoading(false)
      return
    }

    const checkSyncStatus = async () => {
      try {
        const localUpdatedAt = Number(localStorage.getItem(`${STORAGE_KEY}_updatedAt`) || 0)
        const localSyncedAt = Number(localStorage.getItem(`${STORAGE_KEY}_syncedAt`) || 0)
        const hasOfflineChanges = localUpdatedAt > localSyncedAt

        if (hasOfflineChanges) {
          // We have changes that never reached the server! Push them up.
          const localData = loadFromStorage()
          if (localData.length > 0) {
            await modulesAPI.saveAll(localData)
            localStorage.setItem(`${STORAGE_KEY}_syncedAt`, Date.now().toString())
          }
          return
        }

        // Otherwise, fetch from server to get updates from other devices
        const res = await modulesAPI.getAll()
        const serverModules = res.data?.modules

        if (Array.isArray(serverModules) && serverModules.length > 0) {
          const enriched = deduplicateByType(
            serverModules.map((m, i) => sanitize(m, i)).filter(Boolean)
          )
          setModules(enriched)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched))
          localStorage.setItem(`${STORAGE_KEY}_syncedAt`, Date.now().toString())

          if (enriched.length < serverModules.length) {
            modulesAPI.saveAll(enriched).catch(() => { })
          }
        } else {
          // Server is empty — push local data up
          const local = loadFromStorage()
          if (local.length > 0) {
            modulesAPI.saveAll(local)
              .then(() => localStorage.setItem(`${STORAGE_KEY}_syncedAt`, Date.now().toString()))
              .catch(() => { })
          }
        }
      } catch (err) {
        // Offline / server down — keep local data safely
        console.warn('Working offline — local data preserved.')
      } finally {
        setIsInitialLoading(false)
      }
    }

    // Ejecutar inmediatamente al cargar
    checkSyncStatus()

    // ── Polling para sincronización multi-dispositivo ──
    const syncInterval = setInterval(async () => {
      try {
        const localUpdatedAt = Number(localStorage.getItem(`${STORAGE_KEY}_updatedAt`) || 0)
        const localSyncedAt = Number(localStorage.getItem(`${STORAGE_KEY}_syncedAt`) || 0)

        // Pausar si hay cambios locales pendientes de subir
        if (Date.now() - localUpdatedAt < 5000 || localUpdatedAt > localSyncedAt) return;

        const res = await modulesAPI.getAll()
        const serverModules = res.data?.modules
        if (!Array.isArray(serverModules)) return;

        const enriched = deduplicateByType(serverModules.map((m, i) => sanitize(m, i)).filter(Boolean))
        const currentModules = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

        // Si el número de módulos cambió (añadido/eliminado desde otro dispositivo)
        const countChanged = enriched.length !== currentModules.length

        // Detectar si algún módulo cambió de ID ignorando el orden
        const serverIds = [...enriched.map(m => m.id)].sort()
        const localIds = [...currentModules.map(m => m.id)].sort()
        const idsChanged = JSON.stringify(serverIds) !== JSON.stringify(localIds)

        if (countChanged || idsChanged) {
          // Cambio estructural: actualizar todo, pero preservar posición, tamaño y EL ORDEN LOCAL
          // para evitar que React mueva los nodos del DOM y recargue los iframes.
          let merged = []
          
          // 1. Mantener los módulos que ya existen localmente, en su mismo orden
          currentModules.forEach(localMod => {
            const serverMatch = enriched.find(s => s.type === localMod.type)
            if (serverMatch) {
              merged.push({ ...serverMatch, x: localMod.x, y: localMod.y, width: localMod.width, height: localMod.height })
            }
          })
          
          // 2. Añadir módulos nuevos que vienen del servidor y no estaban en local
          enriched.forEach(serverMod => {
            if (!currentModules.some(l => l.type === serverMod.type)) {
              merged.push(serverMod)
            }
          })

          setModules(merged)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          localStorage.setItem(`${STORAGE_KEY}_syncedAt`, Date.now().toString())
          return
        }

        // Sin cambio estructural: actualizar sólo módulos cuyo contenido cambió en el servidor
        // (evita reiniciar módulos activos como Music o Pomodoro)
        let hasDiff = false
        const surgicallyMerged = currentModules.map(localMod => {
          const serverMatch = enriched.find(s => s.type === localMod.type)
          if (!serverMatch) return localMod
          
          const serverContent = JSON.stringify(serverMatch.content)
          const localContent = JSON.stringify(localMod.content)
          
          const timeChanged = (serverMatch.timeOnDesk || 0) > (localMod.timeOnDesk || 0)

          // Solo sustituir si el contenido es genuinamente diferente o el tiempo del servidor es mayor
          if (serverContent !== localContent || timeChanged) {
            hasDiff = true
            // Preservar posición local, tomar contenido del servidor y el tiempo mayor
            return { 
              ...serverMatch, 
              x: localMod.x, y: localMod.y, width: localMod.width, height: localMod.height,
              timeOnDesk: Math.max(serverMatch.timeOnDesk || 0, localMod.timeOnDesk || 0)
            }
          }
          return localMod
        })

        if (hasDiff) {
          setModules(surgicallyMerged)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(surgicallyMerged))
          localStorage.setItem(`${STORAGE_KEY}_syncedAt`, Date.now().toString())
        }
      } catch (err) {
        // Silencioso en fondo
      }
    }, 5000)

    return () => clearInterval(syncInterval)
  }, [])


  // ── Persist helper ───────────────────────────────────────────────────────
  const persistTimeoutRef = useRef(null)

  // Limpiar el timeout al desmontar para evitar que guarde con un token nuevo (Cross-Account Leak)
  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    }
  }, [])

  const persist = useCallback((updated) => {
    // 1. Guardar en local de inmediato (rápido y seguro)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    localStorage.setItem(`${STORAGE_KEY}_updatedAt`, Date.now().toString())

    const token = localStorage.getItem('workdesk_token')
    if (token) {
      // 2. Sincronizar con el backend de forma debounced
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
      setSyncStatus('syncing')
      persistTimeoutRef.current = setTimeout(() => {
        // Asegurar que el backend reciba la posición en su formato esperado { x, y, width, height }
        const toSave = updated.map(m => ({
          ...m,
          position: { x: m.x, y: m.y, width: m.width, height: m.height }
        }))

        modulesAPI.saveAll(toSave)
          .then(() => {
            // Marca de éxito de sincronización
            localStorage.setItem(`${STORAGE_KEY}_syncedAt`, Date.now().toString())
            setSyncStatus('saved')
          })
          .catch(err => {
            console.error("Auto-save failed, data queued for next sync:", err)
            setSyncStatus('error')
          })
      }, 2000)
    }
  }, [])

  // ── Tracker de Tiempo de Uso de Módulos (Favoritos) ──
  useEffect(() => {
    const timeTracker = setInterval(() => {
      setModules(prev => {
        let changed = false;
        const next = prev.map(m => {
          if (!m.hidden) {
            changed = true;
            return { ...m, timeOnDesk: (m.timeOnDesk || 0) + 1 }; // Incrementa 1 minuto
          }
          return m;
        });
        
        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          localStorage.setItem(`${STORAGE_KEY}_updatedAt`, Date.now().toString())
          persist(next)
        }
        return changed ? next : prev;
      });
    }, 60000); // Cada 60 segundos (1 minuto)

    return () => clearInterval(timeTracker);
  }, [persist])


  // ── Module CRUD ──────────────────────────────────────────────────────────
  const addModule = useCallback((type) => {
    setModules(prev => {
      // Si el módulo ya existe (y estaba oculto), simplemente lo mostramos
      const existing = prev.find(m => m.type === type)
      if (existing) {
        const next = prev.map(m => m.id === existing.id ? { ...m, hidden: false, x: 60, y: 60 } : m)
        persist(next)
        return next
      }

      // Si no existe en absoluto, lo creamos nuevo
      const id = String(Date.now())
      const fresh = sanitize({
        id,
        type,
        x: 60 + prev.length * 30,
        y: 60 + prev.length * 30,
        width: 320,
        height: 220,
        pinned: false,
        hidden: false,
        color: getColor(id),
        content: makeDefaultContent(type),
      })
      const next = [...prev, fresh]
      persist(next)
      return next
    })
  }, [persist])

  /**
   * updateModule — merges `patch` into the module with matching id.
   * Called once on drag-end / resize-end / pin toggle / color change.
   */
  const updateModule = useCallback((id, patch) => {
    setModules(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m)
      persist(next)
      return next
    })
  }, [persist])

  const updateModuleContent = useCallback((id, content) => {
    setModules(prev => {
      const next = prev.map(m => m.id === id ? { ...m, content } : m)
      persist(next)
      return next
    })
  }, [persist])

  const removeModule = useCallback((id) => {
    setModules(prev => {
      // En lugar de borrarlo y perder sus datos, simplemente lo ocultamos
      const next = prev.map(m => m.id === id ? { ...m, hidden: true } : m)
      persist(next)
      return next
    })
  }, [persist])

  // ── Feedback Submit ──────────────────────────────────────────────────────
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!feedbackData.message.trim()) return

    setIsSubmittingFeedback(true)
    setFeedbackMessage({ type: '', text: '' })
    
    try {
      const { userAPI } = await import('../services/api')
      await userAPI.sendFeedback(feedbackData.type, feedbackData.message)
      setFeedbackMessage({ type: 'success', text: '¡Gracias! Hemos recibido tu mensaje.' })
      setTimeout(() => {
        setShowFeedbackModal(false)
        setFeedbackMessage({ type: '', text: '' })
        setFeedbackData({ type: 'Sugerencia', message: '' })
      }, 2500)
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error al enviar feedback' })
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // ── All tasks (for ProgressModule linking) ───────────────────────────────
  const allTasks = useMemo(
    () => modules.filter(m => m.type === 'tasks').flatMap(m => m.content?.items ?? []),
    [modules]
  )

  // ── Render module content ────────────────────────────────────────────────
  const renderContent = (m) => {
    const onChange = (content) => updateModuleContent(m.id, content)
    if (m.type === 'tasks') return <TaskModule data={m.content} onChange={onChange} />
    if (m.type === 'progress') return <ProgressModule data={m.content} onChange={onChange} allTasks={allTasks} />
    if (m.type === 'pomodoro') return <PomodoroModule data={m.content} onChange={onChange} />
    if (m.type === 'notes') return <NotesModule data={m.content} onChange={onChange} />
    if (m.type === 'music') return <MusicModule data={m.content} onChange={onChange} />
    return <div>Módulo desconocido</div>
  }

  const handleTutorialComplete = async () => {
    setShowTutorial(false)
    try {
      const { userAPI } = await import('../services/api')
      const prefs = { ...(user?.preferences || {}), tutorialCompleted: true }
      const res = await userAPI.updateProfile({ preferences: prefs })
      if (res.data?.user) {
        setUser(res.data.user)
        localStorage.setItem('workdesk_user', JSON.stringify(res.data.user))
      }
    } catch (e) {
      console.error("Failed to update tutorial completion status", e)
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="dashboard-root"
      style={wallpaper ? {
        background: wallpaper.startsWith('data:image') || wallpaper.startsWith('http') || wallpaper.startsWith('/')
          ? `url('${wallpaper}') center/cover fixed no-repeat`
          : wallpaper
      } : {}}
    >
      {/* Background Overlay fixed to screen to prevent cutoff on scroll */}
      {wallpaper && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(13, 17, 23, 0.75)',
          backdropFilter: 'blur(2px)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
      )}

      {/* ── Header ── */}
      <header className="dashboard-header" style={{ position: 'relative', zIndex: 50 }}>
        <div className="dashboard-left">
          <img src="/media/Logo_WorkDesk-removebg-preview.png" alt="WorkDesk" className="logo-small" />
        </div>

        <div className="header-center-widget">
          <div className="header-clock">
            <span className="clock-time">
              {clockFormat === '12h'
                ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '')
                : currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="clock-date">
              {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        <div className="dashboard-right">
          <div className="header-sync-status">
            {syncStatus === 'syncing' ? (
              <span className="sync-text syncing">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1.5s linear infinite', marginRight: '6px' }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.58 5.58"/>
                </svg>
                Guardando...
              </span>
            ) : syncStatus === 'error' ? (
              <span className="sync-text error" title="Reintentando en breve...">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Sin conexión
              </span>
            ) : (
              <span className="sync-text saved">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Guardado
              </span>
            )}
          </div>

          <div className="toolhub">
            <button
              className="btn btn-sm btn-outline-light toolhub-btn"
              onPointerDown={(e) => { e.stopPropagation(); onGoToToolHub?.() }}
              title="ToolHub"
            >
              ToolHub
            </button>
          </div>

          <div className="profile" style={{ position: 'relative' }}>
            <button
              className="profile-btn"
              onPointerDown={(e) => { e.stopPropagation(); setShowProfileMenu(s => !s) }}
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
              title="Cuenta"
            >
              {user?.avatar
                ? <img src={user.avatar} alt="Avatar" className="header-avatar" />
                : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              }
            </button>

            {showProfileMenu && (
              <div className="profile-menu" style={{ zIndex: 9999 }} onPointerDown={(e) => e.stopPropagation()}>
                <button className="profile-menu-btn" onClick={() => { setShowProfileMenu(false); onGoToProfile?.() }}>
                  Perfil
                </button>
                <button className="profile-menu-btn" onClick={() => { setShowProfileMenu(false); onLogout() }}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Module Picker ── */}
      <div className="dashboard-controls" style={{ position: 'relative', zIndex: 10 }}>
        <ModulePicker onAdd={addModule} disabledTypes={modules.filter(m => !m.hidden).map(m => m.type)} />
      </div>

      {/* ── Canvas ── */}
      <div
        className="dashboard-canvas"
        id="dashboard-canvas"
        ref={canvasRef}
      >
        {isInitialLoading ? (
          <div className="dashboard-empty-state">
            <div className="empty-state-icon" style={{ animation: 'spin 1.5s linear infinite' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            </div>
            <h2 className="empty-state-title">Sincronizando espacio...</h2>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : modules.filter(m => !m.hidden).length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="empty-state-title">Tu espacio está vacío</h2>
            <p className="empty-state-desc">Comienza añadiendo tu primer módulo para organizar tu trabajo. Usa el menú "Agregar Módulo" arriba a la izquierda.</p>
          </div>
        ) : (
          modules.filter(m => !m.hidden).map(m => (
            <ModuleCard
              key={m.type}
              module={m}
              onUpdate={(patch) => updateModule(m.id, patch)}
              onRemove={removeModule}
            >
              {renderContent(m)}
            </ModuleCard>
          ))
        )}
      </div>

      {/* ── Feedback Floating Button ── */}
      <button 
        className="feedback-float-btn"
        onClick={() => setShowFeedbackModal(true)}
        title="Enviar Feedback"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
        </svg>
      </button>

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && (
        <div className="feedback-modal-overlay" onClick={() => !isSubmittingFeedback && setShowFeedbackModal(false)}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <div className="feedback-modal-header">
              <h3>Danos tu opinión</h3>
              <button className="close-btn" onClick={() => !isSubmittingFeedback && setShowFeedbackModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="feedback-form">
              {feedbackMessage.text && (
                <div className={`alert alert-${feedbackMessage.type === 'error' ? 'danger' : 'success'} mb-3`} style={{ fontSize: '14px', padding: '10px' }}>
                  {feedbackMessage.text}
                </div>
              )}
              
              <div className="mb-3">
                <label className="form-label text-white" style={{ fontSize: '13px' }}>¿Qué tipo de comentario tienes?</label>
                <select 
                  className="form-select profile-input" 
                  value={feedbackData.type}
                  onChange={e => setFeedbackData({...feedbackData, type: e.target.value})}
                  disabled={isSubmittingFeedback}
                >
                  <option value="Sugerencia">✨ Sugerir nueva función/módulo</option>
                  <option value="Bug">🐞 Reportar un Bug</option>
                  <option value="Otro">💬 Otro comentario</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label text-white" style={{ fontSize: '13px' }}>Detalles:</label>
                <textarea 
                  className="form-control profile-input" 
                  rows="4" 
                  placeholder="Cuéntanos más al respecto..."
                  required
                  value={feedbackData.message}
                  onChange={e => setFeedbackData({...feedbackData, message: e.target.value})}
                  disabled={isSubmittingFeedback}
                  style={{ resize: 'none' }}
                ></textarea>
              </div>
              
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" className="btn btn-outline-light" onClick={() => setShowFeedbackModal(false)} disabled={isSubmittingFeedback}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? 'Enviando...' : 'Enviar Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tutorial Overlay ── */}
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

    </div>
  )
}
