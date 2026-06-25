'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  BookOpen,
  Award,
  Play,
  Star,
  ArrowRight,
  Sparkles,
  Database,
  Cloud,
  FileCode,
  CheckCircle2,
  Tv,
  Clock,
  Volume2,
  Maximize,
  VolumeX,
  Code2,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import CourseGrid from '@/components/courses/CourseGrid'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { Course } from '@/components/courses/CourseCard'

const TRUST_LOGOS = ['Google', 'Microsoft', 'Amazon', 'Spotify', 'Adobe']

const CATEGORY_TABS = [
  {
    id: 'frontend',
    label: 'Frontend',
    icon: Code2,
    courseTitle: 'Next.js App Router Masterclass',
    description: 'Learn to build production-ready user interfaces using React, Next.js Server Components, Tailwind CSS, and state managers.',
    lessons: [
      { id: 'f1', title: 'Course introduction & project architecture', duration: '12:45' },
      { id: 'f2', title: 'Deep dive into Client vs Server Components', duration: '24:10' },
      { id: 'f3', title: 'Optimizing layouts & route handlers', duration: '18:35' },
      { id: 'f4', title: 'Streaming UI & Suspense integration', duration: '15:20' }
    ]
  },
  {
    id: 'backend',
    label: 'Backend',
    icon: Database,
    courseTitle: 'Production REST APIs in Go',
    description: 'Build fast, concurrent backend microservices in Go. Connect SQL databases, implement middleware, and manage security.',
    lessons: [
      { id: 'b1', title: 'Go runtime & routing basics with Chi router', duration: '15:30' },
      { id: 'b2', title: 'Structured SQL queries & PostgreSQL integration', duration: '28:15' },
      { id: 'b3', title: 'Implementing robust JWT auth & session middleware', duration: '22:40' },
      { id: 'b4', title: 'Writing integration tests & server benchmarking', duration: '19:10' }
    ]
  },
  {
    id: 'sysdesign',
    label: 'System Design',
    icon: Tv,
    courseTitle: 'Distributed Systems & Scaling',
    description: 'Master systems architectural design. Learn load balancing, Redis caching strategies, database sharding, and messaging.',
    lessons: [
      { id: 's1', title: 'Introduction to horizontal & vertical scaling', duration: '14:20' },
      { id: 's2', title: 'Designing distributed caching with Redis clusters', duration: '31:50' },
      { id: 's3', title: 'Message queues with RabbitMQ and Kafka basics', duration: '26:10' },
      { id: 's4', title: 'Designing scalable chat & payment APIs', duration: '29:45' }
    ]
  },
  {
    id: 'devops',
    label: 'Cloud & DevOps',
    icon: Cloud,
    courseTitle: 'Docker & Kubernetes in Production',
    description: 'Learn to build container images, configure Kubernetes manifests, manage networks, and implement GitOps pipelines.',
    lessons: [
      { id: 'd1', title: 'Understanding container layers and Dockerfiles', duration: '11:15' },
      { id: 'd2', title: 'Kubernetes Pods, Deployments & Service manifests', duration: '27:40' },
      { id: 'd3', title: 'Configuring Ingress controllers & SSL certificates', duration: '20:05' },
      { id: 'd4', title: 'Designing automated GitHub Actions CI/CD pipelines', duration: '18:50' }
    ]
  }
]

// Mock video playlist for the interactive player mockup
const VIDEO_PLAYLIST = [
  { id: 'v1', title: '01. Setting up the database schema', duration: '14:25', active: true },
  { id: 'v2', title: '02. Configuring Next.js environment variables', duration: '08:10', active: false },
  { id: 'v3', title: '03. Writing database connection pool logic', duration: '12:35', active: false },
  { id: 'v4', title: '04. Designing modern UI with Tailwind classes', duration: '20:15', active: false },
  { id: 'v5', title: '05. Publishing code & setting up deployments', duration: '10:50', active: false },
]

const TESTIMONIALS = [
  {
    quote: "VeoLMS Next.js masterclass is the single best resource I have found online. The lesson outline is structured perfectly, making it easy to reference segments on routing and state optimization during my daily dev work.",
    author: "Sarah Connor",
    role: "Senior Frontend Engineer @ Microsoft",
    initials: "SC",
    rating: 5,
  },
  {
    quote: "The System Design course was exactly what I needed to prepare for my systems architect interviews. The distributed scaling patterns are explained clearly without any fluff.",
    author: "David Chen",
    role: "Staff Software Engineer @ Amazon",
    initials: "DC",
    rating: 5,
  },
  {
    quote: "I purchased the Go REST API course and was blown away by the depth of PostgreSQL connection pooling and JWT auth middleware. Absolute value for money!",
    author: "Elena Rostova",
    role: "Backend Lead @ Stripe",
    initials: "ER",
    rating: 5,
  },
  {
    quote: "The Docker & Kubernetes course layout is outstanding. The lessons are brief, high-impact, and directly applicable. I migrated our team's deployment configurations in a week.",
    author: "James Kowalski",
    role: "DevOps Architect @ Red Hat",
    initials: "JK",
    rating: 5,
  },
  {
    quote: "The video quality and distraction-free player interface make studying an absolute joy. Saving progress timestamp works flawlessly across my desktop and mobile.",
    author: "Li Na",
    role: "Full-Stack Developer @ Spotify",
    initials: "LN",
    rating: 5,
  },
  {
    quote: "Highly practical examples. I was able to download the starter code repositories and follow along line-by-line while watching the videos. Recommended for all active devs.",
    author: "Marcus Aurelius",
    role: "Software Engineer @ Adobe",
    initials: "MA",
    rating: 5,
  }
]

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Interactive categories explorer state
  const [activeCategory, setActiveCategory] = useState('frontend')

  // Interactive video player states
  const [activeVideo, setActiveVideo] = useState(VIDEO_PLAYLIST[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoProgress, setVideoProgress] = useState(35) // start at 35%
  const [isMuted, setIsMuted] = useState(false)

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

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSelectVideo = (video: typeof VIDEO_PLAYLIST[0]) => {
    setActiveVideo(video)
    setIsPlaying(true)
    setVideoProgress(0) // restart progress
  }

  const activeCategoryContent = CATEGORY_TABS.find((t) => t.id === activeCategory) || CATEGORY_TABS[0]

  return (
    <div className="min-h-screen flex flex-col bg-canvas-soft font-sans overflow-x-hidden">
      <Navbar />

      {/* ── 1. Hero Band (Atmospheric glows, stark typography) ── */}
      <section className="relative overflow-hidden vercel-mesh-gradient border-b border-hairline py-20 lg:py-32">
        {/* Glow Blobs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-hairline rounded-full shadow-sm text-xs font-mono font-medium text-body mb-8 hover:border-hairline-strong transition-colors cursor-pointer">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span>Introducing VeoLMS 2.0. Learn programming & system design.</span>
          </div>

          {/* Vercel Display XL Title (Sentence-case, period-terminated, weight 600) with Gradient Highlights */}
          <h1 className="text-5xl sm:text-7xl lg:text-[90px] font-semibold tracking-[-2.5px] sm:tracking-[-4.5px] text-primary leading-[0.9] mb-6 max-w-5xl mx-auto">
            Learn anything.<br />
            <span className="bg-gradient-to-r from-develop-start via-preview-start to-highlight-pink bg-clip-text text-transparent">Watch and master.</span>
          </h1>

          <p className="text-base sm:text-lg text-body max-w-2xl mx-auto mb-10 leading-relaxed">
            High-quality structured video courses designed for developers. Purchase your course, study from industry experts, and build real engineering projects at your own pace.
          </p>

          {/* Search bar inside Hero */}
          <form onSubmit={handleSearch} className="flex gap-2.5 max-w-md mx-auto mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search backend, react, design..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-full border border-hairline text-sm text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white shadow-sm transition-all"
              />
            </div>
            <Button type="submit" size="md" pill>
              Search
            </Button>
          </form>

          {/* CTA Row */}
          <div className="flex justify-center items-center gap-4 flex-wrap mb-16">
            <Link href="/courses">
              <Button size="lg" variant="primary" pill className="px-8 font-semibold">
                Explore All Courses
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="secondary" pill className="px-8 font-semibold">
                Create Account
              </Button>
            </Link>
          </div>

          {/* Trust logos strip */}
          <div>
            <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-5">
              Trusted by software engineers at
            </span>
            <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap opacity-40 grayscale hover:opacity-60 transition-opacity duration-200">
              {TRUST_LOGOS.map((name) => (
                <span key={name} className="text-sm font-semibold tracking-widest font-mono text-zinc-700">
                  {name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. Feature Grid Strip ── */}
      <section className="bg-white border-b border-hairline py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-hairline shadow-sm shrink-0 bg-canvas-soft text-primary">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                  Expert instructors.
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Learn from active software engineers and systems architects working at leading global companies.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-hairline shadow-sm shrink-0 bg-canvas-soft text-primary">
                <Play className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                  Lifetime access.
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Pay once per course, watch lessons anytime, and receive access to future syllabus upgrades.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-hairline shadow-sm shrink-0 bg-canvas-soft text-primary">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                  Shareable proof.
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Earn digital completion certificates on finishing courses to showcase on your portfolio.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-hairline shadow-sm shrink-0 bg-canvas-soft text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                  Project files included.
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Download repository resources, coding templates, and references used throughout the videos.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. Interactive Category Curriculum Explorer ── */}
      <section className="bg-canvas-soft border-b border-hairline py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider block mb-2">
              Syllabus Tracks
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-1.28px] text-primary">
              Structured pathways for engineering.
            </h2>
            <p className="text-body text-sm sm:text-base max-w-xl mx-auto mt-3">
              Choose your domain, explore individual lessons, purchase, and begin watching immediately.
            </p>
          </div>

          {/* tab-ghost pills navigation */}
          <div className="flex justify-center mb-10 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex gap-1.5 bg-canvas-soft-2 p-1 rounded-full border border-hairline shrink-0">
              {CATEGORY_TABS.map((tab) => {
                const TabIcon = tab.icon
                const isActive = activeCategory === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-body hover:text-primary hover:bg-white/50'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Display Tab Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
            {/* Info pane */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <Badge variant="purple" className="self-start px-3 py-1 text-[11px] font-mono tracking-wider font-semibold">
                {activeCategoryContent.label.toUpperCase()} COURSE
              </Badge>
              <h3 className="text-2xl font-semibold tracking-[-0.96px] text-primary">
                {activeCategoryContent.courseTitle}.
              </h3>
              <p className="text-sm text-body leading-relaxed">
                {activeCategoryContent.description}
              </p>

              <div className="mt-4">
                <Link href={`/courses?search=${activeCategoryContent.label}`}>
                  <Button variant="primary" size="md" pill className="font-semibold gap-1">
                    Buy Course <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mock Course Video Player list pane */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-hairline rounded-xl overflow-hidden shadow-xl w-full">
                
                {/* Course outline title */}
                <div className="bg-canvas-soft px-4 py-3 flex items-center justify-between border-b border-hairline select-none">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-semibold text-primary">Course Syllabus</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase bg-canvas-soft-2 px-2.5 py-0.5 rounded border border-hairline">
                    {activeCategoryContent.lessons.length} lessons
                  </span>
                </div>

                {/* Video Playlist elements */}
                <div className="divide-y divide-hairline">
                  {activeCategoryContent.lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-canvas-soft-2/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-xs font-mono text-zinc-400">0{idx + 1}</span>
                        <Play className="w-3 h-3 text-indigo-500" />
                        <span className="text-xs font-medium text-primary line-clamp-1">{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[10px] font-mono text-zinc-500">{lesson.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Console footer */}
                <div className="bg-canvas-soft-2 px-4 py-3 flex items-center justify-between border-t border-hairline">
                  <span className="text-[10px] font-mono text-zinc-400">Requires course purchase to unlock full playlist</span>
                  <span className="text-[10px] font-semibold text-indigo-600">Video Player Included</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. Interactive Video Player Showcase Band (Watch & Learn) ── */}
      <section className="bg-primary text-white border-b border-zinc-900 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-zinc-800/30 via-transparent to-transparent opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Copy Pane */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <span className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                Video Player Console
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-1.28px] text-white">
                Stark, distraction-free player.
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                Study with our custom video player designed entirely for developers. Track your progress, skip chapters easily, download project materials, and watch in HD quality.
              </p>

              <div className="space-y-4 mt-2">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Play className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Interactive Syllabus Navigation</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">Jump to specific lessons instantly using the right-side outline menu without leaving the lecture.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Remember Lecture Progress</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">VeoLMS saves your exact timestamp, letting you pick up precisely where you left off on any screen.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Interactive Video Player */}
            <div className="lg:col-span-7 w-full">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[420px]">
                
                {/* IDE-like Top bar */}
                <div className="bg-zinc-900 border-b border-zinc-850 px-4 py-3 flex items-center justify-between select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/70" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <span className="w-3 h-3 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">veolms_player - Lesson Preview</span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 border border-zinc-800 bg-zinc-950 px-2 py-0.5 rounded">
                    PREVIEW PLAYING
                  </span>
                </div>

                {/* IDE Body (Sidebar + Code Editor) */}
                <div className="flex flex-1 overflow-hidden">
                  
                  {/* Left Mock Video Screen */}
                  <div className="flex-1 bg-black flex flex-col relative group justify-between p-4 overflow-hidden">
                    {/* Atmospheric video background overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-zinc-950 to-pink-950/20 pointer-events-none" />
                    
                    {/* Top status overlay */}
                    <div className="relative z-10 flex items-center justify-between text-white/70 select-none">
                      <span className="text-[10px] font-mono tracking-wider font-semibold">Ch 03 / Course Config</span>
                      <span className="text-[10px] font-mono">1080p HD</span>
                    </div>

                    {/* Middle Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <button
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all shadow-lg scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        {isPlaying ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="w-1 h-5 bg-white rounded-sm" />
                            <span className="w-1 h-5 bg-white rounded-sm" />
                          </div>
                        ) : (
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        )}
                      </button>
                    </div>

                    {/* Interactive Video Playing Canvas Simulation */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {isPlaying ? (
                        <div className="flex items-center gap-1.5 select-none opacity-40">
                          <span className="text-xs font-mono font-bold tracking-widest text-indigo-400">STREAMING</span>
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold tracking-widest text-zinc-600 select-none">VIDEO PAUSED</span>
                      )}
                    </div>

                    {/* Bottom controls panel */}
                    <div className="relative z-10 bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-sm rounded-lg p-2.5 flex flex-col gap-2">
                      {/* Timeline bar */}
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const clickX = e.clientX - rect.left
                          const width = rect.width
                          setVideoProgress(Math.round((clickX / width) * 100))
                        }}
                        className="h-1 bg-zinc-800 rounded-full w-full relative cursor-pointer group"
                      >
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${videoProgress}%` }}
                        />
                        <div
                          className="w-2 h-2 bg-indigo-400 rounded-full absolute -top-0.5 shadow-md hidden group-hover:block transition-all"
                          style={{ left: `${videoProgress}%` }}
                        />
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center justify-between text-zinc-300">
                        <div className="flex items-center gap-3">
                          <button onClick={togglePlay} className="hover:text-white transition-colors cursor-pointer">
                            <Play className="w-3.5 h-3.5 text-zinc-300" />
                          </button>
                          
                          {/* Volume control */}
                          <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white transition-colors cursor-pointer">
                            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-300" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-300" />}
                          </button>
                          
                          <span className="text-[10px] font-mono select-none">
                            {Math.floor((parseInt(activeVideo.duration.split(':')[0]) * videoProgress) / 100)}:
                            {String(Math.floor((parseInt(activeVideo.duration.split(':')[1]) * videoProgress) / 100)).padStart(2, '0')}{' '}
                            / {activeVideo.duration}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 select-none">
                          <span className="text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer">1.0x</span>
                          <Maximize className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Course Playlist outline (interactive select) */}
                  <div className="w-48 bg-zinc-900 border-l border-zinc-850 p-3 flex flex-col gap-2 shrink-0 select-none hidden sm:flex">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Syllabus
                    </span>
                    <div className="space-y-1 overflow-y-auto flex-1">
                      {VIDEO_PLAYLIST.map((video) => {
                        const isSelected = activeVideo.id === video.id
                        return (
                          <button
                            key={video.id}
                            onClick={() => handleSelectVideo(video)}
                            className={`w-full flex flex-col px-2 py-1.5 rounded cursor-pointer transition-colors text-left ${
                              isSelected
                                ? 'bg-zinc-800 text-white'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                            }`}
                          >
                            <span className="text-[11px] font-medium font-mono line-clamp-2 leading-tight">
                              {video.title}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500 mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {video.duration}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* Active Playing Video Title display bar */}
                <div className="bg-zinc-900 px-4 py-2.5 flex items-center justify-between border-t border-zinc-850">
                  <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Now Playing: <strong className="text-zinc-200">{activeVideo.title}</strong></span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">Lesson Length: {activeVideo.duration}</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. Popular Courses Grid (Real Data) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
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

      {/* ── 6. Testimonials Section (Wall of Love) ── */}
      <section className="bg-white border-t border-hairline py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider block mb-2">
              Wall of Love
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-1.28px] text-primary">
              Loved by software engineers.
            </h2>
            <p className="text-body text-sm sm:text-base max-w-xl mx-auto mt-3">
              Here is what developers are saying about learning and leveling up their engineering skills on VeoLMS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {TESTIMONIALS.map((t, idx) => (
              <Card key={idx} padding="md" className="flex flex-col border border-hairline bg-white rounded-xl hover:-translate-y-0.5 transition-all duration-200">
                {/* Rating stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-body leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>

                {/* Profile */}
                <div className="flex items-center gap-3.5 mt-auto pt-4 border-t border-hairline">
                  <div className="w-9 h-9 rounded-full bg-canvas-soft-2 border border-hairline flex items-center justify-center font-bold text-primary text-xs shrink-0 select-none font-sans">
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">{t.author}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* ── 7. Pricing Rhythm (Single course vs All-Access pass) ── */}
      <section className="bg-canvas-soft border-t border-b border-hairline py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider block mb-2">
              Subscription
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-1.28px] text-primary">
              Simple, developer-friendly pricing.
            </h2>
            <p className="text-body text-sm sm:text-base max-w-xl mx-auto mt-3">
              Purchase individual courses for lifetime updates, or subscribe to get instant access to our entire catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            
            {/* Plan 1: Individual Course */}
            <Card padding="lg" className="flex flex-col border border-hairline bg-white rounded-xl">
              <div className="flex-1">
                <span className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                  PAY PER COURSE
                </span>
                <h3 className="text-4xl font-semibold text-primary tracking-tight mt-2.5">
                  ₹499<span className="text-sm font-normal text-zinc-400"> / avg</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Lifetime course access</p>
                <p className="text-xs sm:text-sm text-body leading-relaxed mt-4">
                  Purchase specific individual courses you need. Study at your own pace with lifetime updates.
                </p>
                
                <div className="border-t border-hairline my-6" />
                
                <ul className="space-y-3.5">
                  {[
                    'Full lifetime access to purchased course',
                    'Downloadable repository files & templates',
                    'Interactive video syllabus navigation',
                    'Digital certificate of completion',
                    'Submit Q&A queries to instructors'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/courses">
                  <Button variant="secondary" size="md" pill className="w-full font-semibold">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Plan 2: Pro All-Access (Featured, Polarity-flipped) */}
            <div className="flex flex-col bg-primary text-white border border-zinc-900 rounded-xl p-8 relative shadow-xl transform lg:-translate-y-2">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                FEATURED
              </div>

              <div className="flex-1">
                <span className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                  ALL-ACCESS PASS
                </span>
                <div className="flex items-baseline gap-1 mt-2.5">
                  <span className="text-4xl font-semibold text-white tracking-tight">₹999</span>
                  <span className="text-xs text-zinc-500">/ month</span>
                </div>
                <p className="text-xs text-indigo-400 mt-1">Unlock all current & future courses</p>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mt-4">
                  For software engineers who want full continuous learning. Access every single video course in our catalog.
                </p>
                
                <div className="border-t border-zinc-800 my-6" />
                
                <ul className="space-y-3.5">
                  {[
                    'Instant access to all video courses',
                    'Unlock all new courses released monthly',
                    'Interactive video syllabus navigation',
                    'Certificates for every course completed',
                    'Downloadable code repositories & slides'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-200 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/signup">
                  <button className="w-full py-2 bg-white text-primary hover:bg-zinc-100 transition-colors rounded-full font-semibold text-sm text-center shadow-sm cursor-pointer">
                    Subscribe Now
                  </button>
                </Link>
              </div>
            </div>

            {/* Plan 3: Team Pass */}
            <Card padding="lg" className="flex flex-col border border-hairline bg-white rounded-xl">
              <div className="flex-1">
                <span className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                  TEAM PASS
                </span>
                <h3 className="text-4xl font-semibold text-primary tracking-tight mt-2.5">
                  Custom
                </h3>
                <p className="text-xs text-zinc-400 mt-1">For teams and bootcamps</p>
                <p className="text-xs sm:text-sm text-body leading-relaxed mt-4">
                  Group licenses for engineering teams, bootcamps, or organizations seeking custom learning dashboard access.
                </p>
                
                <div className="border-t border-hairline my-6" />
                
                <ul className="space-y-3.5">
                  {[
                    'All-Access passes for your team members',
                    'Central billing and subscription management',
                    'Analytics reports of course completion rates',
                    'Custom cohort tracks onboarding configuration',
                    'Priority support channels for engineers'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link href="mailto:support@veolms.com">
                  <Button variant="secondary" size="md" pill className="w-full font-semibold">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </Card>

          </div>
        </div>
      </section>

      {/* ── 8. CTA Contrast Band ── */}
      <section className="bg-primary text-white border-t border-zinc-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center relative overflow-hidden">
          {/* Mesh backdrop on dark */}
          <div className="absolute inset-0 bg-radial-gradient from-zinc-800/20 via-transparent to-transparent opacity-50 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider mb-4 block">
              Enroll today
            </span>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-1.28px] sm:tracking-[-2px] text-white leading-tight mb-4">
              Start learning today.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mb-10 max-w-md mx-auto leading-relaxed">
              Join thousands of developers leveling up their engineering careers on VeoLMS.
            </p>
            
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/courses">
                <Button
                  variant="secondary"
                  size="lg"
                  pill
                  className="font-semibold px-8 hover:bg-zinc-100"
                >
                  Browse Courses
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="ghost"
                  size="lg"
                  pill
                  className="text-white border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/60 font-semibold px-8"
                >
                  Create Account
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
