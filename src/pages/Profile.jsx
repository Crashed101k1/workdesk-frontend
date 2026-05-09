import React, { useState, useEffect, useRef } from 'react'
import '../styles/profile.css'
import { userAPI } from '../services/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString) {
  if (!dateString) return 'No disponible'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Profile({ onBack, onLogout }) {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ modulesOnDesk: 0, tasksPending: 0, pomodoroStreak: 0, totalTasks: 0, tasksCompleted: 0, totalPomodoros: 0, lastLogin: null })
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState('general') // 'general' | 'appearance' | 'account'
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── General Tab State ──
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isEditingName, setIsEditingName]     = useState(false)
  const [editNameValue, setEditNameValue]     = useState('')
  const fileInputRef = useRef(null)

  // ── Appearance Tab State ──
  const [wallpaper, setWallpaper] = useState('')
  const [clockFormat, setClockFormat] = useState('24h')
  const [previewTime, setPreviewTime] = useState(new Date())
  const wpInputRef = useRef(null)

  const [isImporting, setIsImporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // ── Password State ──
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  // ── Load Data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load Wallpaper
    const wp = localStorage.getItem('workdesk_wallpaper') || ''
    setWallpaper(wp)

    // Load Clock Format
    const cf = localStorage.getItem('workdesk_clock_format') || '24h'
    setClockFormat(cf)

    // Timer for preview clocks
    const timer = setInterval(() => setPreviewTime(new Date()), 1000)

    // Load User
    const userData = localStorage.getItem('workdesk_user')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUser(parsed)
        setEditNameValue(parsed.name || '')
      } catch (e) { console.error(e) }
    }

    // Load Stats
    const modulesData = localStorage.getItem('workdesk_modules')
    if (modulesData) {
      try {
        const modules = JSON.parse(modulesData)
        const s = calculateStats(modules)
        setStats(prev => ({ ...prev, ...s, lastLogin: localStorage.getItem('workdesk_last_login') || null }))
      } catch (e) { console.error(e) }
    }

    setLoading(false)

    return () => clearInterval(timer)

    // Background fetch
    userAPI.getProfile().then(res => {
      if (res.data?.user) {
        setUser(res.data.user)
        setEditNameValue(res.data.user.name || '')
        localStorage.setItem('workdesk_user', JSON.stringify(res.data.user))
      }
      if (res.data?.modules) {
        const s = calculateStats(res.data.modules)
        setStats(prev => ({ ...prev, ...s }))
        localStorage.setItem('workdesk_modules', JSON.stringify(res.data.modules))
      }
    }).catch(() => {})
  }, [])

  function calculateStats(modules) {
    if (!Array.isArray(modules)) return { modulesOnDesk: 0, tasksPending: 0, pomodoroStreak: 0, totalTasks: 0, tasksCompleted: 0, totalPomodoros: 0 }
    
    const validModules = modules.filter(m => m && m.type)
    const modulesOnDesk = validModules.length
    let totalTasks = 0, tasksCompleted = 0, pomodoroStreak = 0, totalPomodoros = 0
    
    modules.forEach(m => {
      if (m.type === 'tasks' && m.content?.items) {
        totalTasks += m.content.items.length
        tasksCompleted += m.content.items.filter(i => i.done).length
      }
      if (m.type === 'pomodoro' && m.content) {
        if ((m.content.streakCount || 0) > pomodoroStreak) pomodoroStreak = m.content.streakCount || 0
        totalPomodoros += m.content.completedPomodoros || 0
      }
    })
    return { modulesOnDesk, tasksPending: totalTasks - tasksCompleted, pomodoroStreak, totalTasks, tasksCompleted, totalPomodoros }
  }

  // ── Actions: General ────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) return setError('Por favor selecciona una imagen válida')
    // Límite estricto de 500KB para evitar saturar el LocalStorage
    if (file.size > 500 * 1024) return setError('La imagen de perfil es muy pesada (máx 500KB)')
    
    setUploadingAvatar(true); setError(''); setSuccess('')
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file)
      })
      const response = await userAPI.updateProfile({ avatar: base64 })
      if (response.data?.user) {
        setUser(response.data.user)
        localStorage.setItem('workdesk_user', JSON.stringify(response.data.user))
        setSuccess('Avatar actualizado')
      }
    } catch (err) { setError('Error al subir la imagen') }
    finally { setUploadingAvatar(false) }
  }

  const handleSaveName = async () => {
    if (!editNameValue.trim()) return
    setError(''); setSuccess('')
    try {
      const response = await userAPI.updateProfile({ name: editNameValue.trim() })
      if (response.data?.user) {
        setUser(response.data.user)
        localStorage.setItem('workdesk_user', JSON.stringify(response.data.user))
        setIsEditingName(false)
        setSuccess('Nombre actualizado')
      }
    } catch (err) { setError('Error al actualizar nombre') }
  }

  // ── Actions: Appearance ─────────────────────────────────────────────────────
  const setAndSaveWallpaper = async (val) => {
    setWallpaper(val)
    if (val) localStorage.setItem('workdesk_wallpaper', val)
    else localStorage.removeItem('workdesk_wallpaper')

    // Sincronizar preferencia con MongoDB
    try {
      const prefs = { ...(user?.preferences || {}), defaultBackground: val || null }
      const res = await userAPI.updateProfile({ preferences: prefs })
      if (res.data?.user) {
        setUser(res.data.user)
        localStorage.setItem('workdesk_user', JSON.stringify(res.data.user))
      }
    } catch (err) {
      console.error('Error guardando fondo en backend', err)
    }

    setSuccess('Fondo actualizado. Se aplicará al volver al Dashboard.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const setAndSaveClockFormat = async (format) => {
    setClockFormat(format)
    localStorage.setItem('workdesk_clock_format', format)

    // Sincronizar preferencia con MongoDB
    try {
      const prefs = { ...(user?.preferences || {}), clockFormat: format }
      const res = await userAPI.updateProfile({ preferences: prefs })
      if (res.data?.user) {
        setUser(res.data.user)
        localStorage.setItem('workdesk_user', JSON.stringify(res.data.user))
      }
    } catch (err) { console.error('Error saving clock format:', err) }
  }

  const handleCustomWallpaperChange = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen válida')
    // Límite de 800KB para proteger el espacio del LocalStorage
    if (file.size > 800 * 1024) return setError('El fondo de pantalla es muy pesado (máx 800KB)')
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setAndSaveWallpaper(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // ── Actions: Account (Import / Export / Reset) ──────────────────────────────
  const handleExportData = () => {
    const data = {
      user,
      wallpaper: localStorage.getItem('workdesk_wallpaper') || '',
      modules: JSON.parse(localStorage.getItem('workdesk_modules') || '[]'),
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workdesk-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const importInputRef = useRef(null)

  const handleImportData = (e) => {
    const file = e.target.files[0]; if (!file) return
    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data || !Array.isArray(data.modules)) {
          setIsImporting(false)
          return setError('Archivo inválido o corrupto. Se requiere un export válido de WorkDesk.')
        }
        
        // 1. Restaurar avatar y fondo si existen en el respaldo
        let avatarToUpdate = undefined;
        let wallpaperToUpdate = undefined;

        if (data.user && data.user.avatar) {
          avatarToUpdate = data.user.avatar;
        }
        if (data.wallpaper) {
          wallpaperToUpdate = data.wallpaper;
          localStorage.setItem('workdesk_wallpaper', data.wallpaper);
        } else if (data.user?.preferences?.defaultBackground) {
          wallpaperToUpdate = data.user.preferences.defaultBackground;
          localStorage.setItem('workdesk_wallpaper', wallpaperToUpdate);
        }

        if (avatarToUpdate !== undefined || wallpaperToUpdate !== undefined) {
          const updatePayload = {};
          if (avatarToUpdate !== undefined) updatePayload.avatar = avatarToUpdate;
          if (wallpaperToUpdate !== undefined) updatePayload.preferences = { defaultBackground: wallpaperToUpdate };
          
          const res = await userAPI.updateProfile(updatePayload);
          if (res.data?.user) {
            localStorage.setItem('workdesk_user', JSON.stringify(res.data.user));
          }
        }

        // 2. Restaurar módulos
        const { modulesAPI } = await import('../services/api')
        await modulesAPI.saveAll(data.modules)
        localStorage.setItem('workdesk_modules', JSON.stringify(data.modules))
        localStorage.setItem('workdesk_modules_updatedAt', Date.now().toString())
        localStorage.setItem('workdesk_modules_syncedAt', Date.now().toString())
        
        setSuccess('Datos importados con éxito. Recargando el escritorio...')
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        setIsImporting(false)
        setError('Error al procesar el archivo JSON importado.')
      }
    }
    reader.readAsText(file)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      return setError('Las contraseñas nuevas no coinciden')
    }
    if (passwordData.new.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres')
    }
    setIsSubmittingPassword(true)
    setError('')
    setSuccess('')
    try {
      const { authAPI } = await import('../services/api')
      await authAPI.changePassword(passwordData.current, passwordData.new)
      setSuccess('Contraseña actualizada exitosamente')
      setIsChangingPassword(false)
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (err) {
      setError(err.message || 'Error al actualizar contraseña')
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <div className="profile-page"><div className="profile-container"><div className="profile-loading">Cargando...</div></div></div>
  if (!user) return <div className="profile-page"><div className="profile-container"><div className="profile-empty"><h2>Sin sesión</h2><button className="btn btn-primary" onClick={onBack}>Volver</button></div></div></div>

  // Determinar Módulo Favorito por Tiempo en Dashboard
  const getFavModule = () => {
    const modules = JSON.parse(localStorage.getItem('workdesk_modules') || '[]')
    if (!modules || modules.length === 0) return 'Ninguno'
    
    // Filtramos solo módulos válidos y buscamos el que tenga mayor timeOnDesk
    const mostUsed = modules.reduce((prev, current) => {
      return ((current.timeOnDesk || 0) > (prev.timeOnDesk || 0)) ? current : prev
    }, modules[0])

    if (!mostUsed || !mostUsed.timeOnDesk || mostUsed.timeOnDesk === 0) return 'Ninguno'

    // Traducir los tipos al español para la interfaz
    const TYPE_LABELS = {
      tasks: 'Tareas',
      pomodoro: 'Pomodoro',
      progress: 'Progreso',
      notes: 'Notas',
      music: 'Música'
    }
    return TYPE_LABELS[mostUsed.type] || mostUsed.type
  }

  const favModule = getFavModule()

  return (
    <div className="profile-page">
      <div className="profile-container">
        
        {/* Header Actions */}
        <div className="profile-top-bar">
          <button className="btn btn-sm btn-outline-light" onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <button className="btn btn-sm btn-danger" onClick={onLogout}>
            Cerrar Sesión
          </button>
        </div>

        {/* Layout: Sidebar Tabs + Content Area */}
        <div className="profile-layout">
          
          <div className="profile-tabs">
            <button className={`profile-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
              👤 General
            </button>
            <button className={`profile-tab ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
              🎨 Apariencia
            </button>
            <button className={`profile-tab ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
              🔒 Cuenta & Datos
            </button>
          </div>

          <div className="profile-content">
            {error && <div className="profile-alert error">{error}</div>}
            {success && <div className="profile-alert success">{success}</div>}

            {/* ── TAB: GENERAL ── */}
            {activeTab === 'general' && (
              <div className="profile-tab-pane">
                <div className="profile-section-title">Información Personal</div>
                
                <div className="profile-general-grid">
                  <div className="profile-avatar-wrapper">
                    <div className={`profile-avatar-lg ${uploadingAvatar ? 'uploading' : ''}`} onClick={() => fileInputRef.current?.click()}>
                      {user.avatar ? <img src={user.avatar} alt="Avatar" /> : <span>{getInitials(user.name)}</span>}
                      <div className="profile-avatar-overlay">
                        {uploadingAvatar ? '⏳ Subiendo...' : '📷 Cambiar'}
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{display:'none'}} />
                  </div>

                  <div className="profile-info-fields">
                    <div className="profile-field">
                      <label>Nombre</label>
                      {isEditingName ? (
                        <div className="profile-name-edit">
                          <input 
                            type="text" 
                            className="profile-input"
                            value={editNameValue} 
                            onChange={e => setEditNameValue(e.target.value)}
                            autoFocus
                          />
                          <button className="btn btn-sm btn-success" onClick={handleSaveName}>Guardar</button>
                          <button className="btn btn-sm btn-outline-light" onClick={() => {setIsEditingName(false); setEditNameValue(user.name)}}>Cancelar</button>
                        </div>
                      ) : (
                        <div className="profile-name-display">
                          <h3>{user.name}</h3>
                          <button className="btn-icon" onClick={() => setIsEditingName(true)} title="Editar nombre">✏️</button>
                        </div>
                      )}
                    </div>
                    <div className="profile-field">
                      <label>Correo Electrónico</label>
                      <p className="profile-read-only">{user.email}</p>
                    </div>
                    <div className="profile-field">
                      <label>Miembro desde</label>
                      <p className="profile-read-only-sm">{formatDate(user.createdAt || user.registeredAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="profile-section-title" style={{marginTop: '30px'}}>Resumen de Actividad</div>
                <div className="profile-stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.tasksCompleted} / {stats.totalTasks}</div>
                    <div className="stat-label">Tareas completadas</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.pomodoroStreak} días</div>
                    <div className="stat-label">Racha Pomodoro</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{favModule}</div>
                    <div className="stat-label">Módulo Favorito</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: APPEARANCE ── */}
            {activeTab === 'appearance' && (
              <div className="profile-tab-pane">
                <div className="profile-section-title">Fondo de Pantalla (Dashboard)</div>
                <p className="profile-desc">
                  Personaliza tu espacio de trabajo. Si usas una imagen, aplicaremos un filtro oscuro tipo "VS Code" para que tus módulos sigan siendo el foco principal y no te distraigas.
                </p>

                <div className="wallpaper-options">
                  <button 
                    className={`wp-option ${!wallpaper ? 'active' : ''}`} 
                    style={{ background: '#0D1117' }}
                    onClick={() => setAndSaveWallpaper('')}
                  >
                    <span>Color Sólido (Default)</span>
                  </button>
                  <button 
                    className={`wp-option ${wallpaper === 'linear-gradient(135deg, #1e3a8a, #0f172a)' ? 'active' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #0f172a)' }}
                    onClick={() => setAndSaveWallpaper('linear-gradient(135deg, #1e3a8a, #0f172a)')}
                  >
                    <span>Océano Oscuro</span>
                  </button>
                  <button 
                    className={`wp-option ${wallpaper === 'linear-gradient(135deg, #4338ca, #be185d)' ? 'active' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #4338ca, #be185d)' }}
                    onClick={() => setAndSaveWallpaper('linear-gradient(135deg, #4338ca, #be185d)')}
                  >
                    <span>Ocaso Neón</span>
                  </button>
                  <button 
                    className={`wp-option ${wallpaper === 'linear-gradient(135deg, #065f46, #0f172a)' ? 'active' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #065f46, #0f172a)' }}
                    onClick={() => setAndSaveWallpaper('linear-gradient(135deg, #065f46, #0f172a)')}
                  >
                    <span>Bosque Místico</span>
                  </button>
                  <button 
                    className={`wp-option ${wallpaper === 'linear-gradient(135deg, #0f766e, #4c1d95)' ? 'active' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #0f766e, #4c1d95)' }}
                    onClick={() => setAndSaveWallpaper('linear-gradient(135deg, #0f766e, #4c1d95)')}
                  >
                    <span>Aurora Boreal</span>
                  </button>
                  <button 
                    className={`wp-option ${wallpaper && wallpaper.includes('data:image') ? 'active' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' }}
                    onClick={() => wpInputRef.current?.click()}
                  >
                    <span>📁 Subir Imagen</span>
                  </button>
                  <input type="file" ref={wpInputRef} onChange={handleCustomWallpaperChange} accept="image/*" style={{display:'none'}} />
                </div>

                {wallpaper && wallpaper.includes('data:image') && (
                  <div className="wp-preview-box">
                    <img src={wallpaper} alt="Wallpaper Preview" className="wp-preview-img" />
                    <button className="btn btn-sm btn-danger wp-remove-btn" onClick={() => setAndSaveWallpaper('')}>
                      Quitar Imagen
                    </button>
                  </div>
                )}

                <div className="profile-section-title" style={{ marginTop: '32px' }}>Formato de Hora</div>
                <p className="profile-desc">
                  Elige el formato de visualización del reloj en el dashboard.
                </p>

                <div className="clock-format-options">
                  <button
                    className={`clock-format-btn ${clockFormat === '12h' ? 'active' : ''}`}
                    onClick={() => setAndSaveClockFormat('12h')}
                  >
                    <span className="clock-format-label">12 horas</span>
                    <span className="clock-format-example">
                      {previewTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '')}
                    </span>
                  </button>
                  <button
                    className={`clock-format-btn ${clockFormat === '24h' ? 'active' : ''}`}
                    onClick={() => setAndSaveClockFormat('24h')}
                  >
                    <span className="clock-format-label">24 horas</span>
                    <span className="clock-format-example">
                      {previewTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB: ACCOUNT ── */}
            {activeTab === 'account' && (
              <div className="profile-tab-pane">
                <div className="profile-section-title">Seguridad</div>
                <div className="profile-action-row">
                  <div>
                    <h4>Contraseña</h4>
                    <p className="profile-desc">Actualiza tu contraseña para mantener tu cuenta segura.</p>
                  </div>
                  {!isChangingPassword ? (
                    <button className="btn btn-outline-light" onClick={() => setIsChangingPassword(true)}>Cambiar contraseña</button>
                  ) : (
                    <button className="btn btn-outline-light" onClick={() => setIsChangingPassword(false)}>Cancelar</button>
                  )}
                </div>

                {isChangingPassword && (
                  <form onSubmit={handleChangePassword} style={{ marginTop: '15px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input 
                        type="password" 
                        placeholder="Contraseña Actual" 
                        className="profile-input" 
                        required
                        value={passwordData.current}
                        onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                      />
                      <input 
                        type="password" 
                        placeholder="Nueva Contraseña" 
                        className="profile-input" 
                        required
                        value={passwordData.new}
                        onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                      />
                      <input 
                        type="password" 
                        placeholder="Confirmar Nueva Contraseña" 
                        className="profile-input" 
                        required
                        value={passwordData.confirm}
                        onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                      />
                      <button type="submit" className="btn btn-primary" disabled={isSubmittingPassword} style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                        {isSubmittingPassword ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="profile-section-title" style={{marginTop: '40px'}}>Aprendizaje</div>
                <div className="profile-action-row">
                  <div>
                    <h4>Tutorial Interactivo</h4>
                    <p className="profile-desc">Vuelve a ver el recorrido de bienvenida para aprender a usar WorkDesk.</p>
                  </div>
                  <button className="btn btn-outline-info" onClick={async () => {
                    try {
                      const prefs = { ...(user?.preferences || {}), tutorialCompleted: false }
                      await userAPI.updateProfile({ preferences: prefs })
                      const updatedUser = { ...user, preferences: prefs }
                      localStorage.setItem('workdesk_user', JSON.stringify(updatedUser))
                      window.location.href = '/' // Redirect to dashboard to trigger it
                    } catch (e) {
                      console.error(e)
                    }
                  }}>
                    Repetir Tutorial
                  </button>
                </div>

                <div className="profile-section-title" style={{marginTop: '40px'}}>Aplicación Móvil</div>
                <div className="profile-action-row" style={{ background: 'linear-gradient(135deg, rgba(0, 201, 255, 0.1) 0%, rgba(146, 254, 157, 0.1) 100%)', borderColor: 'rgba(0, 201, 255, 0.2)' }}>
                  <div>
                    <h4 style={{ color: '#92FE9D' }}>Descarga WorkDesk para Android</h4>
                    <p className="profile-desc">Lleva tus tareas y tu tiempo a donde quiera que vayas. Descarga el APK oficial para instalarlo en tu dispositivo móvil.</p>
                  </div>
                  <a 
                    href="/media/WorkDesk.apk" 
                    download 
                    className="btn" 
                    style={{ 
                      background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', 
                      color: '#000', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                    Descargar APK
                  </a>
                </div>

                <div className="profile-section-title" style={{marginTop: '40px'}}>Gestión de Datos</div>
                <div className="profile-action-row">
                  <div>
                    <h4>Exportar / Importar Datos</h4>
                    <p className="profile-desc">Descarga una copia local de tus tareas, pomodoros y configuración, o restaura un respaldo previo.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline-light" onClick={() => importInputRef.current?.click()} disabled={isImporting}>
                      {isImporting ? '⏳ Importando...' : 'Importar .json'}
                    </button>
                    <input type="file" ref={importInputRef} onChange={handleImportData} accept=".json" style={{display:'none'}} />
                    <button className="btn btn-success" onClick={handleExportData} disabled={isImporting || isResetting}>Exportar .json</button>
                  </div>
                </div>

                <div className="profile-action-row danger-zone">
                  <div>
                    <h4 style={{color: '#F87171'}}>Zona de Peligro</h4>
                    <p className="profile-desc">Devuelve tu perfil y escritorio a los valores de fábrica (sin fondo, sin foto de perfil, y los módulos volverán a estar vacíos). Esta acción no se puede deshacer.</p>
                  </div>
                  <button className="btn btn-danger" disabled={isResetting} onClick={async () => {
                    if (window.confirm('¿Estás seguro de que quieres borrar todo? Volverás a los valores por defecto de fábrica. Se perderán tus tareas y configuraciones.')) {
                      setIsResetting(true)
                      try {
                        // 1. Limpiar avatar y fondo en el backend
                        const prefs = { ...(user?.preferences || {}), defaultBackground: null }
                        await userAPI.updateProfile({ avatar: null, preferences: prefs })

                        // 2. Limpiar todo localmente
                        localStorage.removeItem('workdesk_wallpaper')
                        localStorage.removeItem('workdesk_modules')
                        localStorage.removeItem('workdesk_modules_updatedAt')
                        localStorage.removeItem('workdesk_modules_syncedAt')
                        
                        const userData = JSON.parse(localStorage.getItem('workdesk_user') || '{}')
                        userData.avatar = null
                        localStorage.setItem('workdesk_user', JSON.stringify(userData))

                        // 3. Borrar módulos en el backend
                        const { modulesAPI } = await import('../services/api')
                        await modulesAPI.saveAll([])

                        window.location.reload()
                      } catch (err) {
                        setIsResetting(false)
                        setError('Error al resetear el espacio en el servidor')
                      }
                    }
                  }}>
                    {isResetting ? '⏳ Reseteando...' : 'Resetear a Fábrica'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
