'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  BookOpen,
  Award,
  Infinity,
  Play,
  Star,
  ArrowRight,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import CourseGrid from '@/components/courses/CourseGrid'
import { api } from '@/lib/api'
import { Course } from '@/components/courses/CourseCard'

const FEATURES = [
  {
    icon: BookOpen,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Expert Instructors',
    desc: 'Learn from industry experts with real-world experience.',
  },
  {
    icon: Play,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Flexible Learning',
    desc: 'Learn at your own pace, anytime and anywhere.',
  },
  {
    icon: Award,
    color: 'bg-amber-100 text-amber-600',
    title: 'Certificate of Completion',
    desc: 'Earn certificates to showcase your new skills.',
  },
  {
    icon: Infinity,
    color: 'bg-blue-100 text-blue-600',
    title: 'Lifetime Access',
    desc: 'Get lifetime access to every course you purchase.',
  },
]

const TRUST_LOGOS = ['Google', 'Microsoft', 'Amazon', 'Spotify', 'Adobe']

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    api
      .get('/api/courses?limit=6')
      .then((data: { courses: Course[] }) => setCourses(data.courses))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (search.trim()) router.push(`/courses?search=${encodeURIComponent(search.trim())}`)
    },
    [search, router]
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full px-4 py-1.5 mb-6">
                <Star className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
                #1 Online Learning Platform
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Learn New Skills,{' '}
                <span className="text-indigo-600">Advance Your Career</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Learn from expert instructors with 1000+ online courses in
                programming, design, business, and more.
              </p>

              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="What do you want to learn?"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                  />
                </div>
                <Button type="submit" size="lg" variant="primary">
                  Search
                </Button>
              </form>

              {/* Trust */}
              <div>
                <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
                  Trusted by Learners and Teams
                </p>
                <div className="flex items-center gap-6 flex-wrap">
                  {TRUST_LOGOS.map((name) => (
                    <span key={name} className="text-sm font-semibold text-gray-300">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — decorative */}
            <div className="hidden lg:block relative">
              {/* Big gradient blob */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-full blur-3xl opacity-70" />
              </div>

              {/* Decorative card */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="w-72 h-72 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <BookOpen className="w-24 h-24 text-white opacity-80" />
                </div>
              </div>

              {/* Floating stat chips */}
              <div className="absolute top-4 -left-4 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 border border-gray-100 z-20">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">10K+</p>
                  <p className="text-xs text-gray-500">Online Courses</p>
                </div>
              </div>

              <div className="absolute bottom-4 -right-4 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 border border-gray-100 z-20">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">50K+</p>
                  <p className="text-xs text-gray-500">Happy Students</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Popular Courses</h2>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View all courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <CourseGrid courses={courses} loading={loading} cols={3} />
      </section>

      {/* CTA Band */}
      <section className="bg-indigo-600 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start Learning Today
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Join thousands of students already learning on VeoLMS.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup">
              <Button
                variant="secondary"
                size="lg"
                pill
                className="font-semibold"
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/courses">
              <Button
                variant="ghost"
                size="lg"
                pill
                className="text-white hover:text-white hover:bg-indigo-700 font-semibold"
              >
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
