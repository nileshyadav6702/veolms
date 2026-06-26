'use client'

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--ds-ink)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--ds-mute)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={[
              'w-full h-11 border rounded-lg bg-[var(--ds-input-bg)] text-sm text-[var(--ds-ink)]',
              'placeholder:text-[var(--ds-mute)] transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[var(--ds-input-focus-border)]/30 focus:border-[var(--ds-input-focus-border)]',
              leftIcon ? 'pl-10' : 'pl-3',
              rightIcon ? 'pr-10' : 'pr-3',
              error
                ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400'
                : 'border-[var(--ds-input-border)] hover:border-[var(--ds-hairline-strong)]',
              className,
            ].join(' ')}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-3 flex items-center text-[var(--ds-mute)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
