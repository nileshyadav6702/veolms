'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, CheckCircle2, MessageSquare, AlertCircle, Calendar, Trash2, ShieldCheck, Heart } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { api } from '@/lib/api'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

interface ReviewUser {
  _id: string
  name: string
  avatar?: string
}

interface ReviewCourse {
  _id: string
  title: string
  slug: string
  thumbnail?: string
}

interface Review {
  _id: string
  userId: ReviewUser
  courseId: ReviewCourse
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

export default function CourseReviews() {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const router = useRouter()

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  // Writing review states
  const [purchasedCourses, setPurchasedCourses] = useState<ReviewCourse[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)

  // Fetch recent reviews across all courses
  const fetchReviews = async () => {
    try {
      const data = await api.get('/api/reviews?limit=12')
      if (data.success) {
        setReviews(data.reviews)
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Fetch user's purchased courses
  const fetchPurchasedCourses = async () => {
    if (!user) return
    setCoursesLoading(true)
    try {
      const data = await api.get('/api/enrollments')
      if (data.success) {
        const courses = data.enrollments
          .filter((e: any) => e.paymentStatus === 'paid' && e.courseId)
          .map((e: any) => e.courseId)
        setPurchasedCourses(courses)
        if (courses.length > 0) {
          setSelectedCourseId(courses[0]._id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch purchased courses:', err)
    } finally {
      setCoursesLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  useEffect(() => {
    if (user) {
      fetchPurchasedCourses()
    } else {
      setPurchasedCourses([])
      setSelectedCourseId('')
      setComment('')
      setExistingReviewId(null)
    }
  }, [user])

  // Check if review already exists for selected course
  useEffect(() => {
    if (!user || !selectedCourseId) {
      setExistingReviewId(null)
      return
    }

    const checkReviewStatus = async () => {
      setCheckLoading(true)
      try {
        const data = await api.get(`/api/reviews/can-review/${selectedCourseId}`)
        if (data.success && data.hasReviewed && data.review) {
          setRating(data.review.rating)
          setComment(data.review.comment)
          setExistingReviewId(data.review._id)
        } else {
          setRating(5)
          setComment('')
          setExistingReviewId(null)
        }
      } catch (err) {
        console.error('Failed to check review status:', err)
      } finally {
        setCheckLoading(false)
      }
    }

    checkReviewStatus()
  }, [selectedCourseId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) {
      toastError('Please select a course to review.')
      return
    }
    if (comment.trim().length < 10) {
      toastError('Review comment must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/api/reviews', {
        courseId: selectedCourseId,
        rating,
        comment: comment.trim(),
      })
      if (res.success) {
        toastSuccess(
          existingReviewId
            ? 'Your review has been updated!'
            : 'Thank you! Your review has been submitted.'
        )
        fetchReviews()
        setExistingReviewId(res.review._id)
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return
    try {
      const res = await api.del(`/api/reviews/${reviewId}`)
      if (res.success) {
        toastSuccess('Review deleted successfully.')
        fetchReviews()
        if (reviewId === existingReviewId) {
          setRating(5)
          setComment('')
          setExistingReviewId(null)
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to delete review.')
    }
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <section className="bg-canvas-soft border-t border-hairline py-24 w-full" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center mb-16">
          <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider block mb-2">
            Student Reviews
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-1.28px] text-primary">
            Real feedback from verified students.
          </h2>
          <p className="text-body text-sm sm:text-base max-w-xl mx-auto mt-3">
            Read what other engineers are saying about their learning experience or log in to leave your feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Block: Reviews List */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-lg font-semibold tracking-tight text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" /> Recent Reviews
            </h3>

            {reviewsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-hairline vercel-card-shadow">
                <Spinner className="w-8 h-8 text-indigo-600" />
                <p className="text-xs text-mute mt-4 font-mono">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-xl border border-hairline vercel-card-shadow">
                <Heart className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-primary">No reviews yet</p>
                <p className="text-xs text-body mt-1">Be the first verified student to write a review!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.map((r) => {
                  const isOwnReview = user && r.userId?._id === user.id
                  return (
                    <Card
                      key={r._id}
                      padding="sm"
                      className="border border-hairline bg-white rounded-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Rating Stars & Delete Option */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < r.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-zinc-200'
                                }`}
                              />
                            ))}
                          </div>
                          {isOwnReview && (
                            <button
                              onClick={() => handleDelete(r._id)}
                              className="text-zinc-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                              title="Delete my review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Comment */}
                        <p className="text-xs text-body leading-relaxed mb-4 italic break-words">
                          "{r.comment}"
                        </p>
                      </div>

                      {/* Profile & Metadata */}
                      <div className="mt-auto pt-3 border-t border-hairline flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span className="font-medium text-indigo-600 font-mono tracking-tight max-w-[150px] truncate">
                            {r.courseId?.title || 'Unknown Course'}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {formatDate(r.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-canvas-soft-2 border border-hairline flex items-center justify-center font-bold text-primary text-[10px] select-none font-sans shrink-0">
                            {getInitials(r.userId?.name || 'User')}
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-primary truncate max-w-[120px]">
                              {r.userId?.name || 'Verified Student'}
                            </h4>
                            <span
                              className="flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono shrink-0"
                              title="Verified purchase"
                            >
                              <ShieldCheck className="w-2.5 h-2.5" /> Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Block: Form/Gate */}
          <div className="lg:col-span-5">
            <h3 className="text-lg font-semibold tracking-tight text-primary flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-indigo-600" /> Review This Platform
            </h3>

            {!user ? (
              /* GATED: Not Logged In */
              <Card padding="lg" className="border border-hairline bg-white rounded-xl text-center">
                <div className="w-12 h-12 bg-canvas-soft-2 border border-hairline rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-zinc-400" />
                </div>
                <h4 className="text-sm font-bold text-primary mb-1">Have you taken a course?</h4>
                <p className="text-xs text-body leading-relaxed mb-6">
                  Sign in to your student account to write a verified review. Reviews are restricted to students who have purchased courses.
                </p>
                <Button
                  variant="primary"
                  className="w-full text-xs font-semibold py-2.5"
                  onClick={() => router.push(`/login?callback=/#reviews`)}
                >
                  Sign In to Review
                </Button>
              </Card>
            ) : coursesLoading ? (
              /* LOADING ENROLLMENTS */
              <Card padding="lg" className="border border-hairline bg-white rounded-xl text-center py-12">
                <Spinner className="w-6 h-6 text-indigo-600 mx-auto" />
                <p className="text-xs text-mute mt-3 font-mono">Checking your purchases...</p>
              </Card>
            ) : purchasedCourses.length === 0 ? (
              /* NO COURSES PURCHASED */
              <Card padding="lg" className="border border-hairline bg-white rounded-xl text-center">
                <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h4 className="text-sm font-bold text-primary mb-1">No courses purchased</h4>
                <p className="text-xs text-body leading-relaxed mb-6">
                  Only verified purchasers can leave reviews to maintain feedback integrity. Head over to our catalog to enroll in a course!
                </p>
                <Button
                  variant="secondary"
                  className="w-full text-xs font-semibold py-2.5"
                  onClick={() => router.push('/courses')}
                >
                  Browse Courses
                </Button>
              </Card>
            ) : (
              /* LOGGED IN & HAS PURCHASED */
              <Card padding="md" className="border border-hairline bg-white rounded-xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">
                      1. Select Course
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full h-10 border border-gray-205 hover:border-gray-300 rounded-lg bg-white px-3 text-xs text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                      required
                    >
                      {purchasedCourses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">
                      2. Star Rating
                    </label>
                    <div className="flex gap-1 items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors duration-150 ${
                              star <= (hoverRating ?? rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-zinc-200'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-mono font-bold text-zinc-500 ml-2">
                        {rating} / 5
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                        3. Your Feedback
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {comment.trim().length} chars
                      </span>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write your review here. What was your favorite module? Did it help you build projects? (Min. 10 characters)"
                      className="w-full min-h-[100px] border border-gray-200 hover:border-gray-300 rounded-lg bg-white p-3 text-xs text-gray-900 placeholder:text-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent leading-relaxed"
                      required
                      minLength={10}
                      maxLength={1000}
                      disabled={checkLoading || submitting}
                    />
                  </div>

                  {existingReviewId && (
                    <div className="flex items-start gap-2 bg-indigo-50/55 p-3 rounded-lg border border-indigo-100/50">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-indigo-800 leading-relaxed">
                        You have already reviewed this course. Submitting this form will update your existing rating and comment.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full text-xs font-semibold py-2.5"
                    loading={submitting || checkLoading}
                    disabled={comment.trim().length < 10}
                  >
                    {existingReviewId ? 'Update Review' : 'Submit Review'}
                  </Button>
                </form>
              </Card>
            )}
          </div>

        </div>

      </div>
    </section>
  )
}
