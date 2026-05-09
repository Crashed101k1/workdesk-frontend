import React, { useState, useEffect } from 'react'
import '../styles/login.css'
import { authAPI } from '../services/api'

export default function Register({ onCancel, onRegisterSuccess }) {
  const [bg, setBg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPassword2, setShowPassword2] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('workdesk_login_bg')
    if (stored) setBg(stored)
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const name = e.target.name.value
    const email = e.target.email.value
    const pwd = e.target.password.value
    const pwd2 = e.target.password2.value

    if (pwd !== pwd2) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Por favor ingresa un correo electrónico válido')
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.register(name.trim(), email.trim().toLowerCase(), pwd)
      
      // Guardar token y datos de usuario
      localStorage.setItem('workdesk_token', response.data.token)
      localStorage.setItem('workdesk_user', JSON.stringify(response.data.user))
      localStorage.setItem('workdesk_last_login', new Date().toISOString())

      // Limpiar/Setear preferencias
      const prefs = response.data.user.preferences || {}
      if (prefs.defaultBackground) {
        localStorage.setItem('workdesk_wallpaper', prefs.defaultBackground)
      } else {
        localStorage.removeItem('workdesk_wallpaper')
      }

      console.log('Registro exitoso:', response.data.user)
      
      // Mostrar mensaje de éxito antes de redirigir
      setSuccess(true)
      
      // Esperar 600ms para que el usuario vea el mensaje (rápido pero visible)
      setTimeout(() => {
        if (typeof onRegisterSuccess === 'function') {
          onRegisterSuccess()
        }
      }, 600)
    } catch (err) {
      setError(err.message || 'Error al registrar usuario')
      console.error('Register error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-left" style={{ backgroundImage: bg ? `url(${bg})` : undefined }} />
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
              background: 'rgba(54, 231, 168, 0.15)', 
              border: '1px solid rgba(54, 231, 168, 0.3)',
              color: '#36e7a8',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>¡Cuenta creada! Redirigiendo...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="mb-3 text-start">
              <label className="form-label text-white">Nombre o seudónimo</label>
              <input name="name" className="form-control password-input" placeholder="Ej: Juan el Programador" />
            </div>
            <div className="mb-3 text-start">
              <label className="form-label text-white">Correo electrónico</label>
              <input name="email" type="email" className="form-control password-input" placeholder="Ej: correo@ejemplo.com" />
            </div>
            <div className="mb-3 text-start">
              <label className="form-label text-white">Contraseña:</label>
              <div className="input-group">
                <input name="password" type={showPassword ? 'text' : 'password'} className="form-control password-input" placeholder="Ingrese una contraseña" />
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
            <div className="mb-3 text-start">
              <label className="form-label text-white">Repita su contraseña:</label>
              <div className="input-group">
                <input name="password2" type={showPassword2 ? 'text' : 'password'} className="form-control password-input" placeholder="Ingrese de nuevo la contraseña" />
                <button type="button" className="btn btn-outline-secondary eye-btn" onClick={() => setShowPassword2(s => !s)} aria-label={showPassword2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword2 ? (
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

            <div className="d-grid gap-3 mt-4">
              <button type="submit" className="btn btn-primary w-100" disabled={loading || success}>
                {loading ? 'Registrando...' : success ? '¡Éxito!' : 'Crear cuenta'}
              </button>
              <button type="button" className="btn btn-outline-secondary w-100 cancel-btn" onClick={onCancel} disabled={loading || success}>
                Volver a Iniciar Sesión
              </button>
            </div>
          </form>

          <div className="credit">Powered By: Crasehd101k</div>
        </div>
      </div>
    </div>
  )
}
