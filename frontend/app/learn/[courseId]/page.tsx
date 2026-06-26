'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Circle,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  GraduationCap,
  Calendar,
  Award,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import ProtectedRoute from '@/components/ProtectedRoute'
import { api } from '@/lib/api'
import CourseSpecificReviews from '@/components/courses/CourseSpecificReviews'
import { useToast } from '@/lib/toast-context'

interface Lesson {
  _id: string
  courseId: string
  sectionId: string
  title: string
  description?: string
  duration: number
  order: number
  isPreview: boolean
  status: 'processing' | 'ready' | 'error'
}

interface Section {
  _id: string
  title: string
  order: number
}

interface CourseDetail {
  _id: string
  title: string
  slug: string
  shortDescription: string
  description: string
  instructor: string
  price: number
  currency: string
  sections: Section[]
}

export default function CourseCurriculumPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const toast = useToast()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [certificate, setCertificate] = useState<any>(null)
  const [claimingCert, setClaimingCert] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Section toggle state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const handleClaimCertificate = async () => {
    try {
      setClaimingCert(true)
      const res = await api.post(`/api/certificates/course/${courseId}/claim`, {})
      if (res.success && res.certificate) {
        setCertificate(res.certificate)
        toast.success('Certificate claimed successfully! You can now view and download it.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to claim certificate.')
    } finally {
      setClaimingCert(false)
    }
  }

  const loadCourseData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch course and lessons
      const courseData = await api.get(`/api/courses/${courseId}`)
      
      const sections = courseData.course.sections || []
      sections.sort((a: any, b: any) => a.order - b.order)
      setCourse(courseData.course)
      
      const sectionOrderMap = new Map<string, number>()
      sections.forEach((sec: any, index: number) => {
        sectionOrderMap.set(sec._id, index)
      })

      const sortedLessons = (courseData.lessons || []).sort((a: Lesson, b: Lesson) => {
        const secAIndex = sectionOrderMap.get(a.sectionId) ?? 9999
        const secBIndex = sectionOrderMap.get(b.sectionId) ?? 9999
        if (secAIndex !== secBIndex) {
          return secAIndex - secBIndex
        }
        return a.order - b.order
      })
      setLessons(sortedLessons)

      // Fetch progress
      try {
        const progressData = await api.get(`/api/progress/course/${courseId}`)
        const completedIds = (progressData.progress || [])
          .filter((p: any) => p.completed)
          .map((p: any) => p.lessonId)
        setCompletedLessons(completedIds)
      } catch {
        // Safe fallback
        setCompletedLessons([])
      }

      // Fetch certificate
      try {
        const certData = await api.get(`/api/certificates/course/${courseId}/my`)
        if (certData.success && certData.claimed) {
          setCertificate(certData.certificate)
        } else {
          setCertificate(null)
        }
      } catch {
        setCertificate(null)
      }

      // Auto-open first section by default
      if (courseData.course.sections.length > 0) {
        setOpenSections({ [courseData.course.sections[0]._id]: true })
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Unable to load course syllabus details.')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    if (courseId) {
      loadCourseData()
    }
  }, [courseId, loadCourseData])

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  // Find the next lesson for the "Resume Learning" action
  const getResumeLessonId = () => {
    if (lessons.length === 0) return null
    // Find the first lesson that is not completed
    const firstIncomplete = lessons.find((l) => !completedLessons.includes(l._id))
    return firstIncomplete ? firstIncomplete._id : lessons[0]._id
  }

  if (loading) {
    return (
      <main className="flex-1 py-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        {/* Header Row Skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-44 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="h-5 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-28" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="h-14 bg-gray-50 flex items-center justify-between p-4">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Skeleton (Progress Card) */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-2 bg-gray-100 rounded-full w-full" />
            </div>

            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>

            <div className="h-10 bg-gray-200 rounded-lg w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !course) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-white rounded-xl border border-hairline shadow-sm text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Course</h2>
        <p className="text-gray-500 text-sm mb-6">{error || 'Course not found.'}</p>
        <Button onClick={() => router.push('/dashboard')} size="sm">
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const resumeLessonId = getResumeLessonId()
  const totalLessons = lessons.length
  const completedCount = completedLessons.length
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const totalDurationMin = Math.round(lessons.reduce((acc, curr) => acc + curr.duration, 0) / 60)

  return (
    <ProtectedRoute>
      <main className="flex-1 py-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Row */}
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider font-mono mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to learning panel
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              {course.title}
            </h1>
            <p className="text-zinc-500 text-sm mt-1.5 leading-relaxed max-w-3xl">
              {course.shortDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left/Center Column: Syllabus & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Collapsible Syllabus List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>Course Curriculum</span>
                  </h2>
                  <span className="text-[11px] font-medium text-zinc-400 font-mono">
                    {course.sections.length} Sections · {totalLessons} Lessons
                  </span>
                </div>

                {course.sections && course.sections.length > 0 ? (
                  <div className="space-y-4">
                    {course.sections
                      .sort((a, b) => a.order - b.order)
                      .map((section) => {
                        const sectionLessons = lessons.filter((l) => l.sectionId === section._id)
                        const isOpen = !!openSections[section._id]

                        return (
                          <Card key={section._id} padding="none" className="overflow-hidden border border-hairline bg-white shadow-sm hover:border-zinc-300/80 transition-colors">
                            {/* Section header */}
                            <div
                              onClick={() => toggleSection(section._id)}
                              className="flex items-center justify-between p-4 bg-zinc-50/70 border-b border-hairline cursor-pointer select-none hover:bg-zinc-100/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                                <span className="font-bold text-zinc-800 text-sm truncate leading-tight">
                                  {section.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-zinc-400 font-semibold font-mono">
                                  {sectionLessons.length} {sectionLessons.length === 1 ? 'lesson' : 'lessons'}
                                </span>
                                {isOpen ? (
                                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                                )}
                              </div>
                            </div>

                            {/* Section lessons list */}
                            {isOpen && (
                              <div className="divide-y divide-hairline bg-white">
                                {sectionLessons.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-zinc-400 italic">
                                    No lessons added to this section.
                                  </div>
                                ) : (
                                  sectionLessons.map((lesson) => {
                                    const isCompleted = completedLessons.includes(lesson._id)

                                    return (
                                      <div
                                        key={lesson._id}
                                        className="flex items-center justify-between p-4 hover:bg-zinc-50/30 transition-colors text-xs text-zinc-700"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 pr-4">
                                          <div className="shrink-0">
                                            {isCompleted ? (
                                              <CheckCircle className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />
                                            ) : (
                                              <Circle className="w-4.5 h-4.5 text-zinc-300" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-bold text-zinc-900 leading-normal truncate">
                                              {lesson.title}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                              Duration: {Math.round(lesson.duration / 60)} mins
                                            </p>
                                          </div>
                                        </div>

                                        <Link href={`/learn/${courseId}/${lesson._id}`} className="shrink-0">
                                          <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 h-8 px-3 font-semibold gap-1">
                                            <Play className="w-3.5 h-3.5 fill-indigo-600" />
                                            <span>Play</span>
                                          </Button>
                                        </Link>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            )}
                          </Card>
                        )
                      })}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white border border-hairline rounded-xl">
                    <p className="text-zinc-500 text-xs italic">No syllabus sections available for this course.</p>
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div className="border-t border-hairline pt-8">
                <CourseSpecificReviews courseId={courseId} isEnrolled={true} />
              </div>
            </div>

            {/* Right Column: Progress Card */}
            <div className="space-y-6">
              {/* Progress Card */}
              <Card className="p-6 bg-white border border-hairline shadow-sm">
                <span className="font-mono text-[9px] text-indigo-600 font-bold uppercase tracking-wider block mb-1">
                  Active Workspace
                </span>
                <h3 className="font-extrabold text-zinc-950 text-base mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" /> Study Dashboard
                </h3>

                <div className="space-y-4">
                  {/* Progress info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-800">{progressPercent}% Complete</span>
                      <span className="text-zinc-400">
                        {completedCount}/{totalLessons} lessons
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-hairline">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-zinc-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{totalDurationMin} mins content</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Instructor: {course.instructor}</span>
                    </div>
                  </div>

                  {resumeLessonId && (
                    <Link href={`/learn/${courseId}/${resumeLessonId}`} className="block pt-2">
                      <Button className="w-full justify-center h-10 text-xs font-bold gap-1.5 shadow-sm">
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{completedCount > 0 ? 'Resume Learning' : 'Start Learning'}</span>
                      </Button>
                    </Link>
                  )}

                  {/* Certificate Claim/View Box */}
                  {progressPercent === 100 && (
                    <div className="border-t border-zinc-100 pt-4 mt-2 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span>Course Certificate</span>
                      </h4>
                      {certificate ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 leading-normal">
                            Congratulations! Your official verified course completion certificate is ready.
                          </p>
                          <Link href={`/certificates/${certificate.certificateCode}`} target="_blank">
                            <Button className="w-full justify-center h-10 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm border-none cursor-pointer">
                              <Award className="w-3.5 h-3.5" />
                              <span>View Certificate</span>
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 leading-normal">
                            You've completed all curriculum items! Claim your certificate to verify and showcase your achievement.
                          </p>
                          <Button
                            onClick={handleClaimCertificate}
                            disabled={claimingCert}
                            className="w-full justify-center h-10 text-xs font-bold gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm border-none cursor-pointer"
                          >
                            {claimingCert ? (
                              <Spinner className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <Award className="w-3.5 h-3.5" />
                            )}
                            <span>Claim Certificate</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
    </ProtectedRoute>
  )
}
