'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapse state on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed')
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  // Listen to external requests to collapse/expand layout sidebar
  useEffect(() => {
    const handleCollapseEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail === 'boolean') {
        setIsCollapsed(detail)
      }
    }
    window.addEventListener('set-admin-sidebar-collapse', handleCollapseEvent)
    return () => {
      window.removeEventListener('set-admin-sidebar-collapse', handleCollapseEvent)
    }
  }, [])

  const handleToggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('admin_sidebar_collapsed', String(nextState))
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Course Catalog', href: '/admin/courses', icon: BookOpen },
    { label: 'Student Registry', href: '/admin/students', icon: Users },
    { label: 'Enrollment Ledger', href: '/admin/enrollments', icon: CreditCard },
  ]

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  return (
    <ProtectedRoute role="admin">
      <div className="min-h-screen flex bg-canvas-soft">
        {/* Mobile Navbar Header */}
        <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-hairline flex items-center justify-between px-4 z-40">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-primary">VeoLMS Admin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-body hover:bg-canvas-soft-2 hover:text-ink"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Overlay (Mobile) */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation Panel */}
        <aside
          className={`bg-white border-r border-hairline fixed inset-y-0 left-0 z-40 transform md:translate-x-0 transition-all duration-200 flex flex-col justify-between ${
            isCollapsed ? 'md:w-16' : 'md:w-64'
          } ${
            sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
          } pt-14 md:pt-0`}
        >
          <div>
            {/* Header Brand Logo (Desktop only) */}
            <div className={`hidden md:flex items-center ${isCollapsed ? 'flex-col gap-4 py-5' : 'justify-between px-6 py-5'} border-b border-hairline`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                {!isCollapsed && (
                  <div>
                    <h1 className="font-bold text-sm text-primary tracking-tight leading-none">
                      VeoLMS Console
                    </h1>
                    <span className="text-[10px] font-mono text-mute font-bold uppercase tracking-wider mt-0.5 inline-block">
                      Enterprise v2.0
                    </span>
                  </div>
                )}
              </div>
              {isCollapsed ? (
                <button
                  onClick={handleToggleCollapse}
                  className="p-1.5 rounded-lg bg-canvas-soft-2 text-mute hover:text-ink border border-hairline cursor-pointer"
                  title="Expand Sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleToggleCollapse}
                  className="p-1.5 rounded-lg text-mute hover:bg-canvas-soft-2 hover:text-ink cursor-pointer border border-transparent hover:border-hairline"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Navigation links */}
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-lg transition-all ${
                      isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 text-xs font-semibold tracking-wide'
                    } ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-body hover:bg-canvas-soft-2 hover:text-ink'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-mute'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User profile / Logout bottom strip */}
          <div className={`p-4 border-t border-hairline bg-canvas-soft flex flex-col ${isCollapsed ? 'items-center gap-4' : 'gap-2'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 px-2 py-1.5'}`}>
              <div className="w-7 h-7 bg-white border border-hairline rounded-full flex items-center justify-center font-bold text-xs text-primary shadow-sm shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary truncate leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-mute truncate capitalize mt-0.5">{user?.role}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="h-px bg-hairline my-1" />

                <Link
                  href="/"
                  className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-body hover:text-ink transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-mute" />
                  <span>Back to platform</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out Console</span>
                </button>
              </>
            )}

            {isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Log out Console"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>

        {/* Right workspace container */}
        <div className={`flex-1 pt-14 md:pt-0 flex flex-col min-w-0 h-screen overflow-y-auto transition-all duration-200 ${
          isCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  )
}
