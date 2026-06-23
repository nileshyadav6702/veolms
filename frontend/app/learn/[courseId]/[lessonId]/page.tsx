'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Play,
  CheckCircle,
  Circle,
  Menu,
  X,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import VideoPlayer from '@/components/video/VideoPlayer'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { api } from '@/lib/api'

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
  sections: Section[]
}

interface ProgressRecord {
  lessonId: string
  watchedSeconds: number
  completed: boolean
}

export default function LearnPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, ProgressRecord>>({})
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [initialTime, setInitialTime] = useState(0)

  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Progress saving ref to avoid stale closure in debounced saves
  const lastSavedTimeRef = useRef<Record<string, number>>({})
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch course, lessons, and student progress on mount / param changes
  const loadLearnData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch course metadata (which has sections)
      const courseData = await api.get(`/api/courses/${courseId}`)
      setCourse(courseData.course)

      // Fetch all lessons for this course
      const lessonsData = await api.get(`/api/lessons/course/${courseId}`)
      const sortedLessons = (lessonsData.lessons as Lesson[]).sort((a, b) => a.order - b.order)
      setLessons(sortedLessons)

      // Set active lesson
      const active = sortedLessons.find((l) => l._id === lessonId) || sortedLessons[0]
      setCurrentLesson(active || null)

      // Fetch student progress for the course
      const progressData = await api.get(`/api/progress/course/${courseId}`)
      const map: Record<string, ProgressRecord> = {}
      ;(progressData.progress as ProgressRecord[]).forEach((p) => {
        map[p.lessonId] = p
      })
      setProgressMap(map)

      // Resume time check
      if (active && map[active._id]) {
        setInitialTime(map[active._id].watchedSeconds)
      } else {
        setInitialTime(0)
      }
    } catch {
      // Redirect on error (e.g. not enrolled or invalid ids)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId, router])

  useEffect(() => {
    loadLearnData()
  }, [loadLearnData])

  // Fetch stream url whenever the active lesson changes
  const loadStreamUrl = useCallback(async () => {
    if (!currentLesson) return
    try {
      setStreamLoading(true)
      setStreamUrl(null)
      const data = await api.get(`/api/lessons/${currentLesson._id}/stream`)
      setStreamUrl(data.url)
    } catch (err: any) {
      alert(err.message || 'Error streaming lesson video.')
    } finally {
      setStreamLoading(false)
    }
  }, [currentLesson])

  useEffect(() => {
    if (currentLesson) {
      loadStreamUrl()
    }
  }, [currentLesson, loadStreamUrl])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Save progress dynamically
  const saveProgress = useCallback(
    async (lesson: Lesson, time: number, totalDuration: number) => {
      try {
        const lastSaved = lastSavedTimeRef.current[lesson._id] || 0
        // Don't save if difference is negligible (e.g. within 3 seconds) unless lesson ended
        if (Math.abs(time - lastSaved) < 3 && time < totalDuration - 1) return

        const completed = totalDuration > 0 && time / totalDuration >= 0.9

        await api.post('/api/progress', {
          courseId,
          lessonId: lesson._id,
          watchedSeconds: Math.floor(time),
          duration: totalDuration,
          completed,
        })

        // Update local maps
        lastSavedTimeRef.current[lesson._id] = time
        setProgressMap((prev) => ({
          ...prev,
          [lesson._id]: {
            lessonId: lesson._id,
            watchedSeconds: time,
            completed,
          },
        }))
      } catch {
        // Silent fail in background progress saves
      }
    },
    [courseId]
  )

  // Handle video playback progress (Time Update)
  const handleProgress = (currentTime: number, totalDuration: number) => {
    if (!currentLesson) return

    // Debounce API calls (every 10 seconds)
    if (debounceTimerRef.current) {
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      saveProgress(currentLesson, currentTime, totalDuration)
    }, 10000)
  }

  // Handle video ending -> mark completed and auto-advance
  const handleVideoEnded = async () => {
    if (!currentLesson) return

    // Immediately save 100% progress
    await saveProgress(currentLesson, currentLesson.duration, currentLesson.duration)

    // Find next lesson
    const currentIndex = lessons.findIndex((l) => l._id === currentLesson._id)
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1]
      router.push(`/learn/${courseId}/${nextLesson._id}`)
    }
  }

  // Navigation handlers
  const goToNextLesson = () => {
    if (!currentLesson) return
    const currentIndex = lessons.findIndex((l) => l._id === currentLesson._id)
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      router.push(`/learn/${courseId}/${lessons[currentIndex + 1]._id}`)
    }
  }

  const goToPrevLesson = () => {
    if (!currentLesson) return
    const currentIndex = lessons.findIndex((l) => l._id === currentLesson._id)
    if (currentIndex > 0) {
      router.push(`/learn/${courseId}/${lessons[currentIndex - 1]._id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    )
  }

  const currentIndex = lessons.findIndex((l) => l._id === currentLesson?._id)
  const hasNext = currentIndex !== -1 && currentIndex < lessons.length - 1
  const hasPrev = currentIndex > 0

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        {/* Top Header Controls */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={course ? `/courses/${course.slug}` : '/dashboard'}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="hidden sm:block">
              <span className="text-xs text-zinc-500 font-semibold block uppercase tracking-wider font-mono">
                Learning Portal
              </span>
              <h1 className="font-bold text-sm truncate max-w-xs md:max-w-md text-white">
                {course?.title}
              </h1>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span>Lessons index</span>
          </button>
        </header>

        {/* Main Interface Layout */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Main Content Area */}
          <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto z-10">
            {/* Player block */}
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center">
              {streamLoading ? (
                <div className="aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center gap-3 border border-zinc-800 shadow-2xl">
                  <Spinner className="w-8 h-8 text-indigo-500" />
                  <p className="text-xs text-zinc-500 font-medium">Securing signed media url...</p>
                </div>
              ) : streamUrl ? (
                <VideoPlayer
                  src={streamUrl}
                  onProgress={handleProgress}
                  onEnded={handleVideoEnded}
                  initialTime={initialTime}
                />
              ) : (
                <div className="aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center border border-zinc-800 shadow-2xl text-center p-6">
                  <X className="w-12 h-12 text-red-500 mb-2" />
                  <h3 className="font-bold text-white text-base">Video Unavailable</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1">
                    Failed to initialize video streaming. Please refresh the page.
                  </p>
                </div>
              )}

              {/* Navigation and Description */}
              {currentLesson && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-indigo-500 uppercase tracking-wider">
                        Lesson {currentIndex + 1}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                        {currentLesson.title}
                      </h2>
                    </div>

                    {/* Nav actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={goToPrevLesson}
                        disabled={!hasPrev}
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900"
                      >
                        Prev
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={goToNextLesson}
                        disabled={!hasNext}
                        className="bg-indigo-600 hover:bg-indigo-700 border-transparent text-white disabled:opacity-30"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                      Lesson overview
                    </h3>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                      {currentLesson.description || 'No detailed overview provided for this lesson.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Collapsible Sidebar Overlay/Column */}
          <aside
            className={`w-80 bg-zinc-900 border-l border-zinc-800 absolute lg:relative inset-y-0 right-0 z-30 transition-transform duration-300 transform flex flex-col shrink-0 ${
              sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'
            }`}
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Curriculum index
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List index */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
              {course?.sections.map((section, idx) => {
                const sectionLessons = lessons.filter((l) => l.sectionId === section._id)

                return (
                  <div key={section._id} className="p-3">
                    <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider block mb-2 px-2">
                      Section {idx + 1}: {section.title}
                    </span>

                    <div className="space-y-1">
                      {sectionLessons.map((lesson) => {
                        const isActive = lesson._id === currentLesson?._id
                        const isCompleted = progressMap[lesson._id]?.completed

                        return (
                          <button
                            key={lesson._id}
                            onClick={() => router.push(`/learn/${courseId}/${lesson._id}`)}
                            className={`w-full flex items-start gap-3 p-2 rounded-lg text-left text-xs transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white font-medium shadow-md'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                            }`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {isCompleted ? (
                                <CheckCircle className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-400 fill-indigo-400/20'}`} />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                                {lesson.title}
                              </p>
                              <p className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-200' : 'text-zinc-500'}`}>
                                {Math.floor(lesson.duration / 60)} min
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  )
}
