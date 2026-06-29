'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  FolderOpen,
  FileText,
  Save,
  Globe,
  Lock,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Pencil,
  UploadCloud,
  Play,
  Video,
  Award,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'
import ConfirmModal from '@/components/ui/ConfirmModal'
import VideoPlayer from '@/components/video/VideoPlayer'
import ImageCropModal from '@/components/ui/ImageCropModal'

interface Lesson {
  _id: string
  courseId: string
  sectionId: string
  title: string
  description?: string
  videoKey: string
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

interface AdminCourse {
  _id: string
  title: string
  slug: string
  thumbnail: string
  shortDescription: string
  description: string
  instructor: string
  price: number
  isPublished: boolean
  sections: Section[]
}

export default function CourseBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const toast = useToast()

  // Confirm Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'section' | 'lesson' | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [course, setCourse] = useState<AdminCourse | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Drawer / Slider State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [focusedType, setFocusedType] = useState<'course' | 'section' | 'lesson' | 'add-section' | 'add-lesson'>('course')
  const [focusedId, setFocusedId] = useState<string | null>(null)

  // Collapsible Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  // Forms state
  // Course General Form
  const [courseTitle, setCourseTitle] = useState('')
  const [courseShortDesc, setCourseShortDesc] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseInstructor, setCourseInstructor] = useState('')
  const [coursePrice, setCoursePrice] = useState(0)
  const [courseThumbnail, setCourseThumbnail] = useState('')
  const [coursePublished, setCoursePublished] = useState(false)

  // Section Form
  const [sectionTitle, setSectionTitle] = useState('')

  // Lesson Form
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDesc, setLessonDesc] = useState('')
  const [lessonVideoKey, setLessonVideoKey] = useState('')
  const [lessonDuration, setLessonDuration] = useState(600)
  const [lessonPreview, setLessonPreview] = useState(false)

  // Adds states
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [addingLessonSectionId, setAddingLessonSectionId] = useState<string | null>(null)


  // Upload States & Action handler
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Staged files for deferred upload
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('')
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState('')
  const [editingVideoName, setEditingVideoName] = useState(false)

  // Cropping states
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCropUrl, setImageToCropUrl] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState('thumbnail.jpg')
  const [videoFileName, setVideoFileName] = useState('')

  const handleUploadFile = async (
    file: File,
    type: 'thumbnail' | 'video',
    onSuccess: (urlOrKey: string) => void
  ) => {
    try {
      setIsUploading(true)
      setUploadProgress('Preparing pre-signed upload URL...')
      
      const endpoint = type === 'thumbnail' ? '/api/upload/thumbnail' : '/api/upload/video'
      const response = await api.post(endpoint, {
        fileName: file.name,
        contentType: file.type,
      })

      const { uploadUrl, key, publicUrl } = response

      setUploadProgress('Uploading file to Cloudflare R2...')
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(`Uploading (${percent}%)`)
          }
        }
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
        
        xhr.onerror = () => reject(new Error('Network error during file upload.'))
        xhr.send(file)
      })

      setUploadProgress('Finalizing...')
      const savedValue = type === 'thumbnail' ? publicUrl : key
      onSuccess(savedValue)
      toast.success('Upload completed successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'File upload failed.')
    } finally {
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const loadCourseWorkspace = useCallback(async () => {
    try {
      setLoading(true)
      const courseData = await api.get(`/api/courses/${courseId}`)
      setCourse(courseData.course)
      setLessons(courseData.lessons || [])

      // Auto-open first section by default if none are toggled yet
      if (courseData.course.sections.length > 0) {
        setOpenSections((prev) => {
          if (Object.keys(prev).length === 0) {
            return { [courseData.course.sections[0]._id]: true }
          }
          return prev
        })
      }

      // Prefill Course Forms
      setCourseTitle(courseData.course.title)
      setCourseShortDesc(courseData.course.shortDescription)
      setCourseDesc(courseData.course.description)
      setCourseInstructor(courseData.course.instructor)
      setCoursePrice(courseData.course.price)
      setCourseThumbnail(courseData.course.thumbnail)
      setCoursePublished(courseData.course.isPublished)
    } catch {
      router.push('/admin/courses')
    } finally {
      setLoading(false)
    }
  }, [courseId, router])

  useEffect(() => {
    loadCourseWorkspace()
  }, [loadCourseWorkspace])

  // Helper trigger to open editing slider and collapse admin console layout sidebar
  const openDrawer = (
    type: 'course' | 'section' | 'lesson' | 'add-section' | 'add-lesson',
    id?: string,
    extraData?: any
  ) => {
    setFocusedType(type)
    setFocusedId(id || null)

    // Prefill form states depending on context
    if (type === 'course' && course) {
      setCourseTitle(course.title)
      setCourseShortDesc(course.shortDescription || '')
      setCourseDesc(course.description || '')
      setCourseInstructor(course.instructor || '')
      setCoursePrice(course.price || 0)
      setCourseThumbnail(course.thumbnail || '')
      setCoursePublished(course.isPublished || false)
      setThumbnailFile(null)
      setThumbnailPreviewUrl('')
    } else if (type === 'section' && extraData) {
      setSectionTitle(extraData.title)
    } else if (type === 'lesson' && extraData) {
      setLessonTitle(extraData.title)
      setLessonDesc(extraData.description || '')
      setLessonVideoKey(extraData.videoKey || '')
      setLessonDuration(extraData.duration || 600)
      setLessonPreview(extraData.isPreview || false)
      setVideoFile(null)
      setVideoFileName('')
      setVideoPreviewUrl('')
      setResolvedVideoUrl('')
      setEditingVideoName(false)
      // Resolve presigned URL for existing video
      const vKey = extraData.videoKey
      if (vKey && vKey !== 'videos/raw/temp-video.mp4') {
        api.get(`/api/upload/file?key=${encodeURIComponent(vKey)}`).then((r: any) => {
          if (r?.url) setResolvedVideoUrl(r.url)
        }).catch(() => {})
      }
    } else if (type === 'add-lesson' && extraData) {
      setAddingLessonSectionId(extraData.sectionId)
      setLessonTitle('')
      setLessonDesc('')
      setLessonVideoKey('')
      setLessonDuration(300)
      setLessonPreview(false)
      setVideoFile(null)
      setVideoFileName('')
      setVideoPreviewUrl('')
      setEditingVideoName(false)
    } else if (type === 'add-section') {
      setNewSectionTitle('')
    }

    setIsDrawerOpen(true)
    // Collapse the main admin console navigation sidebar for maximum focus space
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: true }))
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setThumbnailFile(null)
    setThumbnailPreviewUrl('')
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null)
    setVideoFileName('')
    setVideoPreviewUrl('')
    setResolvedVideoUrl('')
    setEditingVideoName(false)
    // Restore the main admin console navigation sidebar
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: false }))
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], originalFileName, { type: 'image/jpeg' })
    setThumbnailFile(croppedFile)
    setThumbnailPreviewUrl(URL.createObjectURL(croppedBlob))
    setCropModalOpen(false)
    setImageToCropUrl(null)
  }

  // Ensure sidebar is restored on workspace unmount
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: false }))
    }
  }, [])

  // --- CRUD API Event Handlers ---

  // 1. Save Course settings
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!course) return

    if (!courseThumbnail && !thumbnailFile) {
      toast.warning('Please upload a course thumbnail image first.')
      return
    }
    
    let uploadedThumbnailUrl = courseThumbnail
    
    try {
      setActionLoading(true)
      
      if (thumbnailFile) {
        setIsUploading(true)
        setUploadProgress('Preparing pre-signed upload URL...')
        
        const response = await api.post('/api/upload/thumbnail', {
          fileName: thumbnailFile.name,
          contentType: thumbnailFile.type,
        })
        const { uploadUrl, publicUrl } = response
        
        setUploadProgress('Uploading file to Cloudflare R2...')
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', thumbnailFile.type)
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setUploadProgress(`Uploading thumbnail (${percent}%)`)
            }
          }
          xhr.onload = () => {
            if (xhr.status === 200) resolve()
            else reject(new Error(`Upload failed with status ${xhr.status}`))
          }
          xhr.onerror = () => reject(new Error('Network error during file upload.'))
          xhr.send(thumbnailFile)
        })
        
        uploadedThumbnailUrl = publicUrl
        setCourseThumbnail(publicUrl)
        setThumbnailFile(null)
        setThumbnailPreviewUrl('')
      }
      
      await api.put(`/api/courses/${course._id}`, {
        title: courseTitle,
        shortDescription: courseShortDesc,
        description: courseDesc,
        instructor: courseInstructor,
        price: Number(coursePrice),
        thumbnail: uploadedThumbnailUrl,
        isPublished: coursePublished,
      })
      await loadCourseWorkspace()
      closeDrawer()
      toast.success('Course settings successfully saved.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update course settings.')
    } finally {
      setActionLoading(false)
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  // 2. Add Section
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return
    try {
      setActionLoading(true)
      const order = (course?.sections || []).length
      await api.post(`/api/courses/${courseId}/sections`, {
        title: newSectionTitle.trim(),
        order,
      })
      setNewSectionTitle('')
      closeDrawer()
      await loadCourseWorkspace()
      toast.success('Section successfully created.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create section.')
    } finally {
      setActionLoading(false)
    }
  }

  // 3. Edit Section Title
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!focusedId) return
    try {
      setActionLoading(true)
      await api.put(`/api/courses/${courseId}/sections/${focusedId}`, {
        title: sectionTitle,
      })
      await loadCourseWorkspace()
      closeDrawer()
      toast.success('Section successfully updated.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update section.')
    } finally {
      setActionLoading(false)
    }
  }

  // 4. Delete Section
  const handleDeleteSection = (sectionId: string) => {
    setDeleteType('section')
    setDeleteTargetId(sectionId)
    setDeleteModalOpen(true)
  }

  // 5. Add Lesson
  const handleAddLesson = async (sectionId: string) => {
    if (!lessonTitle.trim()) return
    let uploadedVideoKey = lessonVideoKey || 'videos/raw/temp-video.mp4'
    try {
      setActionLoading(true)

      if (videoFile) {
        setIsUploading(true)
        setUploadProgress('Preparing pre-signed upload URL...')
        const uploadResp = await api.post('/api/upload/video', {
          fileName: videoFileName || videoFile.name,
          contentType: videoFile.type,
        })
        const { uploadUrl, key } = uploadResp
        setUploadProgress('Uploading file to Cloudflare R2...')
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', videoFile.type)
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setUploadProgress(`Uploading video (${percent}%)`)
            }
          }
          xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`)))
          xhr.onerror = () => reject(new Error('Network error during file upload.'))
          xhr.send(videoFile)
        })
        uploadedVideoKey = key
      }

      const order = lessons.filter((l) => l.sectionId === sectionId).length
      await api.post('/api/lessons', {
        courseId,
        sectionId,
        title: lessonTitle.trim(),
        description: lessonDesc,
        videoKey: uploadedVideoKey,
        duration: Number(lessonDuration),
        isPreview: lessonPreview,
        order,
      })

      setAddingLessonSectionId(null)
      closeDrawer()
      await loadCourseWorkspace()
      toast.success('Lesson successfully added.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add lesson.')
    } finally {
      setActionLoading(false)
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  // 6. Save Lesson details
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!focusedId) return
    
    let uploadedVideoKey = lessonVideoKey
    
    try {
      setActionLoading(true)
      
      if (videoFile) {
        setIsUploading(true)
        setUploadProgress('Preparing pre-signed upload URL...')
        
        const response = await api.post('/api/upload/video', {
          fileName: videoFile.name,
          contentType: videoFile.type,
        })
        const { uploadUrl, key } = response
        
        setUploadProgress('Uploading file to Cloudflare R2...')
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', videoFile.type)
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setUploadProgress(`Uploading video (${percent}%)`)
            }
          }
          xhr.onload = () => {
            if (xhr.status === 200) resolve()
            else reject(new Error(`Upload failed with status ${xhr.status}`))
          }
          xhr.onerror = () => reject(new Error('Network error during file upload.'))
          xhr.send(videoFile)
        })
        
        uploadedVideoKey = key
        setLessonVideoKey(key)
        setVideoFile(null)
        setVideoFileName('')
      }
      
      await api.put(`/api/lessons/${focusedId}`, {
        title: lessonTitle,
        description: lessonDesc,
        videoKey: uploadedVideoKey,
        duration: Number(lessonDuration),
        isPreview: lessonPreview,
        status: 'ready',
      })
      await loadCourseWorkspace()
      closeDrawer()
      toast.success('Lesson successfully updated.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lesson details.')
    } finally {
      setActionLoading(false)
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  // 7. Delete Lesson
  const handleDeleteLesson = (lessonId: string) => {
    setDeleteType('lesson')
    setDeleteTargetId(lessonId)
    setDeleteModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-canvas-soft h-screen">
        <Spinner className="w-8 h-8 text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-canvas-soft h-screen overflow-y-auto relative">
      {/* Action Indicator */}
      {actionLoading && (
        <div className="fixed top-4 right-4 bg-primary text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg z-50 animate-pulse font-semibold">
          <Spinner className="w-3.5 h-3.5 text-white animate-spin" /> Working...
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-white border-b border-hairline shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/courses"
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider font-mono mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to catalog
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary mt-1">
              {course?.title}
            </h1>
            <p className="text-body text-xs mt-1">
              Manage syllabus sections, lesson materials, free previews, and course configuration settings.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href={`/admin/courses/${courseId}/certificate`}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-9 px-3 hover:bg-zinc-50 border-zinc-200 text-zinc-700 font-medium text-xs font-sans"
                title="Configure Certificate Template"
              >
                <Award className="w-4 h-4 text-zinc-500" />
                <span>Certificate</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDrawer('course')}
              className="flex items-center justify-center h-9 w-9 p-0 hover:bg-zinc-50 border-hairline"
              title="Course Settings"
            >
              <Settings className="w-4.5 h-4.5 text-zinc-600" />
            </Button>
            <Button
              onClick={() => openDrawer('add-section')}
              size="sm"
              className="flex items-center justify-center h-9 w-9 p-0 bg-primary hover:bg-primary/95 text-white shadow-sm"
              title="Add Section"
            >
              <Plus className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Curriculum Visual Map Timeline */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl w-full mx-auto space-y-6 pb-24">
        {course?.sections && course.sections.length > 0 ? (
          <div className="space-y-6">
            {course.sections
              .sort((a, b) => a.order - b.order)
              .map((section, sIdx) => {
                const sectionLessons = lessons
                  .filter((l) => l.sectionId === section._id)
                  .sort((a, b) => a.order - b.order)
                const isOpen = !!openSections[section._id]

                return (
                  <Card key={section._id} padding="none" className="overflow-hidden border border-hairline shadow-sm bg-white">
                    {/* Section Header Row */}
                    <div
                      onClick={() => toggleSection(section._id)}
                      className="flex items-center justify-between p-4 bg-zinc-50 border-b border-hairline cursor-pointer select-none hover:bg-zinc-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4 flex-1">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex items-center gap-2.5 flex-1">
                          <h3 className="font-bold text-primary text-sm truncate leading-tight">
                            {section.title}
                          </h3>
                          <span className="text-[10px] text-mute font-medium shrink-0">
                            ({sectionLessons.length} {sectionLessons.length === 1 ? 'lesson' : 'lessons'})
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDrawer('add-lesson', undefined, { sectionId: section._id })}
                          className="text-indigo-600 hover:bg-indigo-50 border-hairline hover:border-indigo-200 p-1.5 h-8 w-8 justify-center"
                          title="Add Lesson"
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDrawer('section', section._id, section)}
                          className="text-zinc-600 hover:bg-zinc-100 border-hairline p-1.5 h-8 w-8 justify-center"
                          title="Edit Section Title"
                        >
                          <Pencil className="w-4 h-4 shrink-0" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSection(section._id)}
                          className="text-red-500 hover:bg-red-50 border-hairline hover:border-red-200 p-1.5 h-8 w-8 justify-center"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </Button>
                      </div>
                    </div>

                    {/* Section Lessons List */}
                    {isOpen && (
                      <div className="divide-y divide-hairline bg-white">
                        {sectionLessons.length === 0 ? (
                          <div className="p-6 text-center text-xs text-mute italic">
                            No lessons added to this section. Get started by clicking the plus (+) icon.
                          </div>
                        ) : (
                          sectionLessons.map((lesson) => (
                            <div
                              key={lesson._id}
                              onClick={() => openDrawer('lesson', lesson._id, lesson)}
                              className="flex items-center justify-between p-4 hover:bg-zinc-50/40 transition-colors group text-xs text-zinc-700 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 pr-4 min-w-0">
                                <div className="w-6 h-6 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center shrink-0 border border-indigo-100/40">
                                  <Play className="w-3 h-3 fill-indigo-500/10 ml-0.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-primary truncate leading-normal">
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-mute font-medium mt-0.5">
                                    <span>{Math.round(lesson.duration / 60)} mins duration</span>
                                    <span>·</span>
                                    <span className="font-mono text-[9px] truncate max-w-[200px]" title={lesson.videoKey}>
                                      Key: {lesson.videoKey}
                                    </span>
                                    {lesson.isPreview && (
                                      <>
                                        <span>·</span>
                                        <Badge variant="purple" className="text-[8px] font-bold px-1.5 py-0">
                                          Free Preview
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDrawer('lesson', lesson._id, lesson)}
                                  className="text-zinc-600 hover:bg-zinc-100 border-hairline p-1.5 h-8 w-8 justify-center"
                                  title="Edit Lesson Details"
                                >
                                  <Pencil className="w-4 h-4 shrink-0" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteLesson(lesson._id)}
                                  className="text-red-500 hover:bg-red-50 border-hairline hover:border-red-200 p-1.5 h-8 w-8 justify-center"
                                  title="Delete Lesson"
                                >
                                  <Trash2 className="w-4 h-4 shrink-0" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-hairline rounded-xl p-8 vercel-card-shadow max-w-lg mx-auto mt-12">
            <div className="w-12 h-12 bg-canvas-soft-2 border border-hairline rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-primary mb-1">Your course syllabus is empty.</h3>
            <p className="text-mute text-xs max-w-sm mx-auto mb-6">
              Create curriculum sections to start organizing lessons and video streaming files.
            </p>
            <Button onClick={() => openDrawer('add-section')} size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Create First Section
            </Button>
          </div>
        )}
      </div>

      {/* ─── Slide-over Drawer Form Slider ─── */}
      {isDrawerOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[2px] transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer Container (Slides from right) */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 translate-x-0">
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <span className="font-mono text-[9px] text-indigo-600 font-bold uppercase tracking-wider">
                  Workspace Settings
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1">
                  {focusedType === 'course' && 'General Settings'}
                  {focusedType === 'section' && 'Edit Section Title'}
                  {focusedType === 'lesson' && 'Edit Lesson Details'}
                  {focusedType === 'add-section' && 'Add New Section'}
                  {focusedType === 'add-lesson' && 'Add New Lesson'}
                </h3>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticky Upload Progress Bar outside scrollable content */}
            {isUploading && (
              <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 text-center space-y-2 animate-pulse shrink-0">
                <Spinner className="w-5 h-5 text-indigo-600 mx-auto animate-spin" />
                <p className="text-xs font-semibold text-indigo-700">{uploadProgress}</p>
                <p className="text-[10px] text-indigo-500 font-mono">Please keep this browser window open.</p>
              </div>
            )}

            {/* Content Form fields */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {focusedType === 'course' && (
                <form onSubmit={handleSaveCourse} className="space-y-4">
                  <Input
                    label="Course Title"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    required
                  />
                  <Input
                    label="Short Summary description"
                    value={courseShortDesc}
                    onChange={(e) => setCourseShortDesc(e.target.value)}
                    maxLength={200}
                    required
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                      Long Syllabus Description
                    </label>
                    <textarea
                      rows={6}
                      value={courseDesc}
                      onChange={(e) => setCourseDesc(e.target.value)}
                      className="w-full border border-hairline rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-zinc-900"
                      placeholder="Enter details syllabus information..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Instructor Profile Name"
                      value={courseInstructor}
                      onChange={(e) => setCourseInstructor(e.target.value)}
                      required
                    />
                    <Input
                      label="Course Price (INR)"
                      type="number"
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                      Course Thumbnail Image
                    </label>
                    {courseThumbnail || thumbnailPreviewUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-hairline mb-3 group aspect-video bg-zinc-950 flex items-center justify-center">
                        <img
                          src={thumbnailPreviewUrl || courseThumbnail}
                          alt="Thumbnail Preview"
                          className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailFile(null)
                            setThumbnailPreviewUrl('')
                            setCourseThumbnail('')
                          }}
                          className="absolute inset-0 m-auto w-fit h-fit bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-md border border-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Thumbnail
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-indigo-400 bg-zinc-50 hover:bg-indigo-50/20 p-6 rounded-xl cursor-pointer transition-all">
                          <div className="flex flex-col items-center text-center space-y-1">
                            <UploadCloud className="w-7 h-7 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-700">Upload Course Thumbnail</span>
                            <span className="text-[10px] text-zinc-400">JPG, PNG, or WEBP up to 5MB</span>
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setOriginalFileName(file.name)
                                setImageToCropUrl(URL.createObjectURL(file))
                                setCropModalOpen(true)
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Publish state toggle block */}
                  <div className="p-4 bg-canvas-soft border border-hairline rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {coursePublished ? (
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100">
                          <Globe className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-zinc-100 text-zinc-400 rounded-lg flex items-center justify-center shrink-0 border border-zinc-200">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-zinc-900 leading-tight">Catalog Publish Status</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {coursePublished ? 'Visible in library index catalog.' : 'Private to administrators in Draft mode.'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={coursePublished}
                      onChange={(e) => setCoursePublished(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" loading={actionLoading} className="w-full justify-center flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save Course Settings
                    </Button>
                  </div>
                </form>
              )}

              {focusedType === 'section' && (
                <form onSubmit={handleSaveSection} className="space-y-4">
                  <Input
                    label="Section Title"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    required
                  />
                  <div className="pt-4">
                    <Button type="submit" loading={actionLoading} className="w-full justify-center flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save Section Title
                    </Button>
                  </div>
                </form>
              )}

              {focusedType === 'add-section' && (
                <div className="space-y-4">
                  <Input
                    label="Section Title"
                    placeholder="e.g. Intro to TypeScript"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    required
                  />
                  <div className="pt-4">
                    <Button
                      onClick={handleAddSection}
                      loading={actionLoading}
                      className="w-full justify-center flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Create Section
                    </Button>
                  </div>
                </div>
              )}

              {focusedType === 'lesson' && (
                <form onSubmit={handleSaveLesson} className="space-y-4">
                  <Input
                    label="Lesson Title"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                      Lesson Video Resource
                    </label>
                    {videoFile || (lessonVideoKey && lessonVideoKey !== 'videos/raw/temp-video.mp4') ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-zinc-50 border border-hairline rounded-xl flex items-center justify-between group">
                          <div className="min-w-0 pr-3 flex-1">
                            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                              {videoFile ? 'Staged Video (Ready to Save)' : 'Uploaded Video File'}
                            </span>
                            {videoFile && editingVideoName ? (
                              <input
                                type="text"
                                value={videoFileName}
                                onChange={(e) => setVideoFileName(e.target.value)}
                                onBlur={() => setEditingVideoName(false)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingVideoName(false) }}
                                autoFocus
                                className="font-mono text-xs text-indigo-600 font-semibold block mt-0.5 w-full bg-white border border-indigo-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            ) : (
                              <span
                                className="font-mono text-xs text-indigo-600 font-semibold truncate block mt-0.5 cursor-pointer hover:text-indigo-700"
                                title={videoFile ? 'Click to edit name' : lessonVideoKey}
                                onClick={() => { if (videoFile) setEditingVideoName(true) }}
                              >
                                {videoFileName || lessonVideoKey.split('/').pop()}
                                {videoFile && <Pencil className="w-2.5 h-2.5 inline ml-1 opacity-50" />}
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-zinc-400 block mt-1">
                              {videoFile ? `Size: ${Math.round(videoFile.size / 1024 / 1024)}MB` : `Key: ${lessonVideoKey}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
                              setVideoFile(null)
                              setVideoFileName('')
                              setVideoPreviewUrl('')
                              setEditingVideoName(false)
                              setLessonVideoKey('videos/raw/temp-video.mp4')
                            }}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100 flex items-center justify-center shrink-0 cursor-pointer"
                            title="Remove Video"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                        <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center">
                          {(videoFile ? videoPreviewUrl : resolvedVideoUrl) ? (
                            <VideoPlayer
                              src={videoFile ? videoPreviewUrl : resolvedVideoUrl}
                              type={videoFile ? videoFile.type : undefined}
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-zinc-500 text-xs">
                              <Spinner className="w-4 h-4 animate-spin" /> Preparing video...
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-indigo-400 bg-zinc-50 hover:bg-indigo-50/20 p-6 rounded-xl cursor-pointer transition-all">
                          <div className="flex flex-col items-center text-center space-y-1">
                            <UploadCloud className="w-7 h-7 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-700">Upload Video File to Cloudflare R2</span>
                            <span className="text-[10px] text-zinc-400">MP4, WEBM, or MOV up to 100MB</span>
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
                                const previewUrl = URL.createObjectURL(file)
                                setVideoFile(file)
                                setVideoFileName(file.name)
                                setVideoPreviewUrl(previewUrl)
                                setEditingVideoName(false)

                                // Auto-calculate duration locally in browser
                                const video = document.createElement('video')
                                video.preload = 'metadata'
                                const metaUrl = URL.createObjectURL(file)
                                video.src = metaUrl
                                const cleanup = () => {
                                  video.removeEventListener('loadedmetadata', handleMetadata)
                                  video.removeEventListener('durationchange', handleMetadata)
                                  video.removeEventListener('error', handleError)
                                  try { URL.revokeObjectURL(metaUrl) } catch (_) {}
                                }
                                const handleMetadata = () => {
                                  if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                                    setLessonDuration(Math.round(video.duration))
                                    cleanup()
                                  }
                                }
                                const handleError = () => { cleanup() }
                                video.addEventListener('loadedmetadata', handleMetadata)
                                video.addEventListener('durationchange', handleMetadata)
                                video.addEventListener('error', handleError)
                                video.load()
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <Input
                    label="Video Duration (Seconds)"
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    required
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                      Lesson Description / Outline
                    </label>
                    <textarea
                      rows={4}
                      value={lessonDesc}
                      onChange={(e) => setLessonDesc(e.target.value)}
                      className="w-full border border-hairline rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-zinc-900"
                      placeholder="Enter short outline summary..."
                    />
                  </div>

                  {/* Free preview toggle */}
                  <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-indigo-900 leading-tight">Free Preview Lesson</h4>
                        <p className="text-[10px] text-indigo-600/80 mt-0.5">
                          Allow non-enrolled visitors to preview this lesson free.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={lessonPreview}
                      onChange={(e) => setLessonPreview(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" loading={actionLoading} className="w-full justify-center flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save Lesson Details
                    </Button>
                  </div>
                </form>
              )}

              {focusedType === 'add-lesson' && (
                <form onSubmit={(e) => { e.preventDefault(); handleAddLesson(addingLessonSectionId!) }} className="space-y-4">
                  <Input
                    label="Lesson Title"
                    placeholder="e.g. Setup & Hello World"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                      Lesson Video Resource
                    </label>
                    {videoFile ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-zinc-50 border border-hairline rounded-xl flex items-center justify-between group">
                          <div className="min-w-0 pr-3 flex-1">
                            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                              Staged Video (Ready to Save)
                            </span>
                            {editingVideoName ? (
                              <input
                                type="text"
                                value={videoFileName}
                                onChange={(e) => setVideoFileName(e.target.value)}
                                onBlur={() => setEditingVideoName(false)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingVideoName(false) }}
                                autoFocus
                                className="font-mono text-xs text-indigo-600 font-semibold block mt-0.5 w-full bg-white border border-indigo-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            ) : (
                              <span
                                className="font-mono text-xs text-indigo-600 font-semibold truncate block mt-0.5 cursor-pointer hover:text-indigo-700"
                                title="Click to edit name"
                                onClick={() => setEditingVideoName(true)}
                              >
                                {videoFileName}
                                <Pencil className="w-2.5 h-2.5 inline ml-1 opacity-50" />
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-zinc-400 block mt-1">
                              Size: {Math.round(videoFile.size / 1024 / 1024)}MB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
                              setVideoFile(null)
                              setVideoFileName('')
                              setVideoPreviewUrl('')
                              setEditingVideoName(false)
                            }}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100 flex items-center justify-center shrink-0 cursor-pointer"
                            title="Remove Video"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                        <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center">
                          <VideoPlayer src={videoPreviewUrl} type={videoFile ? videoFile.type : undefined} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-indigo-400 bg-zinc-50 hover:bg-indigo-50/20 p-6 rounded-xl cursor-pointer transition-all">
                          <div className="flex flex-col items-center text-center space-y-1">
                            <UploadCloud className="w-7 h-7 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-700">Upload Video File to Cloudflare R2</span>
                            <span className="text-[10px] text-zinc-400">MP4, WEBM, or MOV up to 100MB</span>
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
                                const previewUrl = URL.createObjectURL(file)
                                setVideoFile(file)
                                setVideoFileName(file.name)
                                setVideoPreviewUrl(previewUrl)
                                setEditingVideoName(false)
                                const video = document.createElement('video')
                                video.preload = 'metadata'
                                const metaUrl = URL.createObjectURL(file)
                                video.src = metaUrl
                                const cleanup = () => {
                                  video.removeEventListener('loadedmetadata', onMeta)
                                  video.removeEventListener('durationchange', onMeta)
                                  video.removeEventListener('error', cleanup)
                                  try { URL.revokeObjectURL(metaUrl) } catch (_) {}
                                }
                                const onMeta = () => {
                                  if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                                    setLessonDuration(Math.round(video.duration))
                                    cleanup()
                                  }
                                }
                                video.addEventListener('loadedmetadata', onMeta)
                                video.addEventListener('durationchange', onMeta)
                                video.addEventListener('error', cleanup)
                                video.load()
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <Input
                    label="Video Duration (Seconds)"
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    required
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                      Lesson Description / Outline
                    </label>
                    <textarea
                      rows={4}
                      value={lessonDesc}
                      onChange={(e) => setLessonDesc(e.target.value)}
                      className="w-full border border-hairline rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-zinc-900"
                      placeholder="Enter short outline summary..."
                    />
                  </div>
                  <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-indigo-900 leading-tight">Free Preview Lesson</h4>
                        <p className="text-[10px] text-indigo-600/80 mt-0.5">
                          Allow non-enrolled visitors to preview this lesson free.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={lessonPreview}
                      onChange={(e) => setLessonPreview(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                    />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" loading={actionLoading} className="w-full justify-center flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Create Lesson
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={deleteType === 'section' ? 'Delete Section' : 'Delete Lesson'}
        message={deleteType === 'section' 
          ? 'Are you sure you want to delete this section and all of its lessons? This action cannot be undone.'
          : 'Are you sure you want to delete this lesson? This action cannot be undone.'}
        confirmText={deleteType === 'section' ? 'Delete Section' : 'Delete Lesson'}
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={async () => {
          if (!deleteType || !deleteTargetId) return
          try {
            setDeleteLoading(true)
            if (deleteType === 'section') {
              await api.del(`/api/courses/${courseId}/sections/${deleteTargetId}`)
              if (focusedId === deleteTargetId) closeDrawer()
              toast.success('Section successfully deleted.')
            } else {
              await api.del(`/api/lessons/${deleteTargetId}`)
              if (focusedId === deleteTargetId) closeDrawer()
              toast.success('Lesson successfully deleted.')
            }
            await loadCourseWorkspace()
            setDeleteModalOpen(false)
            setDeleteType(null)
            setDeleteTargetId(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete record.')
          } finally {
            setDeleteLoading(false)
          }
        }}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteType(null)
          setDeleteTargetId(null)
        }}
      />

      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={imageToCropUrl || ''}
        onCrop={handleCropComplete}
        onClose={() => {
          setCropModalOpen(false)
          setImageToCropUrl(null)
        }}
      />
    </div>
  )
}
