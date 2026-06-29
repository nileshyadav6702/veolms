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

  // Track elapsed loading time to show user progress during Render cold starts
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let interval: any
    if (loading) {
      setElapsed(0)
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loading])

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
    <div className="w-full max-w-md space-y-6 relative">
      {/* Premium Loading Overlay for Render cold starts */}
      {loading && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in rounded-2xl">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-zinc-950/5 animate-ping opacity-75" />
            <div className="relative w-14 h-14 rounded-full border-2 border-zinc-100 border-t-zinc-950 animate-spin flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-zinc-950 animate-pulse absolute" />
            </div>
          </div>
          
          <h3 className="font-bold text-zinc-900 text-sm tracking-tight mb-2">Connecting to Services</h3>
          <p className="text-zinc-500 text-xs max-w-xs leading-relaxed mb-4">
            Our backend API is hosted on Render's free tier. If the server is cold, booting it can take up to <strong>50 seconds</strong>.
          </p>
          
          <div className="flex flex-col items-center gap-2 w-full max-w-[240px] mt-2">
            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zinc-950 transition-all duration-1000" 
                style={{ width: `${Math.min((elapsed / 50) * 100, 100)}%` }} 
              />
            </div>
            <div className="flex justify-between w-full text-[10px] font-mono text-zinc-400 font-semibold">
              <span>Warming up server</span>
              <span>{elapsed}s / 50s</span>
            </div>
          </div>
        </div>
      )}

      <div className={loading ? 'opacity-20 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
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
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2.5 text-xs text-red-600 mb-4">
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
        <div className="pt-4 border-t border-hairline space-y-3 bg-canvas-soft-2/50 rounded-xl p-4 border mt-6">
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

        <div className="text-center text-xs text-mute mt-6">
          Don't have an account?{' '}
          <Link
            href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
            className="text-primary hover:underline font-bold transition-all"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Render free-tier cold-start warning banner */}
      <div className="w-full bg-amber-50/95 border-b border-amber-200/50 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-center gap-2.5 font-medium relative z-50 shadow-sm animate-slide-in-down">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-center">
          💡 <strong>Notice:</strong> This platform is deployed on Render's free tier. The backend API may take up to <strong>50 seconds</strong> to respond initially while booting from standby.
        </span>
      </div>

      <div className="flex-1 flex">
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
    </div>
  )
}
