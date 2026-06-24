'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, AlertCircle, Sparkles, ArrowRight, Laptop, Smartphone } from 'lucide-react'
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

  // Device limit state
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [showDeviceSelection, setShowDeviceSelection] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

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

  const parseDevice = (uaString: string) => {
    const ua = uaString.toLowerCase()
    let os = 'Unknown System'
    let browser = 'Unknown Browser'
    let isMobile = false

    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS'
    else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = ua.includes('iphone') ? 'iPhone' : 'iPad'
      isMobile = true
    } else if (ua.includes('android')) {
      os = 'Android'
      isMobile = true
    } else if (ua.includes('linux')) os = 'Linux'

    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('edge')) browser = 'Edge'

    return { os, browser, isMobile }
  }

  const handleSubmit = async (e?: React.FormEvent, forceSessionId?: string) => {
    if (e) e.preventDefault()
    setError(null)
    setValidationErrors({})

    const errors: Record<string, string> = {}
    if (!email) errors.email = 'Email is required'
    if (!password) errors.password = 'Password is required'
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setLoading(true)
      const payload: any = { email, password }
      if (forceSessionId) {
        payload.sessionIdToRevoke = forceSessionId
      }

      const data = await api.post('/api/auth/login', payload)
      if (data.success && data.token && data.user) {
        login(data.token, data.user as User)
        const target = redirect || (data.user.role === 'admin' ? '/admin' : '/dashboard')
        router.replace(target)
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      if (err.code === 'DEVICE_LIMIT_REACHED') {
        setActiveSessions(err.sessions || [])
        setShowDeviceSelection(true)
        setSelectedSessionId(err.sessions?.[0]?.id || null)
        setError(null)
      } else {
        setError(err.message || 'Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (role: 'student' | 'admin') => {
    const demoEmail = role === 'student' ? 'student@veolms.com' : 'admin@veolms.com'
    const demoPassword = role === 'student' ? 'Student@123' : 'Admin@123'
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
    setValidationErrors({})

    try {
      setLoading(true)
      const data = await api.post('/api/auth/login', { email: demoEmail, password: demoPassword })
      if (data.success && data.token && data.user) {
        login(data.token, data.user as User)
        const target = redirect || (data.user.role === 'admin' ? '/admin' : '/dashboard')
        router.replace(target)
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      if (err.code === 'DEVICE_LIMIT_REACHED') {
        setActiveSessions(err.sessions || [])
        setShowDeviceSelection(true)
        setSelectedSessionId(err.sessions?.[0]?.id || null)
        setError(null)
      } else {
        setError(err.message || 'Invalid credentials or database server offline.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center md:text-left mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
          <img src="/favicon.svg" alt="VeoLMS Logo" className="w-9 h-9 object-contain" />
          <span className="text-lg font-bold tracking-tight text-primary">VeoLMS Workspace</span>
        </Link>
        <h2 className="text-2xl font-bold text-primary tracking-tight">
          {showDeviceSelection ? 'Device limit reached.' : 'Welcome back.'}
        </h2>
        <p className="text-body text-xs mt-1">
          {showDeviceSelection 
            ? 'Select an active device session to terminate so you can log in.' 
            : 'Enter your details below to access your learning portal.'}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {showDeviceSelection ? (
        <div className="space-y-5 animate-fade-in">
          <div className="grid gap-3">
            {activeSessions.map((session) => {
              const device = parseDevice(session.deviceInfo)
              const isSelected = selectedSessionId === session.id
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`flex items-center justify-between p-4 bg-white border rounded-xl cursor-pointer transition-all hover:bg-zinc-50/30 ${
                    isSelected 
                      ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-sm' 
                      : 'border-zinc-150 hover:border-zinc-250'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected 
                        ? 'bg-zinc-950 border-zinc-950 text-white' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-500'
                    }`}>
                      {device.isMobile ? <Smartphone className="w-4.5 h-4.5" /> : <Laptop className="w-4.5 h-4.5" />}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-bold text-zinc-800 text-xs sm:text-sm truncate block">
                        {device.browser} on {device.os}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium font-mono">
                        <span>{session.ipAddress}</span>
                        <span>•</span>
                        <span>Active {new Date(session.lastActive).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-center pr-1">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'border-zinc-900 bg-zinc-950 text-white' 
                        : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeviceSelection(false)
                setSelectedSessionId(null)
                setActiveSessions([])
                setError(null)
              }}
              disabled={loading}
              className="flex-1 justify-center bg-white border-zinc-200 h-11 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={loading}
              disabled={!selectedSessionId}
              onClick={() => handleSubmit(undefined, selectedSessionId!)}
              className="flex-1 justify-center bg-primary hover:bg-primary/95 text-white h-11 text-xs rounded-xl"
            >
              Disconnect & Log In
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            name="email"
            placeholder="student@veolms.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={validationErrors.email}
            leftIcon={<Mail className="w-4 h-4 text-mute" />}
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
            leftIcon={<Lock className="w-4 h-4 text-mute" />}
            autoComplete="current-password"
            required
          />

          <div className="text-right">
            <span className="text-xs text-mute hover:text-primary font-medium cursor-pointer transition-colors">
              Forgot password?
            </span>
          </div>

          <Button type="submit" loading={loading} className="w-full justify-center h-11 text-xs">
            Log in
          </Button>
        </form>
      )}

      {/* Quick Login Buttons (Review Mode helper block) */}
      <div className="pt-4 border-t border-hairline space-y-3 bg-canvas-soft-2/50 rounded-xl p-4 border">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-mute font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick access controls.</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickLogin('student')}
            disabled={loading}
            className="text-[11px] justify-center bg-white"
          >
            Student Login
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickLogin('admin')}
            disabled={loading}
            className="text-[11px] justify-center bg-white"
          >
            Admin Console
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-mute">
        Don't have an account?{' '}
        <Link
          href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
          className="text-primary hover:underline font-bold transition-all"
        >
          Sign up free
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Column: Stark atmosphere panel (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 vercel-mesh-gradient border-r border-zinc-800 text-white flex-col justify-between p-12 relative overflow-hidden select-none">
        <div className="flex items-center gap-2.5 z-10">
          <img src="/favicon.svg" alt="VeoLMS Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold tracking-tight text-sm">VeoLMS Cloud</span>
        </div>

        <div className="space-y-4 z-10 max-w-lg">
          <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Platform Services
          </span>
          <h1 className="text-4xl font-semibold tracking-[-1.5px] leading-tight text-zinc-100">
            Learn anything.<br />Build everything.
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The stark, high-fidelity developer learning experience. Build modular apps, stream presigned lesson video components, and manage transactions seamlessly.
          </p>
        </div>

        {/* Small bottom footer credentials */}
        <div className="z-10 flex items-center justify-between text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
          <span>VeoLMS Console v2.0</span>
          <span>© 2026 VeoLMS</span>
        </div>
      </div>

      {/* Right Column: Authentication Card Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <Suspense
          fallback={
            <div className="w-full max-w-md p-8 animate-pulse space-y-6">
              <div className="h-6 bg-canvas-soft-2 rounded w-1/3 mx-auto" />
              <div className="h-10 bg-canvas-soft-2 rounded w-full" />
              <div className="h-10 bg-canvas-soft-2 rounded w-full" />
              <div className="h-10 bg-canvas-soft-2 rounded w-full" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
