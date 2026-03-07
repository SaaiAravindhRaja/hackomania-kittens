import React, { createContext, useContext, useState, useCallback } from 'react'
import { getStoredUser, setStoredUser, clearStoredUser } from '@/lib/auth-session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const error = new Error(data.error || `Login failed (${res.status})`)
      error.status = res.status
      throw error
    }
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (username, email, password, country, postalcode, walletAddress) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, country, postalcode, walletAddress }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const error = new Error(data.error || `Registration failed (${res.status})`)
      error.status = res.status
      throw error
    }
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearStoredUser()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
