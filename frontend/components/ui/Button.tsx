'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import Spinner from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
  pill?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  pill = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--ds-primary)]/20 focus:ring-offset-2 focus:ring-offset-[var(--ds-canvas)]'

  const radius = pill ? 'rounded-full' : 'rounded-lg'

  const variants = {
    primary:
      'bg-[var(--ds-primary)] text-[var(--ds-on-primary)] border border-[var(--ds-primary)] hover:opacity-90 transition-opacity shadow-sm',
    secondary:
      'bg-[var(--ds-canvas)] text-[var(--ds-ink)] border border-[var(--ds-hairline)] hover:bg-[var(--ds-canvas-soft-2)] transition-colors shadow-sm',
    outline:
      'border border-[var(--ds-primary)] text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)] transition-colors',
    ghost:
      'text-[var(--ds-body)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)] transition-colors',
    danger: 'bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm',
  }

  const sizes = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2',
  }

  return (
    <button
      className={`${base} ${radius} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  )
}
