'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Trash2,
  Settings,
  X,
  BookOpen,
  UploadCloud,
  MoreVertical,
  Globe,
} from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ImageCropModal from '@/components/ui/ImageCropModal'

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
}

export default function AdminCoursesPage() {
  const router = useRouter()
  const toast = useToast()

  // Confirm Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Dropdown Modal States
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [loading, setLoading] = useState(true)

  // Create Course Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newShortDesc, setNewShortDesc] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newInstructor, setNewInstructor] = useState('')
  const [newPrice, setNewPrice] = useState(0)
  const [newThumbnail, setNewThumbnail] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Staged files for deferred upload
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('')

  // Cropping states
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCropUrl, setImageToCropUrl] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState('thumbnail.jpg')

  const openDrawer = () => {
    setNewTitle('')
    setNewShortDesc('')
    setNewDesc('')
    setNewInstructor('')
    setNewPrice(0)
    setNewThumbnail('')
    setThumbnailFile(null)
    setThumbnailPreviewUrl('')
    setIsModalOpen(true)
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: true }))
  }

  const closeDrawer = () => {
    setIsModalOpen(false)
    setThumbnailFile(null)
    setThumbnailPreviewUrl('')
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: false }))
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], originalFileName, { type: 'image/jpeg' })
    setThumbnailFile(croppedFile)
    setThumbnailPreviewUrl(URL.createObjectURL(croppedBlob))
    setCropModalOpen(false)
    setImageToCropUrl(null)
  }

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: false }))
    }
  }, [])

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
    if (!thumbnailFile && !newThumbnail) {
      alert('Please upload a course thumbnail image first.')
      return
    }

    let finalThumbnail = newThumbnail

    try {
      setModalLoading(true)

      // Upload if there is a staged thumbnail file
      if (thumbnailFile) {
        setIsUploading(true)
        setUploadProgress('Preparing pre-signed upload URL...')
        
        const response = await api.post('/api/upload/thumbnail', {
          fileName: thumbnailFile.name,
          contentType: thumbnailFile.type,
        })
        const { uploadUrl, publicUrl } = response

        setUploadProgress('Uploading thumbnail to Cloudflare R2...')
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', thumbnailFile.type)
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setUploadProgress(`Uploading (${percent}%)`)
            }
          }
          xhr.onload = () => {
            if (xhr.status === 200) resolve()
            else reject(new Error(`Upload failed with status ${xhr.status}`))
          }
          xhr.onerror = () => reject(new Error('Network error during file upload.'))
          xhr.send(thumbnailFile)
        })

        finalThumbnail = publicUrl
        setNewThumbnail(publicUrl)
        setThumbnailFile(null)
        setThumbnailPreviewUrl('')
      }

      await api.post('/api/courses', {
        title: newTitle,
        shortDescription: newShortDesc,
        description: newDesc,
        instructor: newInstructor,
        price: Number(newPrice),
        thumbnail: finalThumbnail,
      })

      toast.success('Course created successfully.')

      // Reset Form
      setNewTitle('')
      setNewShortDesc('')
      setNewDesc('')
      setNewInstructor('')
      setNewPrice(0)
      setNewThumbnail('')
      closeDrawer()

      fetchCourses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create course.')
    } finally {
      setModalLoading(false)
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  const handleUploadFile = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    try {
      setIsUploading(true)
      setUploadProgress('Preparing pre-signed upload URL...')
      
      const response = await api.post('/api/upload/thumbnail', {
        fileName: file.name,
        contentType: file.type,
      })

      const { uploadUrl, publicUrl } = response

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
      onSuccess(publicUrl)
      toast.success('Thumbnail uploaded successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'File upload failed.')
    } finally {
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  const handleDeleteCourse = (id: string) => {
    setCourseToDelete(id)
    setDeleteModalOpen(true)
  }

  const handleTogglePublish = async (course: AdminCourse) => {
    try {
      const nextPublishedState = !course.isPublished
      await api.put(`/api/courses/${course._id}`, {
        isPublished: nextPublishedState,
      })
      toast.success(`Course successfully ${nextPublishedState ? 'published' : 'moved to drafts'}.`)
      fetchCourses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle publish status.')
    }
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 flex-1 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
            System Records
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-primary mt-1">Courses.</h2>
          <p className="text-body text-xs mt-1">
            Configure catalog details, pricing structures, and manage the curriculum builder.
          </p>
        </div>

        <Button onClick={openDrawer} size="sm" className="flex items-center gap-1 text-xs font-semibold">
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
        overflowVisible={true}
      >
        {courses.map((course) => {
          const isDropdownActive = activeDropdownId === course._id
          return (
            <tr 
              key={course._id} 
              onClick={() => router.push(`/admin/courses/${course._id}`)}
              className={`hover:bg-gray-50/50 transition-colors relative cursor-pointer ${isDropdownActive ? 'z-30' : 'z-10'}`}
            >
            {/* Thumbnail */}
            <td className="px-6 py-4">
              <div className="w-16 h-9 rounded bg-gray-100 overflow-hidden relative border border-hairline shrink-0">
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
              {course.isPublished ? (
                <Badge variant="success">Published</Badge>
              ) : (
                <Badge variant="default">Draft</Badge>
              )}
            </td>

            {/* Actions */}
            <td className="px-6 py-4 align-middle text-right relative">
              <div className="flex items-center justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveDropdownId(activeDropdownId === course._id ? null : course._id)
                  }}
                  className="p-1.5 hover:bg-canvas-soft-2 rounded-lg text-mute hover:text-primary border border-transparent hover:border-hairline transition-all cursor-pointer animate-fade-in"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {activeDropdownId === course._id && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveDropdownId(null)
                      }}
                    />
                    
                    <div 
                      className="absolute right-6 top-10 z-40 w-48 bg-white border border-hairline rounded-xl shadow-xl py-1 text-left animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >

                      <button
                        onClick={() => {
                          setActiveDropdownId(null)
                          handleTogglePublish(course)
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-canvas-soft-2 text-left cursor-pointer"
                      >
                        {course.isPublished ? (
                          <>
                            <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>Move to Drafts</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Publish Course</span>
                          </>
                        )}
                      </button>

                      <Link href={`/admin/courses/${course._id}`} className="w-full">
                        <span className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-canvas-soft-2 text-left cursor-pointer">
                          <Settings className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Manage Curriculum</span>
                        </span>
                      </Link>

                      <Link href={`/courses/${course.slug}`} className="w-full" target="_blank">
                        <span className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-canvas-soft-2 text-left cursor-pointer">
                          <Globe className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Preview Public Page</span>
                        </span>
                      </Link>

                      <div className="border-t border-hairline my-1" />

                      <button
                        onClick={() => {
                          setActiveDropdownId(null)
                          handleDeleteCourse(course._id)
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 text-left cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Delete Course</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </td>
          </tr>
        )})}
      </DataTable>

      {/* Create Course Drawer Slider (Slides from right) */}
      {isModalOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[2px] transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer Panel Container */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 translate-x-0">
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <span className="font-mono text-[9px] text-indigo-600 font-bold uppercase tracking-wider">
                  Course Catalog
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1">Create New Course</h3>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isUploading && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center space-y-2 mb-4 animate-pulse">
                  <Spinner className="w-5 h-5 text-indigo-600 mx-auto animate-spin" />
                  <p className="text-xs font-semibold text-indigo-700">{uploadProgress}</p>
                  <p className="text-[10px] text-indigo-500 font-mono">Please keep this browser window open.</p>
                </div>
              )}

              <form id="create-course-form" onSubmit={handleCreateCourse} className="space-y-4">
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                    Long Description
                  </label>
                  <textarea
                    rows={4}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full border border-hairline rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-zinc-900"
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
                
                {/* Thumbnail upload section */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5 font-mono">
                    Course Thumbnail Image
                  </label>
                  {newThumbnail || thumbnailPreviewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-hairline mb-3 group aspect-video bg-zinc-950 flex items-center justify-center">
                      <img
                        src={thumbnailPreviewUrl || newThumbnail}
                        alt="Thumbnail Preview"
                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailFile(null)
                          setThumbnailPreviewUrl('')
                          setNewThumbnail('')
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
              </form>
            </div>

            {/* Footer Panel */}
            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="secondary"
                onClick={closeDrawer}
                disabled={modalLoading || isUploading}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-course-form"
                loading={modalLoading}
                disabled={isUploading || (!newThumbnail && !thumbnailFile)}
                className="text-xs font-semibold shadow-sm"
              >
                Create Course
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Course"
        message="Are you sure you want to delete this course? This will remove all sections and lessons. This action cannot be undone."
        confirmText="Delete Course"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={async () => {
          if (!courseToDelete) return
          try {
            setDeleteLoading(true)
            await api.del(`/api/courses/${courseToDelete}`)
            toast.success('Course deleted successfully.')
            fetchCourses()
            setDeleteModalOpen(false)
            setCourseToDelete(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete course.')
          } finally {
            setDeleteLoading(false)
          }
        }}
        onClose={() => {
          setDeleteModalOpen(false)
          setCourseToDelete(null)
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
