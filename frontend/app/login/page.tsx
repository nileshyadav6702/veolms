'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, BookOpen, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useAuth, User } from '@/lib/auth-context'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? ''

  const { login, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // If already logged in, redirect to target or dashboard
  useEffect(() => {
    if (user) {
      if (redirect) {
        router.replace(redirect)
      } else {
        router.replace(user.role === 'admin' ? '/admin' : '/dashboard')
      }
    }
  }, [user, redirect, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    // Simple validation
    const errors: Record<string, string> = {}
    if (!email) errors.email = 'Email is required'
    if (!password) errors.password = 'Password is required'
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setLoading(true)
      const data = await api.post('/api/auth/login', { email, password })
      if (data.success && data.token && data.user) {
        login(data.token, data.user as User)
        const target = redirect || (data.user.role === 'admin' ? '/admin' : '/dashboard')
        router.replace(target)
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl" padding="lg">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">VeoLMS</span>
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
        <p className="text-gray-500 text-xs mt-1">
          Enter your details below to access your learning account
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={validationErrors.email}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={validationErrors.password}
          leftIcon={<Lock className="w-4 h-4" />}
          autoComplete="current-password"
          required
        />

        <div className="text-right">
          <span className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer">
            Forgot password?
          </span>
        </div>

        <Button type="submit" loading={loading} className="w-full justify-center mt-2">
          Log in
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-gray-500">
        Don't have an account?{' '}
        <Link
          href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
          className="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Sign up free
        </Link>
      </div>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
        <div className="w-[500px] h-[500px] bg-gradient-to-br from-indigo-100/30 to-purple-100/30 rounded-full blur-3xl opacity-80" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Suspense
          fallback={
            <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
                <div className="h-10 bg-gray-200 rounded w-full" />
                <div className="h-10 bg-gray-200 rounded w-full" />
                <div className="h-10 bg-gray-200 rounded w-full" />
              </div>
            </Card>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
