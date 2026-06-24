'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Button from '@/components/ui/Button'
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
    <nav className="sticky top-0 z-50 bg-white border-b border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/favicon.svg" alt="VeoLMS Logo" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-primary">VeoLMS</span>
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

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-canvas-soft-2 transition-colors border border-transparent hover:border-hairline"
                >
                  <div className="w-7 h-7 bg-canvas-soft-2 border border-hairline rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-primary leading-none">
                      {user.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-mute capitalize mt-0.5">{user.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-mute" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-hairline vercel-modal-shadow z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-hairline bg-canvas-soft">
                        <p className="text-xs font-bold text-primary">{user.name}</p>
                        <p className="text-[11px] text-mute truncate">{user.email}</p>
                      </div>
                      {user.role === 'student' && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-body hover:text-primary hover:bg-canvas-soft-2 transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-mute" />
                          Dashboard
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-body hover:text-primary hover:bg-canvas-soft-2 transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5 text-mute" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-hairline"
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-body hover:text-ink hover:bg-canvas-soft-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-hairline bg-white px-4 py-3 space-y-1">
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
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium border-t border-hairline pt-3 mt-2"
            >
              Log out
            </button>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-hairline mt-2">
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
          ? 'text-primary font-semibold bg-canvas-soft-2'
          : 'text-body hover:text-ink hover:bg-canvas-soft-2'
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
      className="block px-3 py-2 text-sm text-body hover:text-ink hover:bg-canvas-soft-2 rounded-lg font-medium"
    >
      {children}
    </Link>
  )
}
