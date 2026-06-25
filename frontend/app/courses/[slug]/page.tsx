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
  Sparkles,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import CurriculumList, { Lesson, Section } from '@/components/courses/CurriculumList'
import VideoPlayer from '@/components/video/VideoPlayer'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import Script from 'next/script'
import Input from '@/components/ui/Input'

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
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollmentDetails, setEnrollmentDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview')

  // Preview video state
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewSubtitles, setPreviewSubtitles] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  // Mock checkout sandbox states
  const [showMockGateway, setShowMockGateway] = useState(false)
  const [mockOrderId, setMockOrderId] = useState('')
  const [mockProcessing, setMockProcessing] = useState(false)

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
        setEnrollmentDetails(enrollData.enrollment)
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

      // Ensure Razorpay SDK is dynamically loaded
      if (!(window as any).Razorpay) {
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
              if ((window as any).Razorpay) {
                clearInterval(interval);
                resolve();
              }
            }, 50);
            setTimeout(() => {
              clearInterval(interval);
              resolve();
            }, 5000);
          });
        }
        if (!(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.async = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'))
            document.body.appendChild(script)
          })
        }
      }

      const data = await api.post('/api/payments/create-order', {
        courseId: course._id,
      })

      const orderId = data.order.id

      // If it is a mock order (dev bypass), open mock payment gateway modal
      if (orderId.startsWith('order_mock_')) {
        setMockOrderId(orderId)
        setShowMockGateway(true)
        setEnrollLoading(false)
        return
      }

      // Standard Razorpay Flow
      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'VeoLMS',
        description: `Course Enrollment`,
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
        modal: {
          ondismiss: function () {
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
      setPreviewSubtitles([])
      const data = await api.get(`/api/lessons/${lesson._id}/stream`)
      setPreviewUrl(data.url)
      setPreviewSubtitles(data.subtitles || [])
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
    setPreviewSubtitles([])
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
        
        {/* Skeleton Hero Header */}
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="h-4 bg-gray-200 rounded w-28 mb-6 animate-pulse" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left Column Skeleton */}
              <div className="lg:col-span-2 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
                <div className="h-9 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-9 bg-gray-200 rounded w-1/2 animate-pulse" />
                <div className="space-y-2 pt-4">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-6">
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
                  <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-5 bg-gray-200 rounded w-28 animate-pulse" />
                </div>
              </div>
              
              {/* Right Column Skeleton (Price Card) */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="aspect-video bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                  </div>
                  <div className="h-10 bg-gray-200 rounded-lg w-full animate-pulse" />
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Skeleton Bottom Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
                <div className="h-12 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-12 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-12 bg-gray-200 rounded w-full animate-pulse" />
              </div>
            </div>
          </div>
        </section>

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
                    <>
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
                      
                      <div className="mt-4 pt-4 border-t border-hairline bg-canvas-soft p-3 rounded-lg text-left text-xs space-y-1.5 font-medium text-zinc-700">
                        <p className="font-mono text-[9px] text-mute uppercase font-bold tracking-wider mb-1">Receipt details</p>
                        <div className="flex justify-between">
                          <span className="text-mute">Status</span>
                          <span className="text-emerald-600 font-bold uppercase text-[10px]">Paid</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-mute">Price Paid</span>
                          <span className="font-semibold text-primary">₹{course.price}</span>
                        </div>
                        {enrollmentDetails?.razorpayPaymentId && (
                          <div className="flex justify-between">
                            <span className="text-mute">Payment Ref</span>
                            <span className="font-mono text-[10px] text-primary truncate max-w-[130px]">{enrollmentDetails.razorpayPaymentId}</span>
                          </div>
                        )}
                        {enrollmentDetails?.enrolledAt && (
                          <div className="flex justify-between">
                            <span className="text-mute">Purchase Date</span>
                            <span className="text-primary">{new Date(enrollmentDetails.enrolledAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </>
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

      {/* simulated Vercel-style mock payment gateway modal */}
      {showMockGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white overflow-hidden shadow-2xl relative border border-hairline" padding="lg">
            <div className="flex items-center justify-between pb-4 border-b border-hairline mb-6">
              <div>
                <span className="font-mono text-[9px] text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Simulated Gateway
                </span>
                <h3 className="font-bold text-gray-900 text-lg mt-1">Mock Payment Sandbox</h3>
              </div>
              <button
                onClick={() => {
                  setShowMockGateway(false)
                  setMockOrderId('')
                }}
                className="p-1 rounded bg-canvas-soft hover:bg-canvas-soft-2 text-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-canvas-soft border border-hairline rounded-xl space-y-2 text-xs">
                <p className="text-[10px] text-mute font-bold uppercase tracking-wider font-mono">Invoice Summary</p>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-primary truncate max-w-[220px]">{course?.title}</span>
                  <span className="text-primary">₹{course?.price}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-mute font-mono mt-1">
                  <span>Order Ref</span>
                  <span className="truncate max-w-[150px]">{mockOrderId}</span>
                </div>
              </div>

              {/* simulated card payment fields */}
              <div className="space-y-4">
                <Input
                  label="Simulated Card Number"
                  placeholder="4111 1111 1111 1111"
                  defaultValue="4111 1111 1111 1111"
                  readOnly
                  className="bg-canvas-soft cursor-not-allowed font-mono text-xs"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Date"
                    placeholder="12/29"
                    defaultValue="12/29"
                    readOnly
                    className="bg-canvas-soft cursor-not-allowed font-mono text-xs"
                  />
                  <Input
                    label="CVV"
                    placeholder="123"
                    defaultValue="123"
                    readOnly
                    className="bg-canvas-soft cursor-not-allowed font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-4 border-t border-hairline">
                <Button
                  onClick={async () => {
                    try {
                      setMockProcessing(true)
                      await api.post('/api/payments/verify', {
                        razorpayOrderId: mockOrderId,
                        razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
                        razorpaySignature: 'mock_signature',
                        courseId: course?._id,
                      })
                      setIsEnrolled(true)
                      // Refetch course details to update receipt info
                      const enrollData = await api.get(`/api/enrollments/${course?._id}`)
                      setEnrollmentDetails(enrollData.enrollment)
                      setShowMockGateway(false)
                      setMockOrderId('')
                      router.push('/dashboard')
                    } catch (err: any) {
                      alert(err.message || 'Mock payment verification failed')
                    } finally {
                      setMockProcessing(false)
                    }
                  }}
                  loading={mockProcessing}
                  className="w-full justify-center text-xs h-11"
                >
                  Authorize Mock Checkout (Simulate Success)
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMockGateway(false)
                    setMockOrderId('')
                  }}
                  disabled={mockProcessing}
                  className="w-full justify-center text-xs h-11 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  Cancel Authorization (Simulate Failure)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    
      {/* Free Preview Video Modal */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden w-full max-w-3xl relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4.5 border-b border-zinc-900 bg-zinc-900/60 backdrop-blur-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">
                  Free Preview Lesson
                </span>
                <h3 className="font-bold text-zinc-100 text-sm sm:text-base truncate max-w-[280px] sm:max-w-md">
                  {previewLesson.title}
                </h3>
              </div>
              <button
                onClick={closePreview}
                className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all duration-300 hover:rotate-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Box */}
            <div className="aspect-video bg-zinc-950 relative flex items-center justify-center text-zinc-400">
              {previewLoading ? (
                <div className="text-center space-y-4">
                  <Spinner className="w-8 h-8 text-indigo-500 mx-auto" />
                  <p className="text-xs text-zinc-500 font-medium">Resolving secure HLS stream...</p>
                </div>
              ) : previewUrl ? (
                <VideoPlayer
                  src={previewUrl}
                  subtitles={previewSubtitles}
                  className="w-full h-full"
                  autoPlay
                />
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-sm text-zinc-500">Failed to load video stream.</p>
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
