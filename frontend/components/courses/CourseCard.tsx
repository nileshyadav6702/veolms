'use client'

import Link from 'next/link'
import { Star, Clock, BookOpen } from 'lucide-react'

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
  'from-slate-700 to-slate-900',
  'from-teal-600 to-teal-900',
  'from-emerald-600 to-emerald-900',
  'from-blue-700 to-blue-900',
  'from-violet-600 to-violet-900',
  'from-rose-600 to-rose-900',
]

export default function CourseCard({
  course,
  index = 0,
}: {
  course: Course
  index?: number
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const rating = course.rating ?? 4.8
  const reviewCount = ['12.5K', '8.7K', '6.2K', '3.4K', '5.1K'][index % 5]
  const originalPrice = Math.round(course.price * 3.5)

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
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
              <BookOpen className="w-12 h-12 text-white opacity-30" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors leading-snug">
            {course.title}
          </h3>
          <p className="text-xs text-gray-500 mb-2.5">{course.instructor}</p>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2.5">
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
                      : 'text-gray-200 fill-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">{course.totalLessons} lessons</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">₹{course.price}</span>
            <span className="text-xs text-gray-400 line-through">
              ₹{originalPrice}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
