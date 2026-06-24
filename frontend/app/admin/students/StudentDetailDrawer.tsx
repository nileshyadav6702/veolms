'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  X, Laptop, Smartphone, HelpCircle, ShieldAlert, Trash2, 
  Plus, Copy, Check, BookOpen, Clock, Activity, AlertTriangle
} from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Student {
  _id: string
  name: string
  email: string
  lastLogin?: string
  createdAt: string
}

interface Session {
  _id: string
  deviceInfo: string
  ipAddress: string
  lastActive: string
  createdAt: string
}

interface Course {
  _id: string
  title: string
  price: number
  thumbnail?: string
  description?: string
}

interface Enrollment {
  _id: string
  courseId: Course
  paymentStatus: string
  enrolledAt: string
}

interface StudentDetailDrawerProps {
  studentId: string | null
  isOpen: boolean
  onClose: () => void
  onStudentDeleted: () => void
  onStudentUpdated: () => void
}

export default function StudentDetailDrawer({
  studentId,
  isOpen,
  onClose,
  onStudentDeleted,
  onStudentUpdated,
}: StudentDetailDrawerProps) {
  const toast = useToast()
  
  // Data State
  const [student, setStudent] = useState<Student | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  
  // Modals State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [revokeCourseModalOpen, setRevokeCourseModalOpen] = useState(false)
  const [activeRevokeCourseId, setActiveRevokeCourseId] = useState<string | null>(null)
  const [activeRevokeCourseTitle, setActiveRevokeCourseTitle] = useState('')

  // Fetch details
  const fetchDetails = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const data = await api.get(`/api/admin/students/${studentId}`)
      setStudent(data.student)
      setSessions(data.sessions)
      setEnrollments(data.enrollments)
      setAllCourses(data.allCourses)
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve student records')
      onClose()
    } finally {
      setLoading(false)
    }
  }, [studentId, toast, onClose])

  useEffect(() => {
    if (isOpen && studentId) {
      fetchDetails()
      setSelectedCourseId('')
    }
  }, [isOpen, studentId, fetchDetails])

  // Copy Email to clipboard
  const handleCopyEmail = () => {
    if (student?.email) {
      navigator.clipboard.writeText(student.email)
      setCopiedEmail(true)
      toast.success('Email copied to clipboard')
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  // Parse User Agent strings nicely
  const parseDevice = (uaString: string) => {
    const ua = uaString.toLowerCase()
    let os = 'Unknown System'
    let browser = 'Unknown Browser'
    let isMobile = false

    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS'
    else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = ua.includes('iphone') ? 'iPhone' : 'iPad'
      isMobile = true
    } else if (ua.includes('android')) {
      os = 'Android'
      isMobile = true
    } else if (ua.includes('linux')) os = 'Linux'

    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('edge')) browser = 'Edge'

    return { os, browser, isMobile }
  }

  // Revoke device session
  const handleRevokeSession = async (sessionId: string) => {
    if (!studentId) return
    setActionLoading(`session-${sessionId}`)
    try {
      await api.del(`/api/admin/students/${studentId}/sessions/${sessionId}`)
      toast.success('Device session terminated')
      setSessions(prev => prev.filter(s => s._id !== sessionId))
      onStudentUpdated()
    } catch (err: any) {
      toast.error(err.message || 'Failed to terminate session')
    } finally {
      setActionLoading(null)
    }
  }

  // Revoke Course Access
  const triggerRevokeCourse = (courseId: string, title: string) => {
    setActiveRevokeCourseId(courseId)
    setActiveRevokeCourseTitle(title)
    setRevokeCourseModalOpen(true)
  }

  const handleRevokeCourseAccess = async () => {
    if (!studentId || !activeRevokeCourseId) return
    setActionLoading('course-revoke')
    try {
      await api.del(`/api/admin/students/${studentId}/courses/${activeRevokeCourseId}`)
      toast.success(`Access to ${activeRevokeCourseTitle} revoked`)
      setEnrollments(prev => prev.filter(e => e.courseId?._id !== activeRevokeCourseId))
      setRevokeCourseModalOpen(false)
      setActiveRevokeCourseId(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke course access')
    } finally {
      setActionLoading(null)
    }
  }

  // Grant Course Access
  const handleGrantCourseAccess = async () => {
    if (!studentId || !selectedCourseId) return
    setActionLoading('course-grant')
    try {
      const selected = allCourses.find(c => c._id === selectedCourseId)
      await api.post(`/api/admin/students/${studentId}/courses`, { courseId: selectedCourseId })
      toast.success(`Enrolled student in ${selected?.title || 'course'}`)
      
      // Re-fetch details to sync the list & reset selected course
      await fetchDetails()
      setSelectedCourseId('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant course access')
    } finally {
      setActionLoading(null)
    }
  }

  // Delete Student Permanently
  const handleDeleteStudent = async () => {
    if (!studentId) return
    setActionLoading('student-delete')
    try {
      await api.del(`/api/admin/students/${studentId}`)
      toast.success('Student account permanently deleted')
      setDeleteModalOpen(false)
      onClose()
      onStudentDeleted()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student')
    } finally {
      setActionLoading(null)
    }
  }

  // Determine non-enrolled courses for select dropdown
  const enrolledCourseIds = enrollments.map(e => e.courseId?._id).filter(Boolean)
  const grantableCourses = allCourses.filter(c => !enrolledCourseIds.includes(c._id))

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-zinc-100 shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">Student profile center.</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
          {loading ? (
            /* Loading Skeletons */
            <div className="space-y-8 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-zinc-200 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-5 bg-zinc-200 rounded w-48" />
                  <div className="h-3.5 bg-zinc-200 rounded w-64" />
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 bg-zinc-200 rounded w-1/4" />
                <div className="h-24 bg-zinc-100 rounded-xl" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-zinc-200 rounded w-1/3" />
                <div className="h-36 bg-zinc-100 rounded-xl" />
              </div>
            </div>
          ) : student ? (
            <>
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6 bg-zinc-50/70 border border-zinc-100 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-100/40 transition-colors duration-500" />
                
                {/* Avatar */}
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/10 shrink-0">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-bold text-zinc-900 leading-tight">{student.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <span className="font-mono text-xs text-zinc-400 bg-zinc-100/80 px-2 py-0.5 rounded-md">ID: {student._id}</span>
                      <Badge variant="primary" className="text-[10px] py-0.5 px-2 font-mono uppercase tracking-wider font-bold">Student</Badge>
                    </div>
                  </div>

                  {/* Email & Details */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-xs text-zinc-500">
                    <button 
                      onClick={handleCopyEmail}
                      className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors font-medium border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 px-2 py-0.5 rounded-md cursor-pointer"
                    >
                      {student.email}
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                    <span className="text-zinc-300 hidden sm:inline">|</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Joined {new Date(student.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stateful Authentication & Device Limit (2 devices max) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-bold text-sm text-zinc-800 tracking-tight">Active device sessions.</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Logged-in Devices:</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      sessions.length >= 2 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {sessions.length} / 2 limit
                    </span>
                  </div>
                </div>

                {/* Last Login Info */}
                {student.lastLogin && (
                  <div className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-100/50 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Platform Last Active: <span className="font-bold text-zinc-700">{new Date(student.lastLogin).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</span>
                  </div>
                )}

                {sessions.length === 0 ? (
                  <div className="text-xs text-zinc-400 text-center py-6 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl">
                    No active sessions found. The student is currently offline on all devices.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {sessions.map((session) => {
                      const device = parseDevice(session.deviceInfo)
                      return (
                        <div 
                          key={session._id} 
                          className="flex items-center justify-between p-4 bg-white border border-zinc-100 hover:border-zinc-200 hover:shadow-xs rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 text-zinc-500">
                              {device.isMobile ? <Smartphone className="w-4.5 h-4.5" /> : <Laptop className="w-4.5 h-4.5" />}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-800 text-xs sm:text-sm truncate">
                                  {device.browser} on {device.os}
                                </span>
                                {sessionIdMatches(session._id) && (
                                  <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                                    Current Session
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium">
                                <span className="font-mono">{session.ipAddress}</span>
                                <span>•</span>
                                <span>Active {new Date(session.lastActive).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            loading={actionLoading === `session-${session._id}`}
                            onClick={() => handleRevokeSession(session._id)}
                            className="text-[10px] text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 px-3 shrink-0 py-1"
                          >
                            Revoke
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Course Access Administration */}
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-bold text-sm text-zinc-800 tracking-tight">Course access.</h4>
                  </div>
                </div>

                {/* List of enrolled courses */}
                {enrollments.length === 0 ? (
                  <div className="text-xs text-zinc-400 text-center py-6 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl">
                    No active course enrollments discovered.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {enrollments.map((e) => {
                      const c = e.courseId
                      if (!c) return null
                      return (
                        <div 
                          key={e._id} 
                          className="flex items-center justify-between p-3.5 bg-white border border-zinc-100 rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {c.thumbnail ? (
                              <img 
                                src={c.thumbnail} 
                                alt={c.title} 
                                className="w-12 h-12 object-cover rounded-lg border border-zinc-100 shrink-0 bg-zinc-50"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-zinc-400" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <span className="font-bold text-zinc-800 text-xs sm:text-sm truncate block leading-tight">
                                {c.title}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                                <span className="text-zinc-900 font-bold">₹{c.price}</span>
                                <span>•</span>
                                <span>Enrolled {new Date(e.enrolledAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => triggerRevokeCourse(c._id, c.title)}
                            disabled={actionLoading === 'course-revoke'}
                            className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                            title="Revoke Course Access"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Grant Access Section */}
                <div className="bg-zinc-50/60 border border-zinc-100 p-4 rounded-xl space-y-3.5">
                  <div className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-zinc-700">Grant course access.</span>
                  </div>
                  
                  {grantableCourses.length === 0 ? (
                    <p className="text-xs text-zinc-400 font-medium italic">
                      This student is already enrolled in all available courses.
                    </p>
                  ) : (
                    <div className="flex gap-2 items-end sm:items-center flex-col sm:flex-row">
                      <div className="flex-1 w-full relative">
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 select-arrow"
                        >
                          <option value="">Choose a course to enroll...</option>
                          {grantableCourses.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.title} - ₹{c.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!selectedCourseId}
                        loading={actionLoading === 'course-grant'}
                        onClick={handleGrantCourseAccess}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 text-xs shrink-0 rounded-xl w-full sm:w-auto text-center flex justify-center"
                      >
                        Enroll Student
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-zinc-100 space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">Danger zone.</span>
                </div>
                <div className="p-5 border border-red-100 bg-red-50/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="font-bold text-zinc-900 text-sm">Delete student account.</h5>
                    <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                      Permanently erase this student profile, billing history, course progress tracking, and immediately invalidate all active login sessions.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteModalOpen(true)}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold px-4 py-2.5 text-xs shrink-0 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    Delete Profile
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-zinc-400">
              Failed to load profile record data.
            </div>
          )}
        </div>
      </div>

      {/* Confirm Revoke Access Modal */}
      <ConfirmModal
        isOpen={revokeCourseModalOpen}
        title="Revoke course access."
        message={`Are you sure you want to revoke ${student?.name}'s access to "${activeRevokeCourseTitle}"? This will terminate their registration in this course and delete their progress records.`}
        confirmText="Revoke Access"
        cancelText="Cancel"
        isDestructive={true}
        loading={actionLoading === 'course-revoke'}
        onConfirm={handleRevokeCourseAccess}
        onClose={() => {
          setRevokeCourseModalOpen(false)
          setActiveRevokeCourseId(null)
        }}
      />

      {/* Confirm Permanent Delete Student Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Permanently delete student."
        message={`Are you sure you want to permanently delete "${student?.name}" from the system? This action is absolute and cannot be undone.`}
        confirmText="Permanently Delete"
        cancelText="Keep Student"
        isDestructive={true}
        loading={actionLoading === 'student-delete'}
        onConfirm={handleDeleteStudent}
        onClose={() => setDeleteModalOpen(false)}
      />
    </>
  )

  // Local storage helper check if current user matches session ID to highlight it
  function sessionIdMatches(id: string) {
    if (typeof window === 'undefined') return false
    try {
      const token = localStorage.getItem('veolms_token')
      if (!token) return false
      // simple base64 payload extract
      const payloadBase64 = token.split('.')[1]
      const payload = JSON.parse(atob(payloadBase64))
      return payload.sessionId === id
    } catch {
      return false
    }
  }
}
