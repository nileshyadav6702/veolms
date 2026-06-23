'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CourseGrid from '@/components/courses/CourseGrid'
import Button from '@/components/ui/Button'
import { api } from '@/lib/api'
import { Course } from '@/components/courses/CourseCard'

function CourseListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchCourses = useCallback((term: string, pageNum: number) => {
    setLoading(true)
    const query = new URLSearchParams()
    if (term) query.set('search', term)
    query.set('page', pageNum.toString())
    query.set('limit', '9') // 9 courses per page

    api
      .get(`/api/courses?${query.toString()}`)
      .then((data: { courses: Course[]; total: number; totalPages: number; page: number }) => {
        setCourses(data.courses)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Refetch when initialSearch or page changes
  useEffect(() => {
    fetchCourses(initialSearch, 1)
    setSearch(initialSearch)
    setPage(1)
  }, [initialSearch, fetchCourses])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = new URLSearchParams()
    if (search.trim()) {
      query.set('search', search.trim())
    }
    router.push(`/courses?${query.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchCourses(search, newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Eyebrow & Title */}
      <div className="mb-8">
        <span className="font-mono text-[12px] text-indigo-600 font-semibold uppercase tracking-wider">
          Explore Library
        </span>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">All Courses</h1>
        <p className="text-gray-500 text-sm mt-1">
          Learn from experts, build real-world applications, and boost your tech career.
        </p>
      </div>

      {/* Search & Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by course title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
          <Button type="submit" size="sm" className="px-5">
            Search
          </Button>
        </form>

        <div className="text-xs sm:text-sm text-gray-500 font-medium">
          {!loading && (
            <span>
              Showing {courses.length} of {total} {total === 1 ? 'course' : 'courses'}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <CourseGrid courses={[]} loading={true} cols={3} />
      ) : courses.length > 0 ? (
        <CourseGrid courses={courses} loading={false} cols={3} />
      ) : (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Courses Found</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            We couldn't find any courses matching your search term. Try searching for something else.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearch('')
              router.push('/courses')
            }}
          >
            Clear Search
          </Button>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1
              const isCurrent = p === page
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function CoursesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
            <div className="animate-pulse space-y-6">
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-10 bg-gray-200 rounded w-1/3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <CourseListContent />
      </Suspense>
      <Footer />
    </div>
  )
}
