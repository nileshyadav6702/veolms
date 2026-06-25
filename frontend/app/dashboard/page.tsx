'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Play,
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  Layout,
  GraduationCap,
  TrendingUp,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

interface EnrolledCourse {
  _id: string
  title: string
  slug: string
  thumbnail?: string
  shortDescription: string
  instructor: string
  totalLessons: number
  totalDuration: number
  price: number
}

interface EnrollmentData {
  _id: string
  courseId: EnrolledCourse
  enrolledAt: string
  progressPercent?: number
  completedCount?: number
  razorpayOrderId?: string
  razorpayPaymentId?: string
}

interface RecentProgress {
  _id: string
  lessonId: {
    _id: string
    title: string
    duration: number
  }
  courseId: {
    _id: string
    title: string
    slug: string
    thumbnail?: string
  }
  watchedSeconds: number
  duration: number
  completed: boolean
  lastWatchedAt: string
}

export default function StudentDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([])
  const [recentProgress, setRecentProgress] = useState<RecentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [recentLoading, setRecentLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/enrollments')
      // Filter out enrollments where courseId is null or undefined (e.g. from deleted courses)
      const activeEnrollments = (data.enrollments as EnrollmentData[]).filter(
        (enroll) => enroll.courseId !== null && enroll.courseId !== undefined
      )

      // Fetch progress details for each enrolled course in parallel
      const enrichedEnrollments = await Promise.all(
        activeEnrollments.map(async (enroll) => {
          try {
            const progressData = await api.get(`/api/progress/course/${enroll.courseId._id}`)
            const total = enroll.courseId.totalLessons || 1
            const completed = progressData.completedCount || 0
            const percent = Math.min(100, Math.round((completed / total) * 100))

            return {
              ...enroll,
              progressPercent: percent,
              completedCount: completed,
            }
          } catch {
            return {
              ...enroll,
              progressPercent: 0,
              completedCount: 0,
            }
          }
        })
      )

      setEnrollments(enrichedEnrollments)
    } catch {
      // Ignore load errors, keep empty states
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRecentProgress = useCallback(async () => {
    try {
      setRecentLoading(true)
      const data = await api.get('/api/progress/recent')
      // Filter out progress records where courseId or lessonId is null or undefined (e.g. from deleted items)
      const validProgress = (data.recent || []).filter(
        (item: any) =>
          item.courseId !== null &&
          item.courseId !== undefined &&
          item.lessonId !== null &&
          item.lessonId !== undefined
      )
      setRecentProgress(validProgress)
    } catch {
      // Ignore
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadDashboardData()
      loadRecentProgress()
    }
  }, [user, loadDashboardData, loadRecentProgress])

  const GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-violet-600 to-indigo-700',
    'from-emerald-500 to-teal-600',
    'from-blue-600 to-indigo-600',
  ]

  // Calculate global summary stats
  const totalCourses = enrollments.length
  const completedLessonsTotal = enrollments.reduce((acc, curr) => acc + (curr.completedCount || 0), 0)
  const averageProgress = totalCourses > 0 
    ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0) / totalCourses)
    : 0

  return (
    <div className="p-6 sm:p-8 w-full max-w-7xl mx-auto space-y-8">
      {/* Premium Gradient Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/30 blur-[60px] rounded-full pointer-events-none -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none translate-y-12" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
              Student Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Student'}.
            </h1>
            <p className="text-zinc-300 text-xs sm:text-sm max-w-xl">
              Track your path, view payment records, and continue building skills from where you left off.
            </p>
          </div>
          {user?.role === 'admin' && (
            <Link href="/admin" className="shrink-0">
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Layout className="w-4 h-4" /> Admin Console
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 bg-white border border-hairline shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/60 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">Courses Enrolled</span>
            <span className="text-2xl font-black text-zinc-900 leading-tight">{totalCourses}</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-hairline shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100/60 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">Lessons Completed</span>
            <span className="text-2xl font-black text-zinc-900 leading-tight">{completedLessonsTotal}</span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-hairline shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100/60 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">Average Progress</span>
            <span className="text-2xl font-black text-zinc-900 leading-tight">{averageProgress}%</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Enrolled Courses list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <h2 className="text-xs font-bold text-zinc-800 font-mono uppercase tracking-wider">Your Active Courses</h2>
            <span className="text-[11px] text-zinc-400 font-medium">Click a course to view lessons & payments</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="animate-pulse p-4">
                  <div className="flex gap-4">
                    <div className="w-24 aspect-video bg-zinc-100 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-100 rounded w-1/3" />
                      <div className="h-3 bg-zinc-100 rounded w-2/3" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : enrollments.length > 0 ? (
            <div className="grid grid-cols-1 gap-5">
              {enrollments.map((enroll, idx) => {
                const course = enroll.courseId
                const percent = enroll.progressPercent ?? 0
                const completed = enroll.completedCount ?? 0
                const grad = GRADIENTS[idx % GRADIENTS.length]

                return (
                  <Card key={enroll._id} padding="none" className="group overflow-hidden border border-hairline bg-white shadow-sm hover:shadow-md hover:border-zinc-300 hover:scale-[1.002] transition-all duration-300">
                    <div className="flex flex-col sm:flex-row p-4 gap-5 items-center">
                      {/* Compact Image/Gradient Banner */}
                      <div className={`w-full sm:w-48 md:w-52 aspect-video bg-gradient-to-br ${grad} shrink-0 rounded-xl border border-zinc-200/80 overflow-hidden relative shadow-sm`}>
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-white/30" />
                          </div>
                        )}
                      </div>

                      {/* Info Panel */}
                      <div className="flex-1 p-1 flex flex-col justify-between w-full">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-zinc-400 font-semibold font-mono">
                              Enrolled {new Date(enroll.enrolledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-zinc-900 text-base mb-1 line-clamp-1 hover:text-indigo-600 transition-colors">
                            <Link href={`/learn/${course._id}`}>{course.title}</Link>
                          </h3>
                          <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-relaxed">
                            {course.shortDescription}
                          </p>
                        </div>

                        {/* Progress and Workspace Navigation */}
                        <div className="space-y-3 pt-3 border-t border-zinc-100">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-zinc-800 font-bold">{percent}% Complete</span>
                            <span className="text-zinc-400 font-mono text-[11px]">
                              {completed}/{course.totalLessons} lessons
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4 pt-0.5">
                            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden border border-hairline">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <Link href={`/learn/${course._id}`} className="shrink-0">
                              <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 font-bold text-xs gap-1 py-1 h-8 px-3.5 border border-transparent hover:border-indigo-100">
                                Workspace <ArrowRight className="w-3.5 h-3.5 font-bold" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-hairline rounded-xl p-8 shadow-sm max-w-md mx-auto">
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400 border border-hairline">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 mb-1">Start your learning journey.</h3>
              <p className="text-zinc-400 text-xs max-w-sm mx-auto mb-6">
                You aren't enrolled in any courses yet. Browse our selection and pick a topic to get started.
              </p>
              <Link href="/dashboard/courses">
                <Button size="sm">Browse Catalog</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Timeline progress tracker (Recently Watched) */}
        <div className="space-y-4">
          <div className="border-b border-hairline pb-2.5">
            <h2 className="text-xs font-bold text-zinc-800 font-mono uppercase tracking-wider">Recently Watched</h2>
          </div>

          {recentLoading ? (
            <div className="space-y-3">
              <Card className="animate-pulse h-16" />
              <Card className="animate-pulse h-16" />
            </div>
          ) : recentProgress.length > 0 ? (
            <div className="space-y-3">
              {recentProgress.map((item) => {
                const isCompleted = item.completed
                const percent = Math.round((item.watchedSeconds / (item.duration || 1)) * 100)

                return (
                  <Link key={item._id} href={`/learn/${item.courseId._id}/${item.lessonId._id}`} className="block">
                    <div className="group bg-white border border-hairline p-4 rounded-xl shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Icon Indicator */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' 
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Play className="w-4 h-4 fill-current transition-colors" />
                          )}
                        </div>
                        
                        {/* Titles & Progress */}
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block truncate">
                            {item.courseId.title}
                          </span>
                          <h4 className="font-extrabold text-zinc-800 text-xs truncate group-hover:text-indigo-600 transition-colors leading-tight">
                            {item.lessonId.title}
                          </h4>
                          
                          {/* Progress bar / Complete state */}
                          {isCompleted ? (
                            <span className="text-[10px] text-emerald-600 font-semibold block mt-1">Completed</span>
                          ) : (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="text-[9px] text-zinc-400 font-semibold">{percent}% completed</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chevron indicator */}
                      <div className="text-zinc-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="p-6 bg-white border border-hairline rounded-xl text-center shadow-sm">
              <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-400 leading-normal">
                Your viewing timeline history will appear here once you begin watching videos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
