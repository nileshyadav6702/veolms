'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'
import Card from './Card'

interface ConfirmModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirmation Required',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-md bg-[var(--ds-card-bg)] border border-[var(--ds-hairline)] shadow-2xl overflow-hidden rounded-2xl relative z-10" padding="none">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isDestructive 
                ? 'bg-[var(--ds-error-soft)] text-red-500 border-red-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--ds-ink)] text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-[var(--ds-body)] text-xs leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="ml-auto text-[var(--ds-mute)] hover:text-[var(--ds-ink)] transition-colors p-1 rounded-lg hover:bg-[var(--ds-canvas-soft-2)] shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--ds-hairline)]">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="bg-[var(--ds-canvas)] text-xs px-4"
            >
              {cancelText}
            </Button>
            <Button
              variant={isDestructive ? 'primary' : 'secondary'}
              size="sm"
              loading={loading}
              onClick={onConfirm}
              className={`text-xs px-5 ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 text-white border-none' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
