// API Service for WorkDesk Backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Helper to get auth token
const getToken = () => localStorage.getItem('workdesk_token')

// Helper for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  // Add auth token if available
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Auth API
export const authAPI = {
  register: (name, email, password) => 
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),
  
  login: (email, password) => 
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  getMe: () => 
    apiCall('/auth/me', {
      method: 'GET'
    }),

  changePassword: (currentPassword, newPassword) =>
    apiCall('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  forgotPassword: (email) =>
    apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  resetPassword: (email, code, newPassword) =>
    apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    })
}

// Modules API
export const modulesAPI = {
  getAll: () => 
    apiCall('/modules'),
  
  getOne: (id) => 
    apiCall(`/modules/${id}`),
  
  create: (moduleData) => 
    apiCall('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData)
    }),
  
  update: (id, moduleData) => 
    apiCall(`/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData)
    }),
  
  delete: (id) =>
    apiCall(`/modules/${id}`, {
      method: 'DELETE'
    }),
  
  saveAll: (modules) =>
    apiCall('/modules/save-all', {
      method: 'POST',
      body: JSON.stringify({ modules })
    })
}

// User API
export const userAPI = {
  getProfile: () => 
    apiCall('/user/profile'),
  
  updateProfile: (profileData) => 
    apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
  
  getStats: () => 
    apiCall('/user/stats'),

  sendFeedback: (type, message) =>
    apiCall('/user/feedback', {
      method: 'POST',
      body: JSON.stringify({ type, message })
    })
}

// Music API
export const musicAPI = {
  search: (query) => 
    apiCall(`/music/search?q=${encodeURIComponent(query)}`)
}

export default { authAPI, modulesAPI, userAPI, musicAPI }
