'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, Operator } from './supabase'

type AuthContextType = {
  operator: Operator | null
  loading: boolean
  login: (operatorId: string, password: string) => Promise<{ error: string | null }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  operator: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('soc_operator')
    if (stored) {
      try {
        setOperator(JSON.parse(stored))
      } catch {
        localStorage.removeItem('soc_operator')
      }
    }
    setLoading(false)
  }, [])

  const login = async (operatorId: string, password: string) => {
    const expectedPassword = operatorId + 'SOC2024'

    if (password !== expectedPassword) {
      return { error: 'Invalid operator ID or password' }
    }

    console.log('Attempting Supabase query for:', operatorId)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('operator_id', operatorId)
      .single()

    console.log('Result data:', data)
    console.log('Result error:', JSON.stringify(error))

    if (error || !data) {
      return { error: 'Operator ID not found. Contact your team lead.' }
    }

    localStorage.setItem('soc_operator', JSON.stringify(data))
    setOperator(data)
    return { error: null }
  }

  const logout = () => {
    localStorage.removeItem('soc_operator')
    setOperator(null)
  }

  return (
    <AuthContext.Provider value={{ operator, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)