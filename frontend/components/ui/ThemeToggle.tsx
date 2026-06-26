'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  compact?: boolean
}

export default function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render the toggle after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  // Render a placeholder of the same size during SSR / before hydration
  if (!mounted) {
    return (
      <div
        className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-full border border-transparent ${className}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative inline-flex items-center justify-center
        rounded-full border border-[var(--ds-hairline)]
        bg-[var(--ds-canvas)] hover:bg-[var(--ds-canvas-soft-2)]
        text-[var(--ds-mute)] hover:text-[var(--ds-ink)]
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ds-primary)]/20
        ${compact ? 'w-7 h-7' : 'w-8 h-8'}
        ${className}
      `}
    >
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'scale(0.5) rotate(90deg)' : 'scale(1) rotate(0deg)',
        }}
      >
        <Sun className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-90deg)',
        }}
      >
        <Moon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </span>
    </button>
  )
}
