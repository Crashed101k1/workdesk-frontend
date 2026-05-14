import React, { useState, useEffect, useRef } from 'react'
import '../styles/login.css'
import { authAPI } from '../services/api'

export default function Login({ onSwitchToRegister, onAuthSuccess }) {
  const defaultBg = '/media/FondoWorkDesk.png'
  const [bg, setBg] = useState(defaultBg)
  const fileRef = useRef(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('workdesk_login_bg')
    if (stored) setBg(stored)
  }, [])

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      localStorage.setItem('workdesk_login_bg', reader.result)
      setBg(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const triggerFile = () => fileRef.current && fileRef.current.click()
  const removeBg = () => { localStorage.removeItem('workdesk_login_bg'); setBg(defaultBg) }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('¡Bienvenido! Iniciando sesión...')

  // Auth Views: 'login', 'forgot', 'reset'
  const [view, setView] = useState('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const email = e.target.email.value
    const password = e.target.password.value

    try {
      const response = await authAPI.login(email, password)
      
      localStorage.setItem('workdesk_token', response.data.token)
      localStorage.setItem('workdesk_user', JSON.stringify(response.data.user))
      localStorage.setItem('workdesk_last_login', new Date().toISOString())

      const prefs = response.data.user.preferences || {}
      if (prefs.defaultBackground) {
        localStorage.setItem('workdesk_wallpaper', prefs.defaultBackground)
      } else {
        localStorage.removeItem('workdesk_wallpaper')
      }

      setSuccessMsg('¡Bienvenido! Iniciando sesión...')
      setSuccess(true)
      
      setTimeout(() => {
        if (typeof onAuthSuccess === 'function') {
          onAuthSuccess()
        }
      }, 600)
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authAPI.forgotPassword(resetEmail)
      setSuccessMsg('Si el correo existe, hemos enviado un código.')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setView('reset')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Error al procesar solicitud')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) return setError('Las contraseñas no coinciden')
    if (newPassword.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    
    setLoading(true)
    setError('')
    try {
      await authAPI.resetPassword(resetEmail, resetCode, newPassword)
      setSuccessMsg('Contraseña restablecida con éxito')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setView('login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Error al restablecer contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-left" style={{ backgroundImage: bg ? `url(${bg})` : undefined }}>

        <div className="upload-controls">
          <button type="button" className="btn btn-light btn-sm" onClick={triggerFile} title="Cambiar imagen">✎</button>
          {bg !== defaultBg && <button type="button" className="btn btn-danger btn-sm ms-2" onClick={removeBg} title="Eliminar imagen">✕</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="logo">
            <img src="/media/Logo_WorkDesk-removebg-preview.png" alt="WorkDesk" className="logo-img" />
          </div>

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success mt-3" role="alert" style={{ 
              background: 'rgba(54, 231, 168, 0.15)', border: '1px solid rgba(54, 231, 168, 0.3)',
              color: '#36e7a8', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="mb-3 text-start">
                <label className="form-label text-white">Correo electrónico:</label>
                <input name="email" type="email" className="form-control password-input" placeholder="Ingrese su correo" required />
              </div>
              <div className="mb-4 text-start">
                <label className="form-label text-white">Contraseña:</label>
                <div className="input-group">
                <input name="password" type={showPassword ? 'text' : 'password'} className="form-control password-input" placeholder="Ingrese su contraseña" />
                <button type="button" className="btn btn-outline-secondary eye-btn" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                      <path d="M17.94 17.94A10.94 10.94 0 0112 19c-4.478 0-8.27-2.944-9.544-7a9.957 9.957 0 012.431-3.494" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-primary w-100" disabled={loading || success}>
              {loading ? 'Iniciando sesión...' : success ? '¡Éxito!' : 'Iniciar sesión'}
            </button>
            </div>

            <div className="links">
              <a href="#" className="link-light" onClick={(e) => { e.preventDefault(); setView('forgot'); setError(''); setSuccess(false); }}>¿Olvidaste tu contraseña?</a>
              <a href="#" className="link-light" onClick={(e) => { e.preventDefault(); onSwitchToRegister && onSwitchToRegister(); }}>Regístrate</a>
            </div>
          </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="mt-4">
              <p className="text-white mb-3" style={{ fontSize: '14px', color: '#cbd5e1' }}>
                Ingresa tu correo y te enviaremos un código de seguridad.
              </p>
              <div className="mb-4 text-start">
                <label className="form-label text-white">Correo electrónico:</label>
                <input 
                  type="email" 
                  className="form-control password-input" 
                  placeholder="ejemplo@correo.com" 
                  required 
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
              </div>
              <div className="d-grid mb-3">
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Código'}
                </button>
              </div>
              <div className="links">
                <a href="#" className="link-light" onClick={(e) => { e.preventDefault(); setView('login'); setError(''); }}>Volver al Login</a>
              </div>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetSubmit} className="mt-4">
              <p className="text-white mb-3" style={{ fontSize: '14px', color: '#cbd5e1' }}>
                Ingresa el código que enviamos a <strong>{resetEmail}</strong>
              </p>
              <div className="mb-3 text-start">
                <label className="form-label text-white">Código de 6 dígitos:</label>
                <input 
                  type="text" 
                  className="form-control password-input" 
                  placeholder="Ej: 123456" 
                  required 
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                  style={{ letterSpacing: '5px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}
                />
              </div>
              <div className="mb-3 text-start">
                <label className="form-label text-white">Nueva contraseña:</label>
                <input 
                  type="password" 
                  className="form-control password-input" 
                  placeholder="Mínimo 6 caracteres" 
                  required 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div className="mb-4 text-start">
                <label className="form-label text-white">Confirmar contraseña:</label>
                <input 
                  type="password" 
                  className="form-control password-input" 
                  placeholder="Repita su contraseña" 
                  required 
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <div className="d-grid mb-3">
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </button>
              </div>
              <div className="links">
                <a href="#" className="link-light" onClick={(e) => { e.preventDefault(); setView('login'); setError(''); }}>Volver al Login</a>
              </div>
            </form>
          )}

          {/* Download Mobile App Button */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-white mb-2" style={{ fontSize: '12px', opacity: 0.8 }}>¿Quieres completmentar tu experiencia con WorkDesk?</p>
            <a 
              href="/media/WorkDesk.apk" 
              download 
              className="btn w-100" 
              style={{ 
                background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', 
                color: '#000', 
                fontWeight: 'bold', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              Descargar App Android
            </a>
          </div>

          <div className="credit">Powered By: Crasehd101k</div>
        </div>
      </div>
    </div>
  )
}
