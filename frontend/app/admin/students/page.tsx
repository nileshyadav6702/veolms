'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import DataTable from '@/components/admin/DataTable'
import Button from '@/components/ui/Button'
import { api } from '@/lib/api'

interface Student {
  _id: string
  name: string
  email: string
  createdAt: string
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchStudents = useCallback((pageNum: number) => {
    setLoading(true)
    api
      .get(`/api/admin/students?page=${pageNum}&limit=12`)
      .then((data: { students: Student[]; total: number; totalPages: number; page: number }) => {
        setStudents(data.students)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setPage(data.page)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStudents(1)
  }, [fetchStudents])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchStudents(newPage)
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
                <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Student Directory</h1>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">
              Total learners: <span className="font-bold text-gray-900">{total}</span>
            </div>
          </div>

          {/* Students Directory Data Table */}
          <DataTable
            columns={[
              { key: 'id', label: 'Student ID' },
              { key: 'name', label: 'Full Name' },
              { key: 'email', label: 'Email Address' },
              { key: 'joined', label: 'Registration Date' },
            ]}
            loading={loading}
            emptyMessage="No student records discovered in the database."
          >
            {students.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50/50 transition-colors">
                {/* ID */}
                <td className="px-6 py-4 font-mono text-xs text-gray-400">
                  {student._id}
                </td>

                {/* Name */}
                <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                    {student.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{student.name}</span>
                </td>

                {/* Email */}
                <td className="px-6 py-4 font-medium">{student.email}</td>

                {/* Date */}
                <td className="px-6 py-4 text-gray-500">
                  {new Date(student.createdAt).toLocaleDateString(undefined, {
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
