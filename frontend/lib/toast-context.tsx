'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message, duration }])
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  const success = useCallback((msg: string, dur?: number) => toast('success', msg, dur), [toast])
  const error = useCallback((msg: string, dur?: number) => toast('error', msg, dur), [toast])
  const warning = useCallback((msg: string, dur?: number) => toast('warning', msg, dur), [toast])
  const info = useCallback((msg: string, dur?: number) => toast('info', msg, dur), [toast])

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
  }

  const borderColors = {
    success: 'border-emerald-500/20 bg-[var(--ds-canvas)]/95 text-emerald-500 shadow-emerald-500/10',
    error: 'border-red-500/20 bg-[var(--ds-canvas)]/95 text-red-500 shadow-red-500/10',
    warning: 'border-amber-500/20 bg-[var(--ds-canvas)]/95 text-amber-500 shadow-amber-500/10',
    info: 'border-blue-500/20 bg-[var(--ds-canvas)]/95 text-blue-500 shadow-blue-500/10',
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto backdrop-blur-md transition-all duration-300 animate-slide-in-right ${borderColors[t.type]}`}
          >
            {icons[t.type]}
            <div className="flex-1 text-xs font-bold leading-normal text-[var(--ds-ink)]">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[var(--ds-mute)] hover:text-[var(--ds-ink)] transition-colors p-0.5 rounded cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
