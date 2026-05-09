import React, { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ToolHub from './pages/ToolHub'

export default function App() {
  // Synchronous session check - no loading spinner needed
  const hasSession = () => {
    const token = localStorage.getItem('workdesk_token')
    const user = localStorage.getItem('workdesk_user')
    return !!(token && user)
  }

  const [view, setView] = useState(hasSession() ? 'dashboard' : 'login')

  const handleLogout = () => {
    // Clear all auth and user-specific data
    localStorage.removeItem('workdesk_token')
    localStorage.removeItem('workdesk_user')
    localStorage.removeItem('workdesk_last_login')
    localStorage.removeItem('workdesk_modules')
    localStorage.removeItem('workdesk_wallpaper')
    localStorage.removeItem('workdesk_modules_updatedAt')
    localStorage.removeItem('workdesk_modules_syncedAt')
    // Nota: 'workdesk_login_bg' NO se borra para que se mantenga el fondo local en la pantalla de inicio
    setView('login')
  }

  if (view === 'login') return <Login onSwitchToRegister={() => setView('register')} onAuthSuccess={() => setView('dashboard')} />
  if (view === 'register') return <Register onCancel={() => setView('login')} onRegisterSuccess={() => setView('dashboard')} />
  if (view === 'profile') return <Profile onBack={() => setView('dashboard')} onLogout={handleLogout} />
  if (view === 'toolhub') return <ToolHub onBack={() => setView('dashboard')} />
  return <Dashboard onLogout={handleLogout} onGoToProfile={() => setView('profile')} onGoToToolHub={() => setView('toolhub')} />
}
