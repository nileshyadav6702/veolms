'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Spinner from '@/components/ui/Spinner'

interface Props {
  children: React.ReactNode
  role?: 'student' | 'admin'
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (role && user.role !== role) {
      router.replace('/')
    }
  }, [user, loading, role, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!user) return null
  if (role && user.role !== role) return null

  return <>{children}</>
}
