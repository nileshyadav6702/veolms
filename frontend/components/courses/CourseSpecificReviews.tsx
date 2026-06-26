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

interface Review {
  _id: string
  userId: ReviewUser
  courseId: {
    _id: string
    title: string
  }
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

interface CourseSpecificReviewsProps {
  courseId: string
  isEnrolled?: boolean
  onReviewUpdated?: () => void
}

export default function CourseSpecificReviews({ 
  courseId, 
  isEnrolled = false,
  onReviewUpdated 
}: CourseSpecificReviewsProps) {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const router = useRouter()

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  // Permission/Existing review state
  const [canReview, setCanReview] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)

  // Write review states
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch reviews for this course
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      const data = await api.get(`/api/reviews?courseId=${courseId}&limit=50`)
      if (data.success) {
        setReviews(data.reviews)
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Check if current user can review this course
  const checkReviewPermission = async () => {
    if (!user) {
      setCanReview(false)
      setExistingReviewId(null)
      return
    }
    setCheckLoading(true)
    try {
      const data = await api.get(`/api/reviews/can-review/${courseId}`)
      if (data.success) {
        setCanReview(data.canReview)
        if (data.hasReviewed && data.review) {
          setRating(data.review.rating)
          setComment(data.review.comment)
          setExistingReviewId(data.review._id)
        } else {
          setRating(5)
          setComment('')
          setExistingReviewId(null)
        }
      }
    } catch (err) {
      console.error('Failed to check review permission:', err)
    } finally {
      setCheckLoading(false)
    }
  }

  useEffect(() => {
    if (courseId) {
      fetchReviews()
      checkReviewPermission()
    }
  }, [courseId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (comment.trim().length < 10) {
      toastError('Review comment must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/api/reviews', {
        courseId,
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
        if (onReviewUpdated) {
          onReviewUpdated()
        }
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
        if (onReviewUpdated) {
          onReviewUpdated()
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

  // Calculate statistics
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-8">
      {/* Overview stats block */}
      <div className="bg-white border border-hairline rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="text-center md:text-left">
          <h3 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">Overall Rating</h3>
          <div className="flex items-baseline gap-2 justify-center md:justify-start mt-2">
            <span className="text-5xl font-black text-gray-900 tracking-tight">{averageRating}</span>
            <span className="text-sm font-semibold text-zinc-400">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center md:justify-start mt-2.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(Number(averageRating))
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-zinc-500">
              ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>

        <div className="h-px w-full md:h-16 md:w-px bg-hairline" />

        <div className="flex-1 w-full max-w-md">
          {/* Visual distribution chart */}
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter(r => r.rating === stars).length
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-3 font-mono font-bold text-zinc-500">{stars}</span>
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-zinc-400 font-medium">
                  {pct.toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: reviews list */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" /> Student Reviews ({totalReviews})
          </h3>

          {reviewsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-hairline shadow-sm">
              <Spinner className="w-6 h-6 text-indigo-600" />
              <p className="text-[11px] text-mute mt-3 font-mono">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-2xl border border-hairline shadow-sm">
              <Heart className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-900">No reviews yet</p>
              <p className="text-[11px] text-zinc-500 mt-1">Be the first verified student to share your feedback!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {reviews.map((r) => {
                const isOwnReview = user && r.userId?._id === user.id
                return (
                  <Card
                    key={r._id}
                    padding="md"
                    className="border border-hairline bg-white rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
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

                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed italic break-words mb-3">
                        "{r.comment}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-hairline pt-3 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-[10px] select-none font-sans shrink-0">
                          {getInitials(r.userId?.name || 'User')}
                        </div>
                        <div className="flex items-center gap-1">
                          <h4 className="text-[11px] font-bold text-gray-900">
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
                      
                      <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                        <Calendar className="w-3 h-3" />
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column: write/update review form */}
        <div className="lg:col-span-5">
          <h3 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Share Your Thoughts
          </h3>

          {!user ? (
            <Card padding="md" className="border border-hairline bg-white rounded-xl text-center py-8">
              <div className="w-10 h-10 bg-canvas-soft border border-hairline rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-5 h-5 text-zinc-400" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 mb-1">Taken this course?</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed mb-5">
                Sign in to your student account to write a review. Only verified students who purchased this course can write reviews.
              </p>
              <Button
                variant="primary"
                className="w-full text-xs font-semibold py-2"
                onClick={() => router.push(`/login?redirect=${window.location.pathname}`)}
              >
                Sign In to Review
              </Button>
            </Card>
          ) : checkLoading ? (
            <Card padding="md" className="border border-hairline bg-white rounded-xl text-center py-10">
              <Spinner className="w-5 h-5 text-indigo-600 mx-auto" />
              <p className="text-[10px] text-mute mt-3 font-mono">Checking permissions...</p>
            </Card>
          ) : !canReview ? (
            <Card padding="md" className="border border-hairline bg-white rounded-xl text-center py-8">
              <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 mb-1">Enrollment Required</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Only verified purchasers can leave reviews to maintain feedback integrity. Please purchase or enroll in this course to leave feedback.
              </p>
            </Card>
          ) : (
            <Card padding="md" className="border border-hairline bg-white rounded-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                    Star Rating
                  </label>
                  <div className="flex gap-1 items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-0.5 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Your Feedback
                    </label>
                    <span className="text-[9px] text-zinc-400 font-mono">
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
                    disabled={submitting}
                  />
                </div>

                {existingReviewId && (
                  <div className="flex items-start gap-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-indigo-800 leading-normal">
                      You have already reviewed this course. Submitting this form will update your existing rating and comment.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-semibold py-2"
                  loading={submitting}
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
  )
}
