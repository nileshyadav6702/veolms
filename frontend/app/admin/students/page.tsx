'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'

interface Student {
  _id: string
  name: string
  email: string
  createdAt: string
}

export default function AdminStudentsPage() {
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
    <div className="p-6 sm:p-8 space-y-8 flex-1 w-full">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
            System Records
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-primary mt-1">Students.</h2>
          <p className="text-body text-xs mt-1">
            Registered profiles of all learners enrolled in your platform.
          </p>
        </div>
        <div className="text-xs text-gray-500 font-medium font-mono">
          Total: <span className="font-bold text-gray-900">{total}</span>
        </div>
      </div>

      {/* Table */}
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
            <td className="px-6 py-4 font-bold text-gray-900">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-canvas-soft-2 border border-hairline text-primary rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
                <span>{student.name}</span>
              </div>
            </td>

            {/* Email */}
            <td className="px-6 py-4 font-medium">{student.email}</td>

            {/* Date */}
            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
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
