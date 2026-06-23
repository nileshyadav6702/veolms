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
  FileText,
  Code,
  Link2,
  Check,
  Video,
  Clock,
  Sparkles,
  Search,
  BookOpenCheck,
  NotebookPen,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
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
  price: number
  currency: string
  instructor?: string
  shortDescription?: string
  description?: string
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
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'notes'>('overview')
  const [noteContent, setNoteContent] = useState('')
  const [noteSavedState, setNoteSavedState] = useState<'saved' | 'saving' | 'idle'>('idle')

  // Track expanded section states in sidebar
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Progress saving ref to avoid stale closure in debounced saves
  const lastSavedTimeRef = useRef<Record<string, number>>({})
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const noteSaveDebounceRef = useRef<NodeJS.Timeout | null>(null)

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

      // Initialize note from localStorage
      if (active) {
        const savedNote = localStorage.getItem(`note_${courseId}_${active._id}`) || ''
        setNoteContent(savedNote)
      }

      // Resume time check
      if (active && map[active._id]) {
        setInitialTime(map[active._id].watchedSeconds)
      } else {
        setInitialTime(0)
      }

      // Expand the active section in sidebar
      if (active && courseData.course?.sections) {
        setExpandedSections((prev) => ({
          ...prev,
          [active.sectionId]: true,
        }))
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
      // Refresh current note for new active lesson
      const savedNote = localStorage.getItem(`note_${courseId}_${currentLesson._id}`) || ''
      setNoteContent(savedNote)
      setNoteSavedState('idle')
    }
  }, [currentLesson, loadStreamUrl, courseId])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (noteSaveDebounceRef.current) {
        clearTimeout(noteSaveDebounceRef.current)
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

  // Local Storage note saving logic
  const handleNoteContentChange = (val: string) => {
    setNoteContent(val)
    setNoteSavedState('saving')

    if (noteSaveDebounceRef.current) {
      clearTimeout(noteSaveDebounceRef.current)
    }

    noteSaveDebounceRef.current = setTimeout(() => {
      if (currentLesson) {
        localStorage.setItem(`note_${courseId}_${currentLesson._id}`, val)
        setNoteSavedState('saved')
        setTimeout(() => setNoteSavedState('idle'), 2000)
      }
    }, 1000)
  }

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-mute font-mono tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    )
  }

  // Compute overall progress stats
  const completedLessonsCount = Object.values(progressMap).filter((p) => p.completed).length
  const totalLessonsCount = lessons.length
  const progressPercent =
    totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0

  const currentIndex = lessons.findIndex((l) => l._id === currentLesson?._id)
  const hasNext = currentIndex !== -1 && currentIndex < lessons.length - 1
  const hasPrev = currentIndex > 0

  return (
    <ProtectedRoute>
      <div className="flex font-sans min-h-full">

        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0">

          {/* Video — dark bg for immersive playback */}
          <div className="bg-zinc-950 px-4 sm:px-8 lg:px-12 py-5 border-b border-zinc-900">
              <div className="max-w-4xl mx-auto w-full">
                {streamLoading ? (
                  <div className="w-full aspect-video rounded-xl bg-zinc-900 border border-zinc-800/50 flex flex-col items-center justify-center gap-4">
                    <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                      Authorizing stream...
                    </p>
                  </div>
                ) : streamUrl ? (
                  <VideoPlayer
                    src={streamUrl}
                    onProgress={handleProgress}
                    onEnded={handleVideoEnded}
                    initialTime={initialTime}
                    className="rounded-xl border border-zinc-800/50"
                  />
                ) : (
                  <div className="w-full aspect-video rounded-xl bg-zinc-900 border border-zinc-800/50 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                      <X className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">Stream unavailable</p>
                      <p className="text-xs text-zinc-600 mt-1">Refresh the page or log in again.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Content below player */}
          {currentLesson && (
            <div className="px-4 sm:px-8 lg:px-12 py-6">
              <div className="max-w-4xl mx-auto w-full space-y-5">

                  {/* Lesson title row: back + title + controls */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Link
                        href={course ? `/learn/${course._id}` : '/dashboard'}
                        className="mt-0.5 p-1.5 rounded-lg bg-canvas-soft-2 border border-hairline hover:bg-canvas-soft text-mute hover:text-ink transition-all shrink-0"
                        title="Back to course"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-bold font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 uppercase tracking-widest">
                            Lesson {currentIndex + 1} / {totalLessonsCount}
                          </span>
                          {progressMap[currentLesson._id]?.completed && (
                            <span className="text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 uppercase tracking-widest flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Completed
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-ink tracking-tight leading-snug">
                          {currentLesson.title}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <div className="flex items-center gap-2 bg-white border border-hairline px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] font-mono font-semibold text-mute">{progressPercent}%</span>
                        <div className="w-14 h-1 bg-canvas-soft-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-hairline hover:bg-canvas-soft-2 text-body hover:text-ink rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Syllabus</span>
                      </button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={goToPrevLesson}
                        disabled={!hasPrev}
                        className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-20 hover:text-white text-xs font-semibold h-9 px-3 cursor-pointer rounded-lg transition-all"
                      >
                        Prev
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={goToNextLesson}
                        disabled={!hasNext}
                        className="bg-ink hover:bg-zinc-800 text-white disabled:opacity-30 text-xs font-semibold h-9 px-3 cursor-pointer rounded-lg transition-all"
                      >
                        Next <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="space-y-4">
                    <div className="flex border-b border-hairline gap-1">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 px-4 text-xs font-semibold transition-all relative cursor-pointer ${
                          activeTab === 'overview' ? 'text-ink' : 'text-mute hover:text-body'
                        }`}
                      >
                        {activeTab === 'overview' && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink rounded-full" />
                        )}
                        <span className="flex items-center gap-1.5">
                          <BookOpenCheck className="w-3.5 h-3.5" /> Overview
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveTab('resources')}
                        className={`pb-3 px-4 text-xs font-semibold transition-all relative cursor-pointer ${
                          activeTab === 'resources' ? 'text-ink' : 'text-mute hover:text-body'
                        }`}
                      >
                        {activeTab === 'resources' && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink rounded-full" />
                        )}
                        <span className="flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" /> Resources
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveTab('notes')}
                        className={`pb-3 px-4 text-xs font-semibold transition-all relative cursor-pointer ${
                          activeTab === 'notes' ? 'text-ink' : 'text-mute hover:text-body'
                        }`}
                      >
                        {activeTab === 'notes' && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink rounded-full" />
                        )}
                        <span className="flex items-center gap-1.5">
                          <NotebookPen className="w-3.5 h-3.5" /> Notebook
                          {noteContent.trim() && (
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Tab contents */}
                    <div>
                      {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                          <div className="lg:col-span-2 bg-white border border-hairline rounded-xl p-6 space-y-5 vercel-card-shadow">
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold font-mono text-mute uppercase tracking-widest block">Description</span>
                              <p className="text-body text-sm leading-relaxed">
                                {currentLesson.description || 'No description for this lesson yet.'}
                              </p>
                            </div>
                            <div className="border-t border-hairline pt-4 space-y-3">
                              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Learning Outcomes</h4>
                              <ul className="space-y-2 text-mute text-xs">
                                <li className="flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span>Demonstrate mastery of core concepts covered in this lesson.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span>Establish optimized workflows aligned with best practices.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span>Apply techniques directly to your own projects.</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                          <div className="bg-white border border-hairline rounded-xl p-5 space-y-3 vercel-card-shadow self-start">
                            <h3 className="font-bold text-xs text-ink uppercase tracking-wider">Lesson Info</h3>
                            <div className="space-y-3 text-xs">
                              <div className="flex items-center justify-between py-2 border-b border-hairline">
                                <span className="text-mute flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Duration</span>
                                <span className="text-ink font-semibold font-mono">{Math.round(currentLesson.duration / 60)} min</span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b border-hairline">
                                <span className="text-mute flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Quality</span>
                                <span className="text-ink font-semibold">1080p</span>
                              </div>
                              {course?.instructor && (
                                <div className="flex items-center justify-between py-2">
                                  <span className="text-mute">Instructor</span>
                                  <span className="text-ink font-semibold">{course.instructor}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'resources' && (
                        <div className="bg-white border border-hairline rounded-xl p-6 space-y-4 vercel-card-shadow">
                          <div>
                            <h3 className="text-sm font-bold text-ink">Lesson Resources</h3>
                            <p className="text-xs text-mute mt-1">Downloadable files and links for this lesson.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <a href="#" onClick={(e) => e.preventDefault()}
                              className="group flex items-center justify-between p-4 bg-canvas-soft border border-hairline hover:border-zinc-300 rounded-xl transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                  <Code className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-ink truncate">Exercise Repository</p>
                                  <p className="text-[10px] text-mute font-mono mt-0.5">github-source-code.zip</p>
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-mute group-hover:text-body transition-colors shrink-0" />
                            </a>
                            <a href="#" onClick={(e) => e.preventDefault()}
                              className="group flex items-center justify-between p-4 bg-canvas-soft border border-hairline hover:border-zinc-300 rounded-xl transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-ink truncate">Lecture Slides</p>
                                  <p className="text-[10px] text-mute font-mono mt-0.5">presentation-deck.pdf</p>
                                </div>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-mute group-hover:text-body transition-colors shrink-0" />
                            </a>
                          </div>
                        </div>
                      )}

                      {activeTab === 'notes' && (
                        <div className="bg-white border border-hairline rounded-xl p-6 space-y-4 vercel-card-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" /> Notebook
                              </h3>
                              <p className="text-xs text-mute mt-1">Notes are saved locally per lesson.</p>
                            </div>
                            <div className="shrink-0">
                              {noteSavedState === 'saving' && (
                                <span className="text-[10px] font-semibold text-mute flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Saving...
                                </span>
                              )}
                              {noteSavedState === 'saved' && (
                                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Saved
                                </span>
                              )}
                            </div>
                          </div>
                          <textarea
                            value={noteContent}
                            onChange={(e) => handleNoteContentChange(e.target.value)}
                            placeholder="Write your notes here..."
                            className="w-full min-h-[160px] bg-canvas-soft border border-hairline hover:border-zinc-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none rounded-xl p-4 text-xs leading-relaxed text-ink placeholder-mute transition-all resize-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Course curriculum sidebar ── */}
          <aside
            className={`w-80 shrink-0 bg-white border-l border-hairline sticky top-0 self-start flex flex-col transition-all duration-200 ${
              sidebarOpen ? '' : 'hidden'
            }`}
            style={{ height: '100vh' }}
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-hairline shrink-0">
              <span className="font-bold text-xs text-ink uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Course Content
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-canvas-soft-2 text-mute hover:text-ink transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {course?.sections.map((section, idx) => {
                const sectionLessons = lessons.filter((l) => l.sectionId === section._id)
                const isExpanded = !!expandedSections[section._id]

                return (
                  <div key={section._id} className="border border-hairline rounded-xl overflow-hidden">
                    <div
                      onClick={() => toggleSectionExpand(section._id)}
                      className="flex items-center justify-between p-3 cursor-pointer bg-canvas-soft hover:bg-canvas-soft-2 transition-colors select-none"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[8px] font-bold font-mono text-indigo-600 uppercase tracking-widest block">
                          Section {idx + 1}
                        </span>
                        <h4 className="font-semibold text-xs text-ink truncate mt-0.5" title={section.title}>
                          {section.title}
                        </h4>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-mute" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-mute" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-hairline bg-white p-1.5 space-y-0.5">
                        {sectionLessons.length === 0 ? (
                          <p className="px-3 py-2 text-[10px] text-mute italic">No lessons</p>
                        ) : (
                          sectionLessons.map((lesson) => {
                            const isActive = lesson._id === currentLesson?._id
                            const isCompleted = progressMap[lesson._id]?.completed

                            return (
                              <button
                                key={lesson._id}
                                onClick={() => router.push(`/learn/${courseId}/${lesson._id}`)}
                                className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-indigo-50 border-l-2 border-indigo-500'
                                    : 'hover:bg-canvas-soft-2'
                                }`}
                              >
                                <div className="shrink-0 mt-0.5">
                                  {isCompleted ? (
                                    <CheckCircle className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-emerald-500'}`} />
                                  ) : (
                                    <Circle className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-mute'}`} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`font-semibold leading-snug truncate ${isActive ? 'text-indigo-700' : 'text-ink'}`}>
                                    {lesson.title}
                                  </p>
                                  <p className={`text-[10px] mt-0.5 font-mono ${isActive ? 'text-indigo-500' : 'text-mute'}`}>
                                    {Math.floor(lesson.duration / 60)} min
                                  </p>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

      </div>
    </ProtectedRoute>
  )
}
