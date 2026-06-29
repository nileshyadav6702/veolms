'use client'

import Link from 'next/link'
import { Star, Clock, BookOpen, Lock } from 'lucide-react'

export interface Course {
  _id: string
  title: string
  slug: string
  thumbnail?: string
  shortDescription: string
  instructor: string
  price: number
  totalLessons: number
  rating?: number
}

const GRADIENTS = [
  'from-develop-start to-develop-end',
  'from-preview-start to-preview-end',
  'from-ship-start to-ship-end',
  'from-violet to-highlight-pink',
]

export default function CourseCard({
  course,
  index = 0,
  hrefPrefix = '/courses',
  isPurchased = false,
}: {
  course: Course
  index?: number
  hrefPrefix?: string
  isPurchased?: boolean
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const rating = course.rating ?? 4.8
  const reviewCount = ['12.5K', '8.7K', '6.2K', '3.4K', '5.1K'][index % 5]
  const originalPrice = Math.round(course.price * 3.5)

  return (
    <Link href={`${hrefPrefix}/${course.slug}`} className="group block text-zinc-900">
      <div className="bg-white rounded-xl vercel-card-shadow hover:-translate-y-0.5 vercel-card-shadow-hover transition-all duration-200 overflow-hidden">
        {/* Thumbnail */}
        <div
          className={`relative w-full aspect-video bg-gradient-to-br ${gradient} overflow-hidden`}
        >
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white opacity-35" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-primary line-clamp-2 mb-1.5 group-hover:text-link transition-colors leading-snug">
            {course.title}
          </h3>
          <p className="text-xs text-body mb-3">{course.instructor}</p>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs font-bold text-amber-600">
              {rating.toFixed(1)}
            </span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i <= Math.round(rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-200 fill-zinc-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-mute">({reviewCount})</span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">{course.totalLessons} lessons</span>
          </div>

          {/* Price / Purchase status */}
          <div className="flex items-center justify-between border-t border-hairline pt-3 mt-1">
            {isPurchased ? (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs">
                ✓ Purchased
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">₹{course.price}</span>
                <span className="text-xs text-zinc-400 line-through">
                  ₹{originalPrice}
                </span>
              </div>
            )}
            {!isPurchased && (
              <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
