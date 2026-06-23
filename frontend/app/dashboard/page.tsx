'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, BookOpen, Clock, Calendar, CheckCircle2, ChevronRight, ArrowRight, Layout } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
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
}

interface EnrollmentData {
  _id: string
  courseId: EnrolledCourse
  enrolledAt: string
  progressPercent?: number
  completedCount?: number
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
      const activeEnrollments = data.enrollments as EnrollmentData[]

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
      setRecentProgress(data.recent || [])
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
    'from-slate-700 to-slate-900',
    'from-teal-600 to-teal-900',
    'from-violet-600 to-violet-900',
    'from-blue-700 to-blue-900',
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div>
              <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
                Student Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
                Welcome back, {user?.name.split(' ')[0]}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Here is a summary of your active learning progress. Keep building!
              </p>
            </div>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Admin Console
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Enrollments (Left / Center) */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Your Enrolled Courses</h2>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-24 aspect-video bg-gray-200 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-2/3" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : enrollments.length > 0 ? (
                <div className="space-y-4">
                  {enrollments.map((enroll, idx) => {
                    const course = enroll.courseId
                    const percent = enroll.progressPercent ?? 0
                    const completed = enroll.completedCount ?? 0
                    const grad = GRADIENTS[idx % GRADIENTS.length]

                    return (
                      <Card key={enroll._id} padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row">
                          {/* Thumbnail */}
                          <div className={`sm:w-48 aspect-video sm:aspect-auto bg-gradient-to-br ${grad} shrink-0 relative overflow-hidden`}>
                            {course.thumbnail ? (
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-white/30" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400 font-medium">
                                  Enrolled {new Date(enroll.enrolledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>

                              <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1 hover:text-indigo-600 transition-colors">
                                <Link href={`/courses/${course.slug}`}>{course.title}</Link>
                              </h3>
                              <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                                {course.shortDescription}
                              </p>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-indigo-600">{percent}% Complete</span>
                                <span className="text-gray-500">
                                  {completed}/{course.totalLessons} lessons
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>

                              <div className="flex justify-end pt-2 border-t border-gray-50">
                                <Link href={`/courses/${course.slug}`}>
                                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50/50">
                                    Course Details <ChevronRight className="w-4 h-4" />
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
                <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Start your learning journey</h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                    You aren't enrolled in any courses yet. Browse our selection and pick a topic to get started.
                  </p>
                  <Link href="/courses">
                    <Button size="sm">Browse Courses</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Recently Watched (Right Sidebar) */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Recently Watched</h2>

              {recentLoading ? (
                <div className="space-y-3">
                  <Card className="animate-pulse h-20" />
                  <Card className="animate-pulse h-20" />
                </div>
              ) : recentProgress.length > 0 ? (
                <div className="space-y-3">
                  {recentProgress.map((item) => {
                    const isCompleted = item.completed
                    const percent = Math.round((item.watchedSeconds / (item.duration || 1)) * 100)

                    return (
                      <Card
                        key={item._id}
                        padding="sm"
                        className="hover:shadow-md transition-all group border border-gray-100 hover:border-gray-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Play className="w-4 h-4 fill-indigo-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold font-mono text-gray-400 uppercase tracking-wider block">
                              {item.courseId.title}
                            </span>
                            <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                              {item.lessonId.title}
                            </h4>
                            <div className="flex items-center justify-between text-xs text-gray-400 mt-2 font-medium">
                              <span>{isCompleted ? 'Finished' : `${percent}% watched`}</span>
                              <Link
                                href={`/learn/${item.courseId._id}/${item.lessonId._id}`}
                                className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-700 hover:underline"
                              >
                                Resume <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 leading-normal">
                    Your recent viewing history will appear here once you begin watching videos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}
