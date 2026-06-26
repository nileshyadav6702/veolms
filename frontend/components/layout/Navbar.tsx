'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  Menu,
  X,
  LayoutDashboard,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  function handleLogout() {
    logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-[var(--ds-canvas)] border-b border-[var(--ds-hairline)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/favicon.svg" alt="VeoLMS Logo" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-[var(--ds-ink)]">VeoLMS</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1.5">
            <NavLink href="/courses" active={pathname.startsWith('/courses')}>
              Courses
            </NavLink>
            {user?.role === 'student' && (
              <NavLink href="/dashboard" active={pathname.startsWith('/dashboard')}>
                My Learning
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink href="/admin" active={pathname.startsWith('/admin')}>
                Admin
              </NavLink>
            )}
          </div>

          {/* Desktop auth + theme toggle */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle compact />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--ds-canvas-soft-2)] transition-colors border border-transparent hover:border-[var(--ds-hairline)]"
                >
                  <div className="w-7 h-7 bg-[var(--ds-canvas-soft-2)] border border-[var(--ds-hairline)] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[var(--ds-ink)]">
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-[var(--ds-ink)] leading-none">
                      {user.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-[var(--ds-mute)] capitalize mt-0.5">{user.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--ds-mute)]" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-[var(--ds-canvas)] rounded-xl border border-[var(--ds-hairline)] vercel-modal-shadow z-20 overflow-hidden animate-slide-in-down">
                      <div className="px-4 py-3 border-b border-[var(--ds-hairline)] bg-[var(--ds-canvas-soft)]">
                        <p className="text-xs font-bold text-[var(--ds-ink)]">{user.name}</p>
                        <p className="text-[11px] text-[var(--ds-mute)] truncate">{user.email}</p>
                      </div>
                      {user.role === 'student' && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--ds-body)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)] transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[var(--ds-mute)]" />
                          Dashboard
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--ds-body)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)] transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5 text-[var(--ds-mute)]" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-[var(--ds-error-soft)] border-t border-[var(--ds-hairline)] transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle compact />
            <button
              className="p-2 rounded-lg text-[var(--ds-body)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--ds-hairline)] bg-[var(--ds-canvas)] px-4 py-3 space-y-1 animate-slide-in-down">
          <MobileLink href="/courses" onClick={() => setMenuOpen(false)}>
            Courses
          </MobileLink>
          {user?.role === 'student' && (
            <MobileLink href="/dashboard" onClick={() => setMenuOpen(false)}>
              My Learning
            </MobileLink>
          )}
          {user?.role === 'admin' && (
            <MobileLink href="/admin" onClick={() => setMenuOpen(false)}>
              Admin
            </MobileLink>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-[var(--ds-error-soft)] rounded-lg font-medium border-t border-[var(--ds-hairline)] pt-3 mt-2 transition-colors"
            >
              Log out
            </button>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-[var(--ds-hairline)] mt-2">
              <Link href="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="secondary" size="sm" className="w-full justify-center">
                  Log in
                </Button>
              </Link>
              <Link href="/signup" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full justify-center">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
        active
          ? 'text-[var(--ds-ink)] font-semibold bg-[var(--ds-canvas-soft-2)]'
          : 'text-[var(--ds-body)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)]'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-[var(--ds-body)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-canvas-soft-2)] rounded-lg font-medium transition-colors"
    >
      {children}
    </Link>
  )
}
