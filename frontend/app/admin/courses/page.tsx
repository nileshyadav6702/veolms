'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Settings,
  FolderPlus,
  FilePlus,
  Play,
  Save,
  X,
  Check,
  BookOpen,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import DataTable from '@/components/admin/DataTable'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'

interface Lesson {
  _id: string
  courseId: string
  sectionId: string
  title: string
  videoKey: string
  duration: number
  order: number
  isPreview: boolean
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
  totalLessons: number
  sections: Section[]
}

export default function AdminCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [loading, setLoading] = useState(true)

  // Edit/Manage state
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  const [activeCourseLessons, setActiveCourseLessons] = useState<Lesson[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)

  // Create Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newShortDesc, setNewShortDesc] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newInstructor, setNewInstructor] = useState('')
  const [newPrice, setNewPrice] = useState(0)
  const [newThumbnail, setNewThumbnail] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop')
  const [modalLoading, setModalLoading] = useState(false)

  // Section/Lesson Add State
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonVideoKey, setNewLessonVideoKey] = useState('')
  const [newLessonDuration, setNewLessonDuration] = useState(600)
  const [newLessonPreview, setNewLessonPreview] = useState(false)
  const [addingSectionCourseId, setAddingSectionCourseId] = useState<string | null>(null)
  const [addingLessonSectionId, setAddingLessonSectionId] = useState<string | null>(null)

  const fetchCourses = useCallback(() => {
    setLoading(true)
    api
      .get('/api/admin/courses')
      .then((data: { courses: AdminCourse[] }) => setCourses(data.courses))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setModalLoading(true)
      await api.post('/api/courses', {
        title: newTitle,
        shortDescription: newShortDesc,
        description: newDesc,
        instructor: newInstructor,
        price: Number(newPrice),
        thumbnail: newThumbnail,
      })

      // Reset Form
      setNewTitle('')
      setNewShortDesc('')
      setNewDesc('')
      setNewInstructor('')
      setNewPrice(0)
      setIsModalOpen(false)

      fetchCourses()
    } catch (err: any) {
      alert(err.message || 'Failed to create course.')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This will remove all sections and lessons.')) return
    try {
      await api.del(`/api/courses/${id}`)
      fetchCourses()
      if (activeCourseId === id) setActiveCourseId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete course.')
    }
  }

  const handleTogglePublish = async (course: AdminCourse) => {
    try {
      const nextPublishedState = !course.isPublished
      await api.put(`/api/courses/${course._id}`, {
        isPublished: nextPublishedState,
      })
      fetchCourses()
    } catch (err: any) {
      alert(err.message || 'Failed to toggle publish status.')
    }
  }

  // Load Lessons for expanded course
  const handleManageCurriculum = async (courseId: string) => {
    if (activeCourseId === courseId) {
      setActiveCourseId(null)
      return
    }

    try {
      setActiveCourseId(courseId)
      setLessonsLoading(true)
      setActiveCourseLessons([])

      const lessonsData = await api.get(`/api/lessons/course/${courseId}`)
      setActiveCourseLessons(lessonsData.lessons)
    } catch {
      setActiveCourseId(null)
    } finally {
      setLessonsLoading(false)
    }
  }

  // Create Section
  const handleAddSection = async (courseId: string) => {
    if (!newSectionTitle.trim()) return
    try {
      const course = courses.find((c) => c._id === courseId)
      if (!course) return
      const order = course.sections.length

      await api.post(`/api/courses/${courseId}/sections`, {
        title: newSectionTitle.trim(),
        order,
      })
      setNewSectionTitle('')
      setAddingSectionCourseId(null)
      fetchCourses()
    } catch (err: any) {
      alert(err.message || 'Failed to add section.')
    }
  }

  // Delete Section
  const handleDeleteSection = async (courseId: string, sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section and all its lessons?')) return
    try {
      await api.del(`/api/courses/${courseId}/sections/${sectionId}`)
      fetchCourses()
      // Reload lessons
      const lessonsData = await api.get(`/api/lessons/course/${courseId}`)
      setActiveCourseLessons(lessonsData.lessons)
    } catch (err: any) {
      alert(err.message || 'Failed to delete section.')
    }
  }

  // Create Lesson
  const handleAddLesson = async (courseId: string, sectionId: string) => {
    if (!newLessonTitle.trim() || !newLessonVideoKey.trim()) return
    try {
      const order = activeCourseLessons.filter((l) => l.sectionId === sectionId).length

      await api.post('/api/lessons', {
        courseId,
        sectionId,
        title: newLessonTitle.trim(),
        videoKey: newLessonVideoKey.trim(),
        duration: Number(newLessonDuration),
        isPreview: newLessonPreview,
        order,
      })

      setNewLessonTitle('')
      setNewLessonVideoKey('')
      setNewLessonDuration(600)
      setNewLessonPreview(false)
      setAddingLessonSectionId(null)

      // Reload lessons and courses
      fetchCourses()
      const lessonsData = await api.get(`/api/lessons/course/${courseId}`)
      setActiveCourseLessons(lessonsData.lessons)
    } catch (err: any) {
      alert(err.message || 'Failed to add lesson.')
    }
  }

  // Delete Lesson
  const handleDeleteLesson = async (courseId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return
    try {
      await api.del(`/api/lessons/${lessonId}`)
      fetchCourses()
      // Reload lessons
      const lessonsData = await api.get(`/api/lessons/course/${courseId}`)
      setActiveCourseLessons(lessonsData.lessons)
    } catch (err: any) {
      alert(err.message || 'Failed to delete lesson.')
    }
  }

  return (
    <ProtectedRoute role="admin">
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <span className="font-mono text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                  Registry Panel
                </span>
                <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Course Catalog</h1>
              </div>
            </div>

            <Button onClick={() => setIsModalOpen(true)} size="sm" className="flex items-center gap-1">
              <Plus className="w-4 h-4" /> Create Course
            </Button>
          </div>

          {/* Courses Data Table */}
          <DataTable
            columns={[
              { key: 'thumbnail', label: 'Preview' },
              { key: 'title', label: 'Course Title' },
              { key: 'instructor', label: 'Instructor' },
              { key: 'price', label: 'Price' },
              { key: 'lessons', label: 'Lessons' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions', align: 'right' },
            ]}
            loading={loading}
            emptyMessage="No courses found in the database. Create one to begin!"
          >
            {courses.map((course) => {
              const isExpanded = activeCourseId === course._id

              return (
                <>
                  <tr key={course._id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Thumbnail */}
                    <td className="px-6 py-4">
                      <div className="w-16 h-9 rounded bg-gray-100 overflow-hidden relative border border-gray-100 shrink-0">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-4 h-4 text-gray-300 mx-auto mt-2.5" />
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-6 py-4 font-semibold text-gray-900 truncate max-w-xs">
                      {course.title}
                    </td>

                    {/* Instructor */}
                    <td className="px-6 py-4 font-medium">{course.instructor}</td>

                    {/* Price */}
                    <td className="px-6 py-4 font-mono font-medium">₹{course.price}</td>

                    {/* Lessons */}
                    <td className="px-6 py-4 font-medium text-gray-500">
                      {course.totalLessons} lessons
                    </td>

                    {/* Status Toggle */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(course)}
                        className="cursor-pointer"
                      >
                        {course.isPublished ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="default">Draft</Badge>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageCurriculum(course._id)}
                          className={`p-1.5 ${isExpanded ? 'bg-indigo-50 text-indigo-600' : ''}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Link href={`/courses/${course.slug}`}>
                          <Button variant="ghost" size="sm" className="p-1.5">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCourse(course._id)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Curriculum Manager Panel */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50/50 p-6 border-b border-gray-100">
                        <div className="max-w-4xl mx-auto space-y-6">
                          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
                              <Settings className="w-4 h-4 text-indigo-600" /> Curriculum Builder —{' '}
                              <span className="text-gray-500 font-medium">{course.title}</span>
                            </h3>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setAddingSectionCourseId(course._id)}
                              className="text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Section
                            </Button>
                          </div>

                          {/* Add Section Field */}
                          {addingSectionCourseId === course._id && (
                            <div className="flex gap-2 max-w-md bg-white p-3 rounded-lg border border-gray-200">
                              <Input
                                placeholder="Section title..."
                                value={newSectionTitle}
                                onChange={(e) => setNewSectionTitle(e.target.value)}
                                className="h-9"
                              />
                              <Button
                                onClick={() => handleAddSection(course._id)}
                                size="sm"
                                className="h-9 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNewSectionTitle('')
                                  setAddingSectionCourseId(null)
                                }}
                                className="h-9 p-1.5"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          {lessonsLoading ? (
                            <div className="py-8 flex justify-center">
                              <Spinner className="w-6 h-6" />
                            </div>
                          ) : course.sections.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-400 italic">
                              No sections configured for this course yet. Add one above!
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {course.sections.map((section, sIdx) => {
                                const sectionLessons = activeCourseLessons
                                  .filter((l) => l.sectionId === section._id)
                                  .sort((a, b) => a.order - b.order)

                                return (
                                  <div
                                    key={section._id}
                                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                                  >
                                    {/* Section Header */}
                                    <div className="flex items-center justify-between p-3.5 bg-gray-50 border-b border-gray-100">
                                      <h4 className="font-semibold text-gray-900 text-sm">
                                        Section {sIdx + 1}: {section.title}
                                      </h4>
                                      <div className="flex items-center gap-1.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setAddingLessonSectionId(section._id)}
                                          className="text-xs py-1 px-2 h-7"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add Lesson
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteSection(course._id, section._id)}
                                          className="p-1 h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Section Lessons */}
                                    <div className="p-3 divide-y divide-gray-50">
                                      {/* Add Lesson Form */}
                                      {addingLessonSectionId === section._id && (
                                        <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 space-y-3 mb-3">
                                          <h5 className="font-bold text-xs text-gray-500 uppercase tracking-wider font-mono">
                                            New Lesson Details
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Input
                                              placeholder="Lesson Title"
                                              value={newLessonTitle}
                                              onChange={(e) => setNewLessonTitle(e.target.value)}
                                              className="h-9"
                                            />
                                            <Input
                                              placeholder="Video Key (e.g. videos/raw/intro.mp4)"
                                              value={newLessonVideoKey}
                                              onChange={(e) => setNewLessonVideoKey(e.target.value)}
                                              className="h-9"
                                            />
                                            <Input
                                              placeholder="Duration (seconds)"
                                              type="number"
                                              value={newLessonDuration}
                                              onChange={(e) => setNewLessonDuration(Number(e.target.value))}
                                              className="h-9"
                                            />
                                            <div className="flex items-center gap-2 px-2 text-xs font-semibold">
                                              <input
                                                type="checkbox"
                                                id={`preview-${section._id}`}
                                                checked={newLessonPreview}
                                                onChange={(e) => setNewLessonPreview(e.target.checked)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                              />
                                              <label htmlFor={`preview-${section._id}`}>
                                                Free Preview Lesson
                                              </label>
                                            </div>
                                          </div>
                                          <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              onClick={() => {
                                                setNewLessonTitle('')
                                                setNewLessonVideoKey('')
                                                setAddingLessonSectionId(null)
                                              }}
                                              className="h-8 text-xs"
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              onClick={() => handleAddLesson(course._id, section._id)}
                                              size="sm"
                                              className="h-8 text-xs"
                                            >
                                              Save Lesson
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {sectionLessons.length === 0 ? (
                                        <p className="text-center py-4 text-xs text-gray-400 italic">
                                          No lessons configured in this section.
                                        </p>
                                      ) : (
                                        sectionLessons.map((lesson) => (
                                          <div
                                            key={lesson._id}
                                            className="flex items-center justify-between py-2.5 text-xs"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                                                <Play className="w-2.5 h-2.5 text-indigo-600 fill-indigo-600" />
                                              </div>
                                              <span className="font-semibold text-gray-800">
                                                {lesson.title}
                                              </span>
                                              {lesson.isPreview && (
                                                <Badge variant="purple" className="text-[9px] px-1 py-0.2">
                                                  Preview
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-400">
                                              <span className="font-mono">
                                                {Math.round(lesson.duration / 60)} min · Key: {lesson.videoKey}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteLesson(course._id, lesson._id)}
                                                className="p-1 text-red-500 hover:bg-red-50 h-6 w-6"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </DataTable>
        </div>

        {/* Create Course Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-white overflow-hidden shadow-2xl relative" padding="lg">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Create New Course</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <Input
                  label="Course Title"
                  placeholder="e.g. Next.js Masterclass"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
                <Input
                  label="Short Description"
                  placeholder="e.g. Master Next.js 15 App Router in 2 hours"
                  value={newShortDesc}
                  onChange={(e) => setNewShortDesc(e.target.value)}
                  maxLength={200}
                  required
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Long Description
                  </label>
                  <textarea
                    rows={4}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    placeholder="Enter detailed course syllabus, goals, and target audience..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Instructor Name"
                    placeholder="John Doe"
                    value={newInstructor}
                    onChange={(e) => setNewInstructor(e.target.value)}
                    required
                  />
                  <Input
                    label="Price (INR)"
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <Input
                  label="Thumbnail Image URL"
                  value={newThumbnail}
                  onChange={(e) => setNewThumbnail(e.target.value)}
                  required
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={modalLoading}>
                    Create Course
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        <Footer />
      </div>
    </ProtectedRoute>
  )
}
