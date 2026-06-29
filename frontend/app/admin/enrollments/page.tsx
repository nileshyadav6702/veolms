'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Search, Calendar, BookOpen } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'

interface Enrollment {
  _id: string
  userId: {
    name: string
    email: string
  }
  courseId: {
    title: string
    price: number
  }
  enrolledAt: string
}

interface Course {
  _id: string
  title: string
}

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters State
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [dateFilterType, setDateFilterType] = useState('all') // all, today, yesterday, 7d, 30d, custom
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Fetch all courses for the dropdown filter on mount
  useEffect(() => {
    api
      .get('/api/admin/courses')
      .then((data: { courses: Course[] }) => {
        setCourses(data.courses || [])
      })
      .catch(() => {})
  }, [])

  // Unified fetch function
  const executeFetch = useCallback((pageNum: number) => {
    setLoading(true)
    const query = new URLSearchParams()
    query.set('page', pageNum.toString())
    query.set('limit', '12')

    if (search.trim()) {
      query.set('search', search.trim())
    }
    if (courseFilter) {
      query.set('courseId', courseFilter)
    }

    let computedStart: Date | null = null
    let computedEnd: Date | null = null
    const now = new Date()

    if (dateFilterType === 'today') {
      computedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      computedEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (dateFilterType === 'yesterday') {
      computedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      computedEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
    } else if (dateFilterType === '7d') {
      computedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    } else if (dateFilterType === '30d') {
      computedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
    } else if (dateFilterType === 'custom') {
      if (customStartDate) {
        computedStart = new Date(customStartDate)
      }
      if (customEndDate) {
        const d = new Date(customEndDate)
        computedEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      }
    }

    if (computedStart) {
      query.set('startDate', computedStart.toISOString())
    }
    if (computedEnd) {
      query.set('endDate', computedEnd.toISOString())
    }

    api
      .get(`/api/admin/enrollments?${query.toString()}`)
      .then((data: { enrollments: Enrollment[]; total: number; totalPages: number; page: number }) => {
        setEnrollments(data.enrollments)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, courseFilter, dateFilterType, customStartDate, customEndDate])

  // Reset to page 1 and trigger fetching on filter changes (with a 300ms debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      executeFetch(1)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [search, courseFilter, dateFilterType, customStartDate, customEndDate, executeFetch])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      executeFetch(newPage)
    }
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 flex-1 w-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
            System Records
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-primary mt-1">Enrollment Ledger.</h2>
          <p className="text-body text-xs mt-1">
            Paid orders and transaction history for platform access.
          </p>
        </div>
        <div className="text-xs text-gray-500 font-medium font-mono">
          Total: <span className="font-bold text-gray-900">{total}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-xl border border-hairline shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Student */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
            />
          </div>

          {/* Course filter */}
          <div className="relative">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-zinc-700 transition-all appearance-none cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Date Filter Type */}
          <div className="relative">
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-zinc-700 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateFilterType === 'custom' && (
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-dashed border-zinc-100 animate-fade-in">
            <div className="w-full sm:w-auto flex items-center gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono shrink-0">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-zinc-700"
              />
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono shrink-0">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-zinc-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={[
          { key: 'index', label: '#' },
          { key: 'student', label: 'Student Profile' },
          { key: 'course', label: 'Purchased Course' },
          { key: 'amount', label: 'Amount Paid' },
          { key: 'date', label: 'Enrollment Date' },
        ]}
        loading={loading}
        emptyMessage="No enrollment transaction records found in the system databases."
      >
        {enrollments.map((item, index) => (
          <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
            {/* Index / Serial Number */}
            <td className="px-6 py-4 font-semibold text-xs text-zinc-500">
              {(page - 1) * 12 + index + 1}
            </td>

            {/* Student */}
            <td className="px-6 py-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">{item.userId?.name || 'Unknown'}</span>
                <span className="text-xs text-gray-400 font-mono font-medium">{item.userId?.email || 'N/A'}</span>
              </div>
            </td>

            {/* Course */}
            <td className="px-6 py-4 font-semibold text-gray-900 truncate max-w-xs">
              {item.courseId?.title || 'Deleted Course'}
            </td>

            {/* Amount */}
            <td className="px-6 py-4 font-mono font-bold text-emerald-600">
              ₹{item.courseId?.price || 0}
            </td>

            {/* Date */}
            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
              {new Date(item.enrolledAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </td>
          </tr>
        ))}
      </DataTable>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 font-medium">
            Page {page} of {totalPages}
          </span>
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
