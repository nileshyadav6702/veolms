'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { api } from './api'

export interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('veolms_token')
      const storedUser = localStorage.getItem('veolms_user')
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as User)
      }
    } catch {
      // corrupted storage — clear it
      localStorage.removeItem('veolms_token')
      localStorage.removeItem('veolms_user')
    } finally {
      setLoading(false)
    }
  }, [])

  function login(token: string, user: User) {
    localStorage.setItem('veolms_token', token)
    localStorage.setItem('veolms_user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function logout() {
    if (localStorage.getItem('veolms_token')) {
      api.post('/api/auth/logout').catch((err) => {
        console.error('Failed to logout on server:', err)
      })
    }
    localStorage.removeItem('veolms_token')
    localStorage.removeItem('veolms_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
