'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Button from '@/components/ui/Button'
import {
  BookOpen,
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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">VeoLMS</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo-700">
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 leading-none">
                      {user.name.split(' ')[0]}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-lg z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {user.role === 'student' && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-400" />
                          Dashboard
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Shield className="w-4 h-4 text-gray-400" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
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
                  <Button variant="primary" size="sm" pill>
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
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
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Log out
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="secondary" size="sm" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link href="/signup" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="primary" size="sm" pill className="w-full">
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
      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
        active
          ? 'text-indigo-600 font-medium bg-indigo-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
    >
      {children}
    </Link>
  )
}
