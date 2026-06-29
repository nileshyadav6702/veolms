'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  Circle,
  X,
  ArrowLeft,
  BookOpen,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings,
  Send,
  Brain,
  Eye,
  EyeOff,
  Cpu,
  FileText,
  Edit2,
  Loader2,
} from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import VideoPlayer from '@/components/video/VideoPlayer'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'
import { useAuth } from '@/lib/auth-context'

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

function renderMarkdown(md: string) {
  if (!md) return '<p class="text-mute italic">No note written yet. Notes are saved in Markdown format.</p>';
  
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-ink mt-3 mb-1 font-sans">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-ink mt-4 mb-2 font-sans">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-bold text-ink mt-5 mb-2 font-sans border-b border-hairline pb-1">$1</h2>');
  
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-zinc-300 pl-3 italic text-mute my-2">$1</blockquote>');
  
  html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-zinc-50 border border-hairline p-2.5 rounded-lg font-mono text-[11px] text-zinc-800 my-2 overflow-x-auto whitespace-pre-wrap">$1</pre>');
  
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 px-1 py-0.5 rounded font-mono text-[11px] text-zinc-900 border border-zinc-200/50">$1</code>');
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  const lines = html.split('\n');
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemContent = line.substring(2);
      if (!inList) {
        lines[i] = '<ul class="list-disc list-inside space-y-1 my-2 pl-2 text-body">\n<li>' + itemContent + '</li>';
        inList = true;
      } else {
        lines[i] = '<li>' + itemContent + '</li>';
      }
    } else {
      if (inList) {
        lines[i] = '</ul>\n' + lines[i];
        inList = false;
      }
      if (lines[i].trim() && !lines[i].trim().startsWith('<h') && !lines[i].trim().startsWith('<pre') && !lines[i].trim().startsWith('<block') && !lines[i].trim().startsWith('<ul') && !lines[i].trim().startsWith('<li') && !lines[i].trim().startsWith('</ul')) {
        lines[i] = '<p class="my-1.5 leading-relaxed">' + lines[i] + '</p>';
      }
    }
  }
  if (inList) {
    lines.push('</ul>');
  }
  html = lines.join('\n');
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">$1</a>');

  return html;
}

export default function LearnPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const { user } = useAuth()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, ProgressRecord>>({})
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [subtitles, setSubtitles] = useState<Array<{ lang: string; label: string; url: string }>>([])
  const [initialTime, setInitialTime] = useState(0)

  const [loading, setLoading] = useState(true)
  const [streamLoading, setStreamLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Track expanded section states in sidebar
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Progress saving ref to avoid stale closure in debounced saves
  const lastSavedTimeRef = useRef<Record<string, number>>({})
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const toast = useToast()

  const [sidebarTab, setSidebarTab] = useState<'syllabus' | 'ai' | 'notes'>('syllabus')

  // Notes states
  const [noteContent, setNoteContent] = useState('')
  const [courseNotes, setCourseNotes] = useState<any[]>([])
  const [notesSubTab, setNotesSubTab] = useState<'edit' | 'preview' | 'all'>('edit')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error' | 'idle'>('idle')
  const [loadingNotes, setLoadingNotes] = useState(false)
  
  const lastFetchedContentRef = useRef<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Chat Assistant states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; timestamp: Date }>>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // AI settings
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('openai')
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiHasKey, setAiHasKey] = useState(false)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [showKeyText, setShowKeyText] = useState(false)
  const [savingAiSettings, setSavingAiSettings] = useState(false)

  // Resizable sidebar settings
  const [sidebarWidth, setSidebarWidth] = useState(330)
  const isResizingRef = useRef(false)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return
    const newWidth = window.innerWidth - e.clientX
    const maxAllowedWidth = Math.min(600, window.innerWidth * 0.8)
    if (newWidth >= 280 && newWidth <= maxAllowedWidth) {
      setSidebarWidth(newWidth)
    }
  }, [])

  const stopResizing = useCallback(() => {
    isResizingRef.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
  }, [handleMouseMove])

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
  }, [handleMouseMove, stopResizing])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
    }
  }, [handleMouseMove, stopResizing])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (sidebarTab === 'ai') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, chatLoading, sidebarTab])

  // Load chat history on lesson switch
  useEffect(() => {
    if (!currentLesson) return
    const fetchChatHistory = async () => {
      try {
        const data = await api.get(`/api/lessons/${currentLesson._id}/chat`)
        if (data.history) {
          setChatMessages(data.history.map((h: any) => ({
            sender: h.sender,
            text: h.text,
            timestamp: new Date(h.createdAt)
          })))
        }
      } catch (err) {
        console.error('Failed to load chat history:', err)
      }
    }
    
    setChatMessages([])
    setChatInput('')
    setChatLoading(false)
    fetchChatHistory()
  }, [currentLesson])

  // Fetch course, lessons, and student progress on mount / param changes
  const loadLearnData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch course metadata (which has sections)
      const courseData = await api.get(`/api/courses/${courseId}`)
      
      const sections = courseData.course.sections || []
      // Sort sections by order in place
      sections.sort((a: any, b: any) => a.order - b.order)
      setCourse(courseData.course)

      // Fetch all lessons for this course
      const lessonsData = await api.get(`/api/lessons/course/${courseId}`)
      
      const sectionOrderMap = new Map<string, number>()
      sections.forEach((sec: any, index: number) => {
        sectionOrderMap.set(sec._id, index)
      })

      const sortedLessons = (lessonsData.lessons as Lesson[]).sort((a, b) => {
        const secAIndex = sectionOrderMap.get(a.sectionId) ?? 9999
        const secBIndex = sectionOrderMap.get(b.sectionId) ?? 9999
        if (secAIndex !== secBIndex) {
          return secAIndex - secBIndex
        }
        return a.order - b.order
      })
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

      // Expand the active section in sidebar
      if (active && courseData.course?.sections) {
        setExpandedSections((prev) => ({
          ...prev,
          [active.sectionId]: true,
        }))
      }

      // Fetch user profile to get AI settings
      try {
        const profileData = await api.get('/api/auth/me')
        if (profileData.user?.aiSettings) {
          setAiProvider(profileData.user.aiSettings.provider || 'gemini')
          setAiModel(profileData.user.aiSettings.model || 'gemini-1.5-flash')
          setAiHasKey(!!profileData.user.aiSettings.hasKey)
        }
      } catch (err) {
        console.error('Failed to load user AI settings:', err)
      }
    } catch {
      // Redirect on error (e.g. not enrolled or invalid ids)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId, router])

  const fetchCurrentNote = useCallback(async (targetLessonId: string) => {
    try {
      setLoadingNotes(true)
      setSaveStatus('idle')
      const data = await api.get(`/api/notes/lesson/${targetLessonId}`)
      if (data.note) {
        setNoteContent(data.note.content)
        lastFetchedContentRef.current = data.note.content
        setSaveStatus('saved')
      } else {
        setNoteContent('')
        lastFetchedContentRef.current = ''
        setSaveStatus('idle')
      }
    } catch (err) {
      console.error('Failed to load note:', err)
      setSaveStatus('error')
    } finally {
      setLoadingNotes(false)
    }
  }, [])

  const fetchCourseNotes = useCallback(async () => {
    try {
      const data = await api.get(`/api/notes/course/${courseId}`)
      setCourseNotes(data.notes || [])
    } catch (err) {
      console.error('Failed to load course notes:', err)
    }
  }, [courseId])

  const saveCurrentNote = async () => {
    if (!currentLesson) return
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    setSaveStatus('saving')
    try {
      await api.post('/api/notes', {
        courseId,
        lessonId: currentLesson._id,
        content: noteContent,
      })
      lastFetchedContentRef.current = noteContent
      setSaveStatus('saved')
      toast.success('Note saved successfully!')
      fetchCourseNotes()
    } catch (err: any) {
      setSaveStatus('error')
      toast.error(err.message || 'Failed to save note')
    }
  }

  // Auto-save effect (saves after 3 seconds of no typing)
  useEffect(() => {
    if (
      loadingNotes ||
      lastFetchedContentRef.current === null ||
      noteContent === lastFetchedContentRef.current
    ) {
      if (lastFetchedContentRef.current === null && !loadingNotes) {
        lastFetchedContentRef.current = noteContent
      }
      return
    }

    setSaveStatus('unsaved')

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!currentLesson) return
      setSaveStatus('saving')
      try {
        await api.post('/api/notes', {
          courseId,
          lessonId: currentLesson._id,
          content: noteContent,
        })
        lastFetchedContentRef.current = noteContent
        setSaveStatus('saved')
        fetchCourseNotes()
      } catch (err) {
        console.error('Auto-save failed:', err)
        setSaveStatus('error')
      }
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [noteContent, currentLesson, courseId, loadingNotes, fetchCourseNotes])

  const handleSelectNoteLesson = (targetLessonId: string) => {
    router.push(`/learn/${courseId}/${targetLessonId}`)
    setNotesSubTab('preview')
  }

  useEffect(() => {
    loadLearnData()
  }, [loadLearnData])

  // Fetch stream url and notes whenever the active lesson changes
  const loadStreamUrl = useCallback(async () => {
    if (!currentLesson) return
    try {
      setStreamLoading(true)
      setStreamUrl(null)
      setSubtitles([])
      const data = await api.get(`/api/lessons/${currentLesson._id}/stream`)
      setStreamUrl(data.url)
      setSubtitles(data.subtitles || [])
    } catch (err: any) {
      alert(err.message || 'Error streaming lesson video.')
    } finally {
      setStreamLoading(false)
    }
  }, [currentLesson])

  useEffect(() => {
    if (currentLesson) {
      loadStreamUrl()
      fetchCurrentNote(currentLesson._id)
      fetchCourseNotes()
    }
  }, [currentLesson, loadStreamUrl, fetchCurrentNote, fetchCourseNotes, courseId])

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



  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading || !currentLesson) return

    const userMessageText = chatInput.trim()
    setChatInput('')

    const newUserMessage = {
      sender: 'user' as const,
      text: userMessageText,
      timestamp: new Date()
    }

    setChatMessages((prev) => [...prev, newUserMessage])
    setChatLoading(true)

    try {
      const response = await api.post(`/api/lessons/${currentLesson._id}/chat`, {
        message: userMessageText,
        provider: aiProvider,
        model: aiModel
      })

      const newAiMessage = {
        sender: 'ai' as const,
        text: response.reply,
        timestamp: new Date()
      }
      setChatMessages((prev) => [...prev, newAiMessage])
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to get a response from AI.'
      const newErrorMessage = {
        sender: 'ai' as const,
        text: `❌ Error: ${errorMsg}`,
        timestamp: new Date()
      }
      setChatMessages((prev) => [...prev, newErrorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAiSettings(true)
    try {
      const response = await api.put('/api/auth/ai-settings', {
        provider: aiProvider,
        model: aiModel,
        apiKey: aiApiKey || undefined
      })
      if (response.success) {
        setAiHasKey(!!response.user?.aiSettings?.hasKey)
        setAiApiKey('')
        setShowAiSettings(false)
        toast.success('AI Settings updated successfully!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save AI Settings.')
    } finally {
      setSavingAiSettings(false)
    }
  }

  const submitPresetQuestion = async (questionText: string) => {
    if (chatLoading || !currentLesson) return

    const newUserMessage = {
      sender: 'user' as const,
      text: questionText,
      timestamp: new Date()
    }

    setChatMessages((prev) => [...prev, newUserMessage])
    setChatLoading(true)

    try {
      const response = await api.post(`/api/lessons/${currentLesson._id}/chat`, {
        message: questionText,
        provider: aiProvider,
        model: aiModel
      })

      const newAiMessage = {
        sender: 'ai' as const,
        text: response.reply,
        timestamp: new Date()
      }
      setChatMessages((prev) => [...prev, newAiMessage])
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to get a response from AI.'
      const newErrorMessage = {
        sender: 'ai' as const,
        text: `❌ Error: ${errorMsg}`,
        timestamp: new Date()
      }
      setChatMessages((prev) => [...prev, newErrorMessage])
    } finally {
      setChatLoading(false)
    }
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
      <div className="flex font-sans h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">

        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0 overflow-y-auto h-full no-scrollbar">

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
                    subtitles={subtitles}
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
                        onClick={() => {
                          setSidebarTab('syllabus')
                          setSidebarOpen(sidebarTab === 'syllabus' ? !sidebarOpen : true)
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border hover:bg-canvas-soft-2 text-body hover:text-ink rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          sidebarOpen && sidebarTab === 'syllabus' ? 'bg-canvas-soft-2 border-zinc-400 font-bold text-ink' : 'bg-white border-hairline'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Syllabus</span>
                      </button>
                      <button
                        onClick={() => {
                          setSidebarTab('ai')
                          setSidebarOpen(sidebarTab === 'ai' ? !sidebarOpen : true)
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border hover:bg-canvas-soft-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          sidebarOpen && sidebarTab === 'ai' 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold' 
                            : 'bg-white border-hairline text-body hover:text-ink'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        <span>AI Assistant</span>
                      </button>
                      <button
                        onClick={() => {
                          setSidebarTab('notes')
                          setSidebarOpen(sidebarTab === 'notes' ? !sidebarOpen : true)
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border hover:bg-canvas-soft-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          sidebarOpen && sidebarTab === 'notes' 
                            ? 'bg-zinc-100 border-zinc-400 text-ink font-bold' 
                            : 'bg-white border-hairline text-body hover:text-ink'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-550 animate-pulse" />
                        <span>Notes</span>
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

                  {/* Lesson Overview (details admin added) */}
                  <div className="bg-white border border-hairline rounded-xl p-6 space-y-3 vercel-card-shadow">
                    <span className="text-[9px] font-bold font-mono text-mute uppercase tracking-widest block">Description</span>
                    <p className="text-body text-sm leading-relaxed whitespace-pre-line">
                      {currentLesson.description || 'No description for this lesson yet.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Course curriculum sidebar ── */}
          <aside
            className={`relative shrink-0 bg-white border-l border-hairline flex flex-col h-full transition-all duration-150 ${
              sidebarOpen ? '' : 'hidden'
            }`}
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Drag handle for resizing */}
            <div
              onMouseDown={startResizing}
              className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/20 active:bg-indigo-500 transition-colors z-30"
            />
            {/* Tab Switched Header */}
            <div className="h-14 flex border-b border-hairline shrink-0">
              <button
                onClick={() => setSidebarTab('syllabus')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  sidebarTab === 'syllabus'
                    ? 'border-indigo-600 text-ink bg-zinc-50/50'
                    : 'border-transparent text-mute hover:text-ink hover:bg-canvas-soft-2'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Syllabus
              </button>
              <button
                onClick={() => setSidebarTab('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  sidebarTab === 'ai'
                    ? 'border-indigo-600 text-indigo-600 bg-zinc-50/50'
                    : 'border-transparent text-mute hover:text-ink hover:bg-canvas-soft-2'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                AI Assistant
              </button>
              <button
                onClick={() => setSidebarTab('notes')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  sidebarTab === 'notes'
                    ? 'border-indigo-600 text-ink bg-zinc-50/50'
                    : 'border-transparent text-mute hover:text-ink hover:bg-canvas-soft-2'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Notes
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="px-3 hover:bg-canvas-soft-2 text-mute hover:text-ink border-l border-hairline transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sidebarTab === 'syllabus' ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
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
            ) : sidebarTab === 'ai' ? (
              <div className="flex-1 flex flex-col min-h-0 bg-canvas-soft">
                {/* AI Chat Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-zinc-50 to-white border-b border-hairline flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${subtitles.length > 0 ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-amber-500 shadow-md shadow-amber-500/50'}`} />
                    <span className="text-[10px] font-bold text-ink font-mono uppercase tracking-widest">
                      {subtitles.length > 0 ? 'Transcript Connected' : 'Lesson Meta Context'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAiSettings(!showAiSettings)}
                    className={`p-1.5 rounded-lg hover:bg-canvas-soft-2 transition-all cursor-pointer ${showAiSettings ? 'text-indigo-600 bg-canvas-soft-2 border border-hairline' : 'text-mute hover:text-ink'}`}
                    title="AI Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* AI Settings Form */}
                {showAiSettings ? (
                  <form onSubmit={handleSaveAiSettings} className="p-4 bg-white border-b border-hairline space-y-4 shrink-0 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-zinc-500" /> Settings
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAiSettings(false)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                      >
                        Back to Chat
                      </button>
                    </div>

                    {/* AI Provider */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-mute uppercase font-mono tracking-wider block">Provider</label>
                      <select
                        value={aiProvider}
                        onChange={(e) => {
                          const val = e.target.value as 'gemini' | 'openai'
                          setAiProvider(val)
                          setAiModel(val === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini')
                        }}
                        className="w-full text-xs border border-hairline rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>

                    {/* AI Model */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-mute uppercase font-mono tracking-wider block">Model</label>
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full text-xs border border-hairline rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                      >
                        {aiProvider === 'gemini' ? (
                          <>
                            <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Low Cost)</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash (Newest Default)</option>
                            <option value="gemini-1.5-pro">gemini-1.5-pro (High intelligence)</option>
                          </>
                        ) : (
                          <>
                            <option value="gpt-4o-mini">gpt-4o-mini (Fast & Cost Efficient)</option>
                            <option value="gpt-4o">gpt-4o (High intelligence)</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* API Key Override (Hybrid Model) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-mute uppercase font-mono tracking-wider block">Custom API Key</label>
                        {aiHasKey && (
                          <span className="text-[9px] font-bold font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Configured
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showKeyText ? "text" : "password"}
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                          placeholder={aiHasKey ? "••••••••••••••••••••••••••••" : `Paste your custom ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
                          className="w-full text-xs border border-hairline rounded-lg p-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyText(!showKeyText)}
                          className="absolute right-2.5 top-2.5 text-mute hover:text-ink cursor-pointer bg-transparent border-0"
                        >
                          {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[9px] text-mute leading-relaxed mt-1">
                        Leave blank to use the platform's default API key (rate-limited). Setting a custom key bypasses platform limits.
                      </p>
                    </div>

                    {/* Save Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        disabled={savingAiSettings}
                        className="flex-1 bg-ink text-white hover:bg-zinc-800 text-xs font-semibold py-2 rounded-lg transition-all"
                      >
                        {savingAiSettings ? 'Saving...' : 'Save Settings'}
                      </Button>
                      {aiHasKey && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Clear custom key and revert to platform default?')) {
                              try {
                                const response = await api.put('/api/auth/ai-settings', {
                                  provider: aiProvider,
                                  model: aiModel,
                                  apiKey: ''
                                })
                                setAiHasKey(false)
                                setAiApiKey('')
                                toast.success('Custom API Key cleared!')
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to clear key.')
                              }
                            }
                          }}
                          className="px-2.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
                          title="Remove custom API Key"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </form>
                ) : null}

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col min-h-0 no-scrollbar bg-canvas-soft">
                  {chatMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-6">
                      <div className="w-12 h-12 rounded-full bg-zinc-950 text-white flex items-center justify-center text-sm font-extrabold shadow-md">
                        AI
                      </div>
                      <div className="max-w-[200px]">
                        <h4 className="font-bold text-xs text-ink leading-tight">Lesson AI Assistant</h4>
                        <p className="text-[10px] text-mute leading-relaxed mt-1.5">
                          Ask questions about what the instructor is discussing in this video!
                        </p>
                      </div>
                      
                      {/* Preset Pills */}
                      <div className="w-full space-y-2 pt-2">
                        <button
                          onClick={() => submitPresetQuestion("Summarize this lesson in 3 key points.")}
                          className="w-full text-left px-4 py-3 text-xs bg-white border border-hairline hover:border-indigo-200 text-body hover:text-indigo-950 font-semibold rounded-xl hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] -translate-y-0 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base text-indigo-500 group-hover:scale-115 transition-transform">📝</span>
                            <span>Summarize this lesson</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-all translate-x-0 group-hover:translate-x-0.5" />
                        </button>
                        <button
                          onClick={() => submitPresetQuestion("What are the key terms or concepts introduced in this lesson?")}
                          className="w-full text-left px-4 py-3 text-xs bg-white border border-hairline hover:border-indigo-200 text-body hover:text-indigo-950 font-semibold rounded-xl hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] -translate-y-0 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base text-indigo-500 group-hover:scale-115 transition-transform">🔍</span>
                            <span>Explain key concepts</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-all translate-x-0 group-hover:translate-x-0.5" />
                        </button>
                        <button
                          onClick={() => submitPresetQuestion("Create a quick 3-question multiple-choice quiz based on this lesson to test my knowledge.")}
                          className="w-full text-left px-4 py-3 text-xs bg-white border border-hairline hover:border-indigo-200 text-body hover:text-indigo-950 font-semibold rounded-xl hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] -translate-y-0 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base text-indigo-500 group-hover:scale-115 transition-transform">🧠</span>
                            <span>Quiz me on this lesson</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-all translate-x-0 group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col">
                      {chatMessages.map((msg, index) => {
                        const isAi = msg.sender === 'ai'
                        return (
                          <div 
                            key={index} 
                            className={`flex gap-2.5 items-start max-w-[90%] ${
                              isAi ? 'self-start justify-start' : 'self-end justify-end'
                            }`}
                          >
                            {isAi && (
                              <div className="w-7 h-7 rounded-full bg-zinc-950 text-white flex items-center justify-center shrink-0 text-[10px] font-extrabold shadow-xs">
                                AI
                              </div>
                            )}
                            
                            <div className="flex flex-col space-y-1">
                              <span className={`text-[8px] font-mono text-mute uppercase px-1 ${isAi ? 'text-left' : 'text-right'}`}>
                                {isAi ? `${aiProvider} AI` : 'You'}
                              </span>
                              <div
                                className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words whitespace-pre-line shadow-sm border transition-all duration-200 ${
                                  isAi
                                    ? 'bg-white text-zinc-800 border-hairline rounded-tl-none hover:shadow-md'
                                    : 'bg-zinc-900 text-white border-zinc-800 rounded-tr-none hover:bg-zinc-950'
                                }`}
                              >
                                {msg.text}
                              </div>
                            </div>

                            {!isAi && (
                              <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0 border border-zinc-850 text-[10px] font-bold font-mono shadow-sm">
                                {user?.name?.slice(0, 1).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {chatLoading && (
                        <div className="flex gap-2.5 items-start justify-start self-start max-w-[85%]">
                          <div className="w-7 h-7 rounded-full bg-zinc-950 text-white flex items-center justify-center shrink-0 text-[10px] font-extrabold shadow-xs animate-pulse">
                            AI
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-[8px] font-mono text-mute uppercase px-1">Thinking</span>
                            <div className="bg-white border border-hairline text-zinc-850 rounded-2xl rounded-tl-none px-4 py-3 text-xs shadow-sm flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-hairline flex gap-2 shrink-0 items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    placeholder="Ask a question about the lesson..."
                    className="flex-1 text-xs border border-hairline rounded-lg px-3 py-2 bg-zinc-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-30 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center w-8.5 h-8.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 bg-canvas-soft">
                {/* Notes Header & Sub-Tabs */}
                <div className="px-4 py-3 bg-gradient-to-r from-zinc-50 to-white border-b border-hairline flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink font-mono uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-550" /> Lesson Notes
                    </span>
                    {saveStatus === 'saving' && (
                      <span className="text-[9px] font-mono text-mute flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-zinc-400" /> Saving...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Saved
                      </span>
                    )}
                    {saveStatus === 'unsaved' && (
                      <span className="text-[9px] font-mono text-amber-600 bg-amber-50 border border-amber-100/50 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Unsaved Changes</span>
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-[9px] font-mono text-red-650 bg-red-50 border border-red-100/50 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                        <span>⚠️ Error</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Clean Vercel Sub-tabs inside notes */}
                  <div className="flex border border-hairline rounded-lg p-0.5 bg-zinc-100/50 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setNotesSubTab('edit')}
                      className={`flex-1 text-center py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        notesSubTab === 'edit'
                          ? 'bg-white text-ink shadow-sm border border-hairline/10'
                          : 'text-mute hover:text-ink hover:bg-zinc-200/50'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotesSubTab('preview')}
                      className={`flex-1 text-center py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        notesSubTab === 'preview'
                          ? 'bg-white text-ink shadow-sm border border-hairline/10'
                          : 'text-mute hover:text-ink hover:bg-zinc-200/50'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotesSubTab('all')
                        fetchCourseNotes()
                      }}
                      className={`flex-1 text-center py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        notesSubTab === 'all'
                          ? 'bg-white text-ink shadow-sm border border-hairline/10'
                          : 'text-mute hover:text-ink hover:bg-zinc-200/50'
                      }`}
                    >
                      All Notes ({courseNotes.length})
                    </button>
                  </div>
                </div>

                {/* Sub-tab Views */}
                <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-white">
                  {loadingNotes ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                      <p className="text-[10px] text-mute font-mono mt-2 uppercase tracking-wider">Loading note...</p>
                    </div>
                  ) : notesSubTab === 'edit' ? (
                    <div className="flex-1 flex flex-col p-4 space-y-3">
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Write your study notes for this lesson using Markdown (e.g. # Header, **bold**, - list)..."
                        className="flex-1 w-full text-xs font-mono border border-hairline rounded-xl p-3 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all duration-200 resize-none leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={saveCurrentNote}
                        disabled={saveStatus === 'saving'}
                        className="w-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 text-xs font-semibold py-2 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {saveStatus === 'saving' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> Save Note
                          </>
                        )}
                      </button>
                    </div>
                  ) : notesSubTab === 'preview' ? (
                    <div className="flex-1 p-4 overflow-y-auto prose max-w-none text-xs text-zinc-800 leading-relaxed font-sans">
                      <div 
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(noteContent) }}
                        className="markdown-body space-y-2"
                      />
                      {noteContent.trim() && (
                        <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between">
                          <span className="text-[9px] text-mute font-mono uppercase tracking-wider">Saved in Markdown</span>
                          <button
                            onClick={() => setNotesSubTab('edit')}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* All notes in course */
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-zinc-50/50 no-scrollbar">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[9px] font-bold text-mute uppercase font-mono tracking-widest">Notes in this course</span>
                        <span className="text-[9px] text-mute font-mono">{courseNotes.length} lessons noted</span>
                      </div>
                      
                      {courseNotes.length === 0 ? (
                        <div className="text-center py-10 px-4 space-y-3 bg-white rounded-xl border border-hairline vercel-card-shadow">
                          <span className="text-2xl">📝</span>
                          <h5 className="font-bold text-xs text-ink">No notes found</h5>
                          <p className="text-[10px] text-mute max-w-[180px] mx-auto leading-relaxed">
                            Take notes on lessons in this course and they'll show up here!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {courseNotes.map((noteItem) => {
                            const isThisLesson = noteItem.lessonId?._id === currentLesson?._id;
                            return (
                              <div
                                key={noteItem._id}
                                className={`p-3 bg-white rounded-xl border border-hairline vercel-card-shadow transition-all duration-200 flex flex-col gap-2 ${
                                  isThisLesson ? 'ring-2 ring-indigo-500/20 border-indigo-200' : 'hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-[8px] font-bold font-mono text-indigo-600 uppercase tracking-widest block">
                                      Lesson {noteItem.lessonId?.order != null ? noteItem.lessonId.order + 1 : ''}
                                    </span>
                                    <h5 className="font-semibold text-xs text-ink truncate" title={noteItem.lessonId?.title}>
                                      {noteItem.lessonId?.title || 'Unknown Lesson'}
                                    </h5>
                                  </div>
                                  <span className="text-[8px] text-mute shrink-0 font-mono">
                                    {new Date(noteItem.updatedAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-mute line-clamp-2 leading-relaxed bg-zinc-50 p-1.5 rounded-lg border border-zinc-100 font-mono">
                                  {noteItem.content || 'Empty note'}
                                </p>
                                <div className="flex items-center justify-between pt-1 border-t border-hairline">
                                  {isThisLesson ? (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wide">
                                      Active Lesson
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleSelectNoteLesson(noteItem.lessonId?._id)}
                                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-850 hover:underline transition-all cursor-pointer uppercase tracking-wider"
                                    >
                                      Go to Lesson &rarr;
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (isThisLesson) {
                                        setNotesSubTab('preview');
                                      } else {
                                        handleSelectNoteLesson(noteItem.lessonId?._id);
                                      }
                                    }}
                                    className="text-[9px] font-semibold text-zinc-600 hover:text-ink hover:underline transition-all cursor-pointer"
                                  >
                                    View full note
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

      </div>
    </ProtectedRoute>
  )
}
