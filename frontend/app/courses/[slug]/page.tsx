'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Star,
  User,
  CheckCircle,
  AlertCircle,
  Play,
  X,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import CurriculumList, { Lesson, Section } from '@/components/courses/CurriculumList'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import Script from 'next/script'

interface CourseDetail {
  _id: string
  title: string
  slug: string
  thumbnail?: string
  description: string
  shortDescription: string
  instructor: string
  price: number
  currency: string
  sections: Section[]
  totalLessons: number
  totalDuration: number
}

export default function CourseDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const { user } = useAuth()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview')

  // Preview video state
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadCourseData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get(`/api/courses/${slug}`)
      setCourse(data.course)
      setLessons(data.lessons)

      if (user) {
        // If logged in, check if user is enrolled
        const enrollData = await api.get(`/api/enrollments/${data.course._id}`)
        setIsEnrolled(enrollData.enrolled)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load course details.')
    } finally {
      setLoading(false)
    }
  }, [slug, user])

  useEffect(() => {
    loadCourseData()
  }, [loadCourseData])

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${slug}`)
      return
    }

    if (!course) return

    try {
      setEnrollLoading(true)
      const data = await api.post('/api/payments/create-order', {
        courseId: course._id,
      })

      const orderId = data.order.id

      // If it is a mock order (dev bypass), simulate payment
      if (orderId.startsWith('order_mock_')) {
        // Auto-verify mock order after a brief delay
        setTimeout(async () => {
          try {
            await api.post('/api/payments/verify', {
              razorpayOrderId: orderId,
              razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
              razorpaySignature: 'mock_signature',
              courseId: course._id,
            })
            setIsEnrolled(true)
            router.push('/dashboard')
          } catch (err: any) {
            alert(err.message || 'Mock payment verification failed')
          } finally {
            setEnrollLoading(false)
          }
        }, 1200)
        return
      }

      // Standard Razorpay Flow
      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'VeoLMS',
        description: course.title,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            setEnrollLoading(true)
            await api.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              courseId: course._id,
            })
            setIsEnrolled(true)
            router.push('/dashboard')
          } catch (err: any) {
            alert(err.message || 'Payment verification failed')
          } finally {
            setEnrollLoading(false)
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#6366f1',
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
      setEnrollLoading(false)
    } catch (err: any) {
      alert(err.message || 'Failed to initialize enrollment.')
      setEnrollLoading(false)
    }
  }

  const handlePreviewPlay = async (lesson: Lesson) => {
    if (!user) {
      router.push(`/login?redirect=/courses/${slug}`)
      return
    }

    try {
      setPreviewLoading(true)
      setPreviewLesson(lesson)
      const data = await api.get(`/api/lessons/${lesson._id}/stream`)
      setPreviewUrl(data.url)
    } catch (err: any) {
      alert(err.message || 'Unable to play preview video.')
      setPreviewLesson(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewLesson(null)
    setPreviewUrl(null)
  }

  const handleCurriculumLessonClick = (lesson: Lesson) => {
    if (isEnrolled) {
      router.push(`/learn/${course?._id}/${lesson._id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <Spinner className="w-8 h-8" />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto my-20 p-6 bg-white rounded-xl border border-gray-100 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'Course not found.'}</p>
          <Button onClick={() => router.push('/courses')} variant="secondary" size="sm">
            Back to Courses
          </Button>
        </div>
        <Footer />
      </div>
    )
  }

  // Calculate stats
  const totalDurationMin = Math.round(course.totalDuration / 60)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Hero Header */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <button
            onClick={() => router.push('/courses')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider mb-6 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to courses
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Title / Description */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <Badge variant="purple">Programming</Badge>
                {isEnrolled && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Enrolled
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                {course.title}
              </h1>

              <p className="text-base sm:text-lg text-gray-500 mb-6 leading-relaxed">
                {course.shortDescription}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>Created by <span className="text-gray-900">{course.instructor}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span>{course.totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{totalDurationMin} mins total</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>4.8 rating</span>
                </div>
              </div>
            </div>

            {/* Price Card (Desktop: sticky, Mobile: stack) */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20 overflow-hidden" padding="none">
                <div className="aspect-video relative bg-slate-900 flex items-center justify-center">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-white/30" />
                  )}
                  {lessons.some((l) => l.isPreview) && (
                    <button
                      onClick={() => {
                        const preview = lessons.find((l) => l.isPreview)
                        if (preview) handlePreviewPlay(preview)
                      }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center group hover:bg-black/50 transition-colors"
                    >
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Play className="w-5 h-5 text-indigo-600 fill-indigo-600 ml-0.5" />
                      </div>
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">
                      ₹{course.price}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      ₹{Math.round(course.price * 3.5)}
                    </span>
                  </div>

                  {isEnrolled ? (
                    <Button
                      onClick={() => {
                        if (lessons.length > 0) {
                          router.push(`/learn/${course._id}/${lessons[0]._id}`)
                        }
                      }}
                      className="w-full justify-center"
                    >
                      Resume Learning
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnroll}
                      loading={enrollLoading}
                      className="w-full justify-center"
                    >
                      {user ? 'Enroll Now' : 'Log in to Enroll'}
                    </Button>
                  )}

                  <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                    100% money-back guarantee · Lifetime access to content
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs content */}
      <section className="flex-1 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {/* Tabs Headers */}
            <div className="flex border-b border-gray-100 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'curriculum'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Curriculum ({lessons.length})
              </button>
            </div>

            {/* Tabs Panels */}
            {activeTab === 'overview' ? (
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">About this course</h3>
                <div className="text-gray-600 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
                  {course.description}
                </div>
              </div>
            ) : (
              <CurriculumList
                sections={course.sections}
                lessons={lessons}
                isEnrolled={isEnrolled}
                onLessonClick={handleCurriculumLessonClick}
                onPreviewClick={handlePreviewPlay}
              />
            )}
          </div>
        </div>
      </section>

      {/* Free Preview Video Modal */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-100 w-full max-w-3xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div>
                <span className="font-mono text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                  Free Preview
                </span>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-md">
                  {previewLesson.title}
                </h3>
              </div>
              <button
                onClick={closePreview}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Box */}
            <div className="aspect-video bg-black relative flex items-center justify-center text-white">
              {previewLoading ? (
                <div className="text-center space-y-3">
                  <Spinner className="w-8 h-8 text-indigo-600 mx-auto" />
                  <p className="text-xs text-gray-400">Loading stream url...</p>
                </div>
              ) : previewUrl ? (
                <video
                  src={
                    previewUrl.includes('localhost:9000')
                      ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' // fallback for dummy public R2 URL
                      : previewUrl
                  }
                  className="w-full h-full"
                  controls
                  autoPlay
                />
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-400">Unable to load stream.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
