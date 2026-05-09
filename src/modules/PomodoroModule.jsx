import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../styles/pomodoroModule.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const S = {
  WORK:        'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK:  'longBreak',
}
const LABELS = {
  [S.WORK]:        'Concentración',
  [S.SHORT_BREAK]: 'Descanso Corto',
  [S.LONG_BREAK]:  'Descanso Largo',
}
const COLORS = {
  [S.WORK]:        '#ff6b6b',
  [S.SHORT_BREAK]: '#4ecdc4',
  [S.LONG_BREAK]:  '#45b7d1',
}
const DEFAULT_SETTINGS = {
  [S.WORK]: 25,
  [S.SHORT_BREAK]: 5,
  [S.LONG_BREAK]: 15,
}

const RING_R = 54
const RING_CIRC = 2 * Math.PI * RING_R

// ─── Audio ────────────────────────────────────────────────────────────────────
function playAlarm(type = 'beep') {
  if (type === 'silent') return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    if (type === 'beep') {
      ;[0, 0.65].forEach(delay => {
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880; osc.type = 'sine'
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.55)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.55)
      })
    } else if (type === 'bell') {
      [523, 1047, 2093].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        gain.gain.setValueAtTime(0.25 / (i + 1), ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 2.5)
      })
    } else if (type === 'click') {
      ;[0, 0.14, 0.28].forEach(delay => {
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 620; osc.type = 'square'
        gain.gain.setValueAtTime(0.18, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.07)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.07)
      })
    }
  } catch (e) {
    console.error('Audio error:', e)
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────────
function canNotify() {
  return 'Notification' in window
}
function notifPermission() {
  return canNotify() ? Notification.permission : 'denied'
}
async function requestNotifPermission() {
  if (canNotify()) await Notification.requestPermission()
}
function sendNotif(title, body) {
  if (canNotify() && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', silent: true })
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PomodoroModule({ data = {}, onChange }) {
  const [settings,           setSettings]           = useState(data.settings || DEFAULT_SETTINGS)
  const [session,            setSession]            = useState(data.currentSession || S.WORK)
  const [timeLeft,           setTimeLeft]           = useState(data.timeLeft || DEFAULT_SETTINGS[S.WORK] * 60)
  const [running,            setRunning]            = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(data.completedPomodoros || 0)
  const [sessionHistory,     setSessionHistory]     = useState(data.sessionHistory || [])
  const [streakCount,        setStreakCount]        = useState(data.streakCount || 0)
  const [lastStreakDate,     setLastStreakDate]     = useState(data.lastStreakDate || null)
  const [cyclesCompletedToday, setCyclesCompletedToday] = useState(data.cyclesCompletedToday || 0)
  const [alarm,              setAlarm]              = useState(data.alarm || 'beep')
  const [showSettings,       setShowSettings]       = useState(false)
  const [showHistory,        setShowHistory]        = useState(false)
  const [showCelebration,    setShowCelebration]    = useState(false)
  const [notifPerm,          setNotifPerm]          = useState(notifPermission())

  const timerRef = useRef(null)

  const totalTime = settings[session] * 60
  const progress  = ((totalTime - timeLeft) / totalTime) * 100
  const minutes   = Math.floor(timeLeft / 60)
  const seconds   = timeLeft % 60
  const color     = COLORS[session]

  const todaySessions = sessionHistory.filter(s => {
    return new Date(s.completedAt).toDateString() === new Date().toDateString()
      && s.type === S.WORK
  }).length

  // Persist
  useEffect(() => {
    onChange?.({ settings, currentSession: session, timeLeft, running: false,
      completedPomodoros, sessionHistory, streakCount, lastStreakDate, cyclesCompletedToday, alarm })
  }, [settings, session, timeLeft, completedPomodoros, sessionHistory, streakCount, lastStreakDate, cyclesCompletedToday, alarm])

  // Update page title while running
  useEffect(() => {
    if (running) {
      document.title = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')} — ${LABELS[session]}`
    } else {
      document.title = 'WorkDesk'
    }
    return () => { document.title = 'WorkDesk' }
  }, [running, minutes, seconds, session])

  const switchSession = useCallback((type) => {
    setSession(type)
    setTimeLeft(settings[type] * 60)
    setRunning(false)
    clearInterval(timerRef.current)
  }, [settings])

  // ── Timer engine (Drift-proof) ──────────────────────────────────────────
  const [targetTime, setTargetTime] = useState(null)

  const handleComplete = useCallback(() => {
    playAlarm(alarm)
    const now = new Date().toISOString()
    setSessionHistory(prev => [{ type: session, completedAt: now, duration: settings[session] }, ...prev].slice(0, 30))

    if (session === S.WORK) {
      const newCount = completedPomodoros + 1
      setCompletedPomodoros(newCount)
      sendNotif('🍅 ¡Pomodoro completado!', newCount % 4 === 0 ? 'Es hora de tu descanso largo 🧘' : 'Es hora de un descanso corto ☕')
      switchSession(newCount % 4 === 0 ? S.LONG_BREAK : S.SHORT_BREAK)
    } else if (session === S.LONG_BREAK) {
      const today = new Date().toDateString()
      const lastDate = lastStreakDate ? new Date(lastStreakDate).toDateString() : null
      if (lastDate !== today) {
        const consecutive = lastStreakDate && (new Date(lastStreakDate).getTime() > new Date(today).getTime() - 2 * 86400000) ? streakCount + 1 : 1
        setStreakCount(consecutive)
        setLastStreakDate(now)
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3500)
      }
      setCyclesCompletedToday(prev => prev + 1)
      sendNotif('🔥 ¡Ciclo completo!', `Llevas ${cyclesCompletedToday + 1} ciclos hoy`)
      switchSession(S.WORK)
    } else {
      sendNotif('💪 ¡A trabajar!', 'El descanso terminó.')
      switchSession(S.WORK)
    }
  }, [session, settings, completedPomodoros, streakCount, lastStreakDate, cyclesCompletedToday, alarm, switchSession])

  useEffect(() => {
    if (!running) {
      setTargetTime(null)
      return
    }

    // Al iniciar/resumir, calculamos el momento exacto del futuro en que debe terminar
    const endTime = Date.now() + (timeLeft * 1000)
    setTargetTime(endTime)

    timerRef.current = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        setTimeLeft(0)
        setRunning(false)
        handleComplete()
      } else {
        setTimeLeft(remaining)
      }
    }, 200) // Revisamos más seguido (5 veces por seg) para una UI ultra fluida

    return () => clearInterval(timerRef.current)
  }, [running, handleComplete])

  const toggleTimer = () => setRunning(r => !r)

  const resetSession = () => {
    setRunning(false)
    setTimeLeft(settings[session] * 60)
  }

  const skipSession = () => {
    setRunning(false)
    if (session === S.WORK) {
      const n = completedPomodoros + 1
      setCompletedPomodoros(n)
      switchSession(n % 4 === 0 ? S.LONG_BREAK : S.SHORT_BREAK)
    } else {
      switchSession(S.WORK)
    }
  }

  const updateSetting = (type, val) => {
    const v = Math.max(1, Math.min(60, parseInt(val) || 1))
    setSettings(prev => {
      const next = { ...prev, [type]: v }
      if (session === type) setTimeLeft(v * 60)
      return next
    })
  }

  const handleNotifRequest = async () => {
    await requestNotifPermission()
    setNotifPerm(notifPermission())
  }

  const strokeOffset = RING_CIRC * (1 - progress / 100)

  return (
    <div className="pomodoro-module" style={{ '--pom-color': color }}>

      {/* Header */}
      <div className="pom-header">
        <div className="pom-streak-badge">
          <span>🔥</span>
          {streakCount} día{streakCount !== 1 ? 's' : ''}
          {cyclesCompletedToday > 0 && <span style={{ color: '#6EE7B7', fontSize: 11 }}>✓</span>}
        </div>
        <div className="pom-header-actions">
          {/* History */}
          <button
            className={`pom-icon-btn ${showHistory ? 'active' : ''}`}
            onClick={() => { setShowHistory(h => !h); setShowSettings(false) }}
            title="Historial"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 3" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Settings */}
          <button
            className={`pom-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => { setShowSettings(s => !s); setShowHistory(false) }}
            title="Configuración"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Notification permission banner */}
      {canNotify() && notifPerm === 'default' && (
        <div className="pom-notif-banner">
          <svg viewBox="0 0 20 20" fill="none" width="13" height="13">
            <path d="M10 2a6 6 0 00-6 6v3l-1.5 2h15l-1.5-2V8a6 6 0 00-6-6zM8 17a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Activa notificaciones para avisos fuera de la pestaña
          <button onClick={handleNotifRequest}>Activar</button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="pom-settings">
          {[
            [S.WORK,        'Concentración (min)'],
            [S.SHORT_BREAK, 'Descanso Corto (min)'],
            [S.LONG_BREAK,  'Descanso Largo (min)'],
          ].map(([type, label]) => (
            <div className="pom-setting-row" key={type}>
              <label>{label}</label>
              <input
                type="number" min="1" max="60"
                className="pom-setting-input"
                value={settings[type]}
                onChange={e => updateSetting(type, e.target.value)}
              />
            </div>
          ))}
          <div className="pom-sound-row">
            <label>Sonido de alarma</label>
            <select
              className="pom-sound-select"
              value={alarm}
              onChange={e => { setAlarm(e.target.value); playAlarm(e.target.value) }}
            >
              <option value="beep">🔔 Beep</option>
              <option value="bell">🔕 Campana</option>
              <option value="click">🖱️ Clic suave</option>
              <option value="silent">🔇 Silencio</option>
            </select>
          </div>
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div className="pom-history">
          <div className="pom-history-stats">
            <span>Hoy: {todaySessions} 🍅</span>
            <span>Total: {completedPomodoros}</span>
          </div>
          {sessionHistory.length > 0 ? sessionHistory.slice(0, 12).map((s, i) => (
            <div className="pom-history-item" key={i}>
              <span className={`pom-history-badge ${s.type}`}>{LABELS[s.type]}</span>
              <span className="pom-history-time">
                {new Date(s.completedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )) : <div className="pom-history-empty">Sin sesiones aún</div>}
        </div>
      )}

      {/* Session tabs */}
      <div className="pom-session-tabs">
        {[S.WORK, S.SHORT_BREAK, S.LONG_BREAK].map(type => (
          <button
            key={type}
            className={`pom-session-tab ${session === type ? 'active' : ''}`}
            onClick={() => switchSession(type)}
            style={session === type ? { '--pom-color': COLORS[type] } : {}}
          >
            {type === S.WORK ? 'Focus' : type === S.SHORT_BREAK ? 'Descanso' : 'Largo'}
          </button>
        ))}
      </div>

      {/* Ring Timer */}
      <div className="pom-ring-wrap">
        <svg className="pom-ring-svg" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            className="pom-ring-track"
            cx="60" cy="60" r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle
            className="pom-ring-progress"
            cx="60" cy="60" r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={strokeOffset}
          />
        </svg>
        <div className="pom-ring-center">
          <div className="pom-time">
            {String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
          </div>
          <div className="pom-session-label-inner">{LABELS[session]}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="pom-controls">
        {/* Reset */}
        <button className="pom-btn-icon" onClick={resetSession} title="Reiniciar">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M3 8a5 5 0 105-5H5M5 1v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button className="pom-btn-play" onClick={toggleTimer}>
          {running ? (
            <>
              <svg viewBox="0 0 14 14" fill="currentColor" width="12" height="12">
                <rect x="2" y="1" width="3.5" height="12" rx="1"/>
                <rect x="8.5" y="1" width="3.5" height="12" rx="1"/>
              </svg>
              Pausar
            </>
          ) : (
            <>
              <svg viewBox="0 0 14 14" fill="currentColor" width="11" height="11">
                <path d="M3 1.5l9 5.5-9 5.5V1.5z"/>
              </svg>
              {timeLeft === totalTime ? 'Iniciar' : 'Continuar'}
            </>
          )}
        </button>

        {/* Skip */}
        <button className="pom-btn-icon" onClick={skipSession} title="Saltar sesión">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M3 4l6 4-6 4V4zM13 4v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Tomato progress */}
      <div className="pom-progress">
        <div className="pom-progress-label">Progreso hacia descanso largo</div>
        <div className="pom-tomatoes">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pom-tomato ${i < (completedPomodoros % 4) ? 'done' : ''}`}>
              {i < (completedPomodoros % 4) ? '🍅' : '⬜'}
            </div>
          ))}
        </div>
        <div className="pom-today-label">
          {todaySessions > 0
            ? `${todaySessions} pomodoro${todaySessions > 1 ? 's' : ''} hoy · ${cyclesCompletedToday} ciclo${cyclesCompletedToday !== 1 ? 's' : ''} completado${cyclesCompletedToday !== 1 ? 's' : ''}`
            : 'Aún no has completado pomodoros hoy'}
        </div>
      </div>

      {/* Streak celebration */}
      {showCelebration && (
        <div className="pom-celebration">
          <span className="pom-celebration-icon">🎉</span>
          <div>
            <div className="pom-celebration-text">¡Racha de {streakCount} día{streakCount !== 1 ? 's' : ''}!</div>
            <div style={{ fontSize: 10, color: 'rgba(240,246,255,0.5)', marginTop: 2 }}>Ciclo completo finalizado</div>
          </div>
        </div>
      )}
    </div>
  )
}
