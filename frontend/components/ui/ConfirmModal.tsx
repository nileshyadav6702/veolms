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
      <Card className="w-full max-w-md bg-white border border-hairline shadow-2xl overflow-hidden rounded-2xl relative z-10" padding="none">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isDestructive 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="ml-auto text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-lg hover:bg-canvas-soft-2 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="bg-white text-xs px-4"
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
