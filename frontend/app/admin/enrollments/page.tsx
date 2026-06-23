'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import DataTable from '@/components/admin/DataTable'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
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

export default function AdminEnrollmentsPage() {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchEnrollments = useCallback((pageNum: number) => {
    setLoading(true)
    api
      .get(`/api/admin/enrollments?page=${pageNum}&limit=12`)
      .then((data: { enrollments: Enrollment[]; total: number; totalPages: number; page: number }) => {
        setEnrollments(data.enrollments)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchEnrollments(1)
  }, [fetchEnrollments])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchEnrollments(newPage)
    }
  }

  return (
    <ProtectedRoute role="admin">
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <span className="font-mono text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                  Registry Panel
                </span>
                <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Enrollment Ledger</h1>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">
              Total enrollments: <span className="font-bold text-gray-900">{total}</span>
            </div>
          </div>

          {/* Enrollments Ledgers Data Table */}
          <DataTable
            columns={[
              { key: 'id', label: 'Order ID' },
              { key: 'student', label: 'Student Profile' },
              { key: 'course', label: 'Purchased Course' },
              { key: 'amount', label: 'Amount Paid' },
              { key: 'date', label: 'Enrollment Timestamp' },
            ]}
            loading={loading}
            emptyMessage="No enrollment transactions records found in system databases."
          >
            {enrollments.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                {/* ID */}
                <td className="px-6 py-4 font-mono text-xs text-gray-400">
                  {item._id}
                </td>

                {/* Student */}
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{item.userId?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400 font-medium">{item.userId?.email || 'N/A'}</span>
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
                <td className="px-6 py-4 text-gray-500">
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
            <div className="flex items-center justify-center gap-2 mt-8">
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

        <Footer />
      </div>
    </ProtectedRoute>
  )
}
