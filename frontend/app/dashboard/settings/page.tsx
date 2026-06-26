'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import {
  User as UserIcon,
  Shield,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

interface Session {
  _id: string
  deviceInfo: string
  ipAddress: string
  lastActive: string
  createdAt: string
}

export default function AccountSettingsPage() {
  const { user, token, logout } = useAuth()
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  
  // AI Settings State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini')
  const [aiModel, setAiModel] = useState('gemini-1.5-flash')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiHasKey, setAiHasKey] = useState(false)
  const [showKeyText, setShowKeyText] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true)

  // Status banners / toasts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Decode sessionId from JWT
  let currentSessionId = ''
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      currentSessionId = payload.sessionId
    } catch (err) {
      console.error('Failed to extract sessionId from token:', err)
    }
  }

  // Fetch AI credentials and active sessions
  const loadSettingsData = async () => {
    try {
      setSessionsLoading(true)
      setAiSettingsLoading(true)

      const meData = await api.get('/api/auth/me')
      if (meData.success && meData.user) {
        const u = meData.user
        setAiProvider(u.aiSettings?.provider || 'gemini')
        setAiModel(u.aiSettings?.model || 'gemini-1.5-flash')
        setAiHasKey(u.aiSettings?.hasKey || false)
      }

      const sessionsData = await api.get('/api/auth/sessions')
      if (sessionsData.success) {
        setActiveSessions(sessionsData.sessions || [])
      }
    } catch (err) {
      console.error('Failed to load profile data:', err)
    } finally {
      setSessionsLoading(false)
      setAiSettingsLoading(false)
    }
  }

  useEffect(() => {
    loadSettingsData()
  }, [])

  // Save AI Settings
  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAi(true)
    setStatusMsg(null)

    try {
      const data = await api.put('/api/auth/ai-settings', {
        provider: aiProvider,
        model: aiModel,
        apiKey: aiApiKey || undefined
      })
      if (data.success) {
        setAiHasKey(data.user?.aiSettings?.hasKey || false)
        setAiApiKey('')
        setStatusMsg({ type: 'success', text: 'AI Settings saved successfully!' })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update AI Settings.' })
    } finally {
      setSavingAi(false)
    }
  }

  // Clear AI Key
  const handleClearAiKey = async () => {
    if (!confirm('Clear your custom API key and revert to platform default key?')) return
    setSavingAi(true)
    setStatusMsg(null)

    try {
      const data = await api.put('/api/auth/ai-settings', {
        provider: aiProvider,
        model: aiModel,
        apiKey: ''
      })
      if (data.success) {
        setAiHasKey(false)
        setAiApiKey('')
        setStatusMsg({ type: 'success', text: 'Custom key cleared successfully!' })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to clear key.' })
    } finally {
      setSavingAi(false)
    }
  }

  // Revoke session handler
  const handleRevokeSession = async (sessionId: string) => {
    const isCurrent = sessionId === currentSessionId
    const confirmMsg = isCurrent 
      ? 'WARNING: You are terminating your current session on this device. You will be logged out immediately. Proceed?'
      : 'Are you sure you want to terminate this session? The device will be logged out.'

    if (!confirm(confirmMsg)) return

    try {
      await api.del(`/api/auth/sessions/${sessionId}`)
      if (isCurrent) {
        logout()
      } else {
        setActiveSessions(prev => prev.filter(s => s._id !== sessionId))
        setStatusMsg({ type: 'success', text: 'Session terminated successfully.' })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to terminate session.' })
    }
  }

  // Help select default models when provider switches
  const handleProviderChange = (prov: 'gemini' | 'openai') => {
    setAiProvider(prov)
    setAiModel(prov === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini')
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 no-scrollbar overflow-y-auto h-full">
      
      {/* Settings Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink tracking-tight leading-snug">Account Settings</h1>
        <p className="text-xs text-mute leading-relaxed">
          Manage your personal details, AI learning credentials, and active login sessions.
        </p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border animate-fade-in ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <div className="text-xs font-semibold">{statusMsg.text}</div>
        </div>
      )}

      {/* ── Section 1: Personal Details ── */}
      <section className="bg-white border border-hairline rounded-lg overflow-hidden vercel-card-shadow">
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-2 bg-canvas-soft">
          <UserIcon className="w-4 h-4 text-ink" />
          <h2 className="text-xs font-bold text-ink tracking-tight">Personal Details</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">Full Name</span>
            <div className="text-xs font-medium text-ink bg-canvas-soft-2 px-3 py-2.5 rounded-[6px] border border-hairline">
              {user?.name}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">Email Address</span>
            <div className="text-xs font-medium text-ink bg-canvas-soft-2 px-3 py-2.5 rounded-[6px] border border-hairline">
              {user?.email}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">System Role</span>
            <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-2.5 rounded-[6px] border border-indigo-100 uppercase tracking-widest inline-block">
              {user?.role} Portal
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: AI Tutor Credentials (BYOK) ── */}
      <section className="bg-white border border-hairline rounded-lg overflow-hidden vercel-card-shadow">
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-2 bg-canvas-soft">
          <Key className="w-4 h-4 text-ink" />
          <h2 className="text-xs font-bold text-ink tracking-tight">AI Credentials</h2>
        </div>
        
        {aiSettingsLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2">
            <Spinner className="w-5 h-5 text-primary animate-spin" />
            <p className="text-[10px] text-mute font-mono uppercase tracking-wider">Syncing credentials...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveAiSettings} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">
                  AI Model Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => handleProviderChange(e.target.value as 'gemini' | 'openai')}
                  className="w-full text-xs border border-hairline rounded-[6px] p-2.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all duration-200"
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="openai">OpenAI GPT</option>
                </select>
              </div>

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">
                  Active Model
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full text-xs border border-hairline rounded-[6px] p-2.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all duration-200"
                >
                  {aiProvider === 'gemini' ? (
                    <>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                      <option value="gpt-4o">GPT-4o Pro</option>
                    </>
                  )}
                </select>
              </div>

            </div>

            {/* Custom API Key input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-mute uppercase tracking-wider block">
                Custom API Key (BYOK)
              </label>
              <div className="relative">
                <input
                  type={showKeyText ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiHasKey ? "••••••••••••••••••••••••••••" : `Paste your custom ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key`}
                  className="w-full text-xs border border-hairline rounded-[6px] p-2.5 pr-10 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-2.5 top-3 text-mute hover:text-ink cursor-pointer border-0 bg-transparent"
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[9.5px] text-mute leading-relaxed pt-1">
                By default, VeoLMS uses platform-configured keys (rate-limited per day). Entering your own personal API key bypasses platform limits entirely and securely calls the models directly.
              </p>
            </div>

            {/* Action CTAs */}
            <div className="flex gap-2 justify-end pt-2 border-t border-hairline">
              {aiHasKey && (
                <button
                  type="button"
                  onClick={handleClearAiKey}
                  disabled={savingAi}
                  className="text-xs font-semibold py-2 px-4 border border-red-200 text-red-650 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                >
                  Clear Key
                </button>
              )}
              <Button
                type="submit"
                disabled={savingAi}
                className="text-xs font-semibold py-2 px-5 bg-primary hover:bg-zinc-800 text-white rounded-full cursor-pointer border-0 disabled:opacity-50"
              >
                {savingAi ? 'Saving...' : 'Save AI Credentials'}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* ── Section 3: Active Sessions Management ── */}
      <section className="bg-white border border-hairline rounded-lg overflow-hidden vercel-card-shadow">
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-2 bg-canvas-soft">
          <Smartphone className="w-4 h-4 text-ink" />
          <h2 className="text-xs font-bold text-ink tracking-tight">Active Sessions ({activeSessions.length})</h2>
        </div>
        
        {sessionsLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2">
            <Spinner className="w-5 h-5 text-primary animate-spin" />
            <p className="text-[10px] text-mute font-mono uppercase tracking-wider">Loading active sessions...</p>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-mute italic">
            No active session records found.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {activeSessions.map((session) => {
              const isCurrent = session._id === currentSessionId
              return (
                <div key={session._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-ink truncate max-w-[280px]">
                        {session.deviceInfo}
                      </span>
                      {isCurrent ? (
                        <span className="text-[8px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                          THIS DEVICE
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold font-mono text-zinc-550 bg-zinc-150/70 border border-zinc-200 rounded px-1.5 py-0.5">
                          CONCURRENT
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-mute font-mono flex-wrap">
                      <span>IP: {session.ipAddress}</span>
                      <span>•</span>
                      <span>Last Active: {new Date(session.lastActive).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeSession(session._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border hover:bg-red-50 hover:text-red-700 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      isCurrent 
                        ? 'border-hairline text-mute'
                        : 'border-red-100 text-red-600'
                    }`}
                    title={isCurrent ? "Log out this session" : "Revoke concurrent session"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isCurrent ? 'Log Out' : 'Revoke'}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
