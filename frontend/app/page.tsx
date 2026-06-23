'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  BookOpen,
  Award,
  Infinity as InfinityIcon,
  Play,
  Star,
  ArrowRight,
  Sparkles,
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
    color: 'bg-zinc-100 text-zinc-900',
    title: 'Expert instructors.',
    desc: 'Learn from active industry professionals with real-world engineering experience.',
  },
  {
    icon: Play,
    color: 'bg-zinc-100 text-zinc-900',
    title: 'Flexible pacing.',
    desc: 'Learn at your own pace, anytime and anywhere, with lifetime course access.',
  },
  {
    icon: Award,
    color: 'bg-zinc-100 text-zinc-900',
    title: 'Verified credentials.',
    desc: 'Earn certificates of completion to showcase your skills on your portfolio.',
  },
  {
    icon: Sparkles,
    color: 'bg-zinc-100 text-zinc-900',
    title: 'Stark curriculum.',
    desc: 'Get hands-on coding experience with modern frameworks and tools.',
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
      if (search.trim()) {
        router.push(`/courses?search=${encodeURIComponent(search.trim())}`)
      }
    },
    [search, router]
  )

  return (
    <div className="min-h-screen flex flex-col bg-canvas-soft">
      <Navbar />

      {/* ── Hero Band ── */}
      <section className="relative overflow-hidden vercel-mesh-gradient border-b border-hairline py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-hairline rounded-full shadow-sm text-xs font-mono font-medium text-zinc-500 mb-8">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span>Introducing VeoLMS 2.0</span>
          </div>

          {/* Vercel Stark Sentence-case Period-terminated Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-2.4px] text-primary leading-[1.05] mb-6 max-w-4xl mx-auto">
            Learn anything.<br />Ship faster.
          </h1>

          <p className="text-base sm:text-lg text-body max-w-2xl mx-auto mb-10 leading-relaxed">
            The developer learning platform. Learn programming, system design, and database architectures from industry experts.
          </p>

          {/* Search bar inside Hero */}
          <form onSubmit={handleSearch} className="flex gap-2.5 max-w-md mx-auto mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="What do you want to learn?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-full border border-hairline text-sm text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm"
              />
            </div>
            <Button type="submit" size="md" pill>
              Search
            </Button>
          </form>

          {/* CTA Row */}
          <div className="flex justify-center items-center gap-4 flex-wrap mb-14">
            <Link href="/signup">
              <Button size="lg" variant="primary" pill>
                Start Learning Free
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="lg" variant="secondary" pill>
                Browse Catalog
              </Button>
            </Link>
          </div>

          {/* Trust logos */}
          <div>
            <span className="font-mono text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-4">
              Trusted by developers at
            </span>
            <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap opacity-50 grayscale">
              {TRUST_LOGOS.map((name) => (
                <span key={name} className="text-sm font-semibold tracking-wider font-mono text-zinc-600">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid Strip ── */}
      <section className="bg-white border-b border-hairline py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-hairline shadow-sm shrink-0 ${f.color}`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Courses ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
              Explore library
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-1.28px] text-primary mt-1">
              Popular courses.
            </h2>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-xs font-semibold text-link hover:underline transition-colors uppercase tracking-wider font-mono"
          >
            All courses <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <CourseGrid courses={courses} loading={loading} cols={3} />
      </section>

      {/* ── CTA Polarity-Flipped Band (Dark Mode Contrast) ── */}
      <section className="bg-primary text-white border-t border-zinc-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative overflow-hidden">
          {/* Mesh backdrop on dark */}
          <div className="absolute inset-0 bg-radial-gradient from-zinc-800/20 via-transparent to-transparent opacity-50 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider mb-4 block">
              Enroll today
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-1.28px] text-white mb-4">
              Start learning today.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mb-10 max-w-md mx-auto">
              Join thousands of developers leveling up their careers on VeoLMS.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/signup">
                <Button
                  variant="secondary"
                  size="lg"
                  pill
                  className="font-semibold px-8"
                >
                  Get Started Free
                </Button>
              </Link>
              <Link href="/courses">
                <Button
                  variant="ghost"
                  size="lg"
                  pill
                  className="text-white border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 font-semibold px-8"
                >
                  Browse Courses
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
