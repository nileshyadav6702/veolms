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
    'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'

  const radius = pill ? 'rounded-full' : 'rounded-lg'

  const variants = {
    primary: 'bg-primary text-white border border-primary hover:bg-zinc-800 transition-colors shadow-sm',
    secondary: 'bg-white text-ink border border-hairline hover:bg-canvas-soft-2 transition-colors shadow-sm',
    outline: 'border border-primary text-primary hover:bg-canvas-soft-2 transition-colors',
    ghost: 'text-body hover:text-ink hover:bg-canvas-soft-2 transition-colors',
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
