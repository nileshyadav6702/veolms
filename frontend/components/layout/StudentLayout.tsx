'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import {
  LayoutDashboard,
  Compass,
  LogOut,
  Menu,
  X,
  Shield,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  MessageSquare
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])

  // Load collapse state on mount (defaults to true unless explicitly stored as false)
  useEffect(() => {
    const saved = localStorage.getItem('student_sidebar_collapsed')
    if (saved === 'false') {
      setIsCollapsed(false)
    }
  }, [])

  // Auto-collapse when entering video lesson pages
  useEffect(() => {
    if (pathname.startsWith('/learn/')) {
      setIsCollapsed(true)
    }
  }, [pathname])

  // Load enrolled courses list for sidebar navigation
  useEffect(() => {
    if (user) {
      api.get('/api/enrollments')
        .then((data) => {
          setEnrolledCourses(data.enrollments || [])
        })
        .catch(() => {
          // ignore
        })
    }
  }, [user])

  const handleToggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('student_sidebar_collapsed', String(nextState))
  }

  const navItems = [
    { label: 'My Learning', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Explore Catalog', href: '/dashboard/courses', icon: Compass },
    { label: 'Billing & Payments', href: '/dashboard/payments', icon: CreditCard },
    { label: 'AI Tutor Chat', href: '/dashboard/chat', icon: MessageSquare },
  ]

  // Redirect to login if user session is cleared
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-soft">
        <Spinner className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex bg-canvas-soft">
      {/* Mobile Navbar Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-hairline flex items-center justify-between px-4 z-40">
        <Link href="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="VeoLMS Logo" className="w-7 h-7 object-contain" />
          <span className="font-bold text-sm tracking-tight text-primary">VeoLMS Dashboard</span>
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
              <img src="/favicon.svg" alt="VeoLMS Logo" className="w-8 h-8 object-contain shrink-0" />
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-sm text-primary tracking-tight leading-none">
                    VeoLMS Student
                  </h1>
                  <span className="text-[10px] font-mono text-mute font-bold uppercase tracking-wider mt-0.5 inline-block">
                    Learning Workspace
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
          <nav className="p-4 space-y-6">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

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
            </div>

            {/* My Enrolled Courses Section */}
            {!isCollapsed && enrolledCourses.length > 0 && (
              <div className="space-y-2">
                <div className="px-3 flex items-center justify-between text-[10px] font-mono text-mute font-bold uppercase tracking-wider">
                  <span>My Courses</span>
                  <span className="bg-canvas-soft-2 text-primary px-1.5 py-0.5 rounded-full text-[9px] border border-hairline font-bold">
                    {enrolledCourses.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                  {enrolledCourses.map((enroll) => {
                    const course = enroll.courseId
                    const isActive = pathname.startsWith(`/learn/${course._id}`)

                    return (
                      <Link
                        key={enroll._id}
                        href={`/learn/${course._id}`}
                        onClick={() => setSidebarOpen(false)}
                        title={course.title}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all truncate ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-zinc-600 hover:bg-canvas-soft-2 hover:text-zinc-950'
                        }`}
                      >
                        <GraduationCap className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-zinc-400'}`} />
                        <span className="truncate">{course.title}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Collapsed Enrolled Courses quick icon */}
            {isCollapsed && enrolledCourses.length > 0 && (
              <div className="border-t border-hairline pt-3 flex flex-col items-center">
                <Link
                  href="/dashboard"
                  title="My Enrolled Courses"
                  className="p-2.5 rounded-lg text-body hover:bg-canvas-soft-2 hover:text-ink flex justify-center"
                >
                  <GraduationCap className="w-4.5 h-4.5 text-mute" />
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* User profile / Logout bottom strip */}
        <div className={`p-4 border-t border-hairline bg-canvas-soft flex flex-col ${isCollapsed ? 'items-center gap-4' : 'gap-2'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 px-2 py-1.5'}`}>
            <div className="w-7 h-7 bg-white border border-hairline rounded-full flex items-center justify-center font-bold text-xs text-primary shadow-sm shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || 'ST'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary truncate leading-tight">{user?.name}</p>
                <p className="text-[10px] text-mute truncate capitalize mt-0.5">{user?.role} Portal</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <>
              <div className="h-px bg-hairline my-1" />

              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Console</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </>
          )}

          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Log out"
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
  )
}


