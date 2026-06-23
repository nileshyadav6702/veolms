'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function AdminEnrollmentsPage() {
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

      {/* Table */}
      <DataTable
        columns={[
          { key: 'id', label: 'Order ID' },
          { key: 'student', label: 'Student Profile' },
          { key: 'course', label: 'Purchased Course' },
          { key: 'amount', label: 'Amount Paid' },
          { key: 'date', label: 'Enrollment Date' },
        ]}
        loading={loading}
        emptyMessage="No enrollment transaction records found in the system databases."
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
