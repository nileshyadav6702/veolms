'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, UserCheck } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import StudentDetailDrawer from './StudentDetailDrawer'

interface Student {
  _id: string
  name: string
  email: string
  createdAt: string
  lastLogin?: string
  sessionCount?: number
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  // Drawer state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  // Filter students based on search string
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s._id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 sm:p-8 space-y-8 flex-1 w-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
            System Records
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-primary mt-1">Students.</h2>
          <p className="text-body text-xs mt-1">
            Registered profiles of all learners enrolled in your platform, including active devices & access permissions.
          </p>
        </div>
        <div className="text-xs text-gray-500 font-medium font-mono bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-lg w-fit">
          Registered Learners: <span className="font-bold text-zinc-900">{total}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search students by name, email, or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
          />
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button variant="outline" className="flex items-center gap-1.5 text-xs text-zinc-500 px-3 py-2 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={[
          { key: 'name', label: 'Full Name' },
          { key: 'email', label: 'Email Address' },
          { key: 'devices', label: 'Active Devices' },
          { key: 'lastActive', label: 'Last Login' },
          { key: 'joined', label: 'Registration Date' },
          { key: 'actions', label: 'Management', align: 'right' },
        ]}
        loading={loading}
        emptyMessage="No student records discovered in the database."
      >
        {filteredStudents.map((student) => (
          <tr 
            key={student._id} 
            className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
            onClick={() => {
              setSelectedStudentId(student._id)
              setDrawerOpen(true)
            }}
          >
            {/* Name */}
            <td className="px-6 py-4 font-bold text-gray-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 border border-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-zinc-950 block">{student.name}</span>
                  <span className="font-mono text-[9px] text-zinc-400 font-medium">{student._id}</span>
                </div>
              </div>
            </td>

            {/* Email */}
            <td className="px-6 py-4 font-medium text-zinc-600">{student.email}</td>

            {/* Devices / Sessions */}
            <td className="px-6 py-4 font-medium">
              {student.sessionCount !== undefined ? (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  student.sessionCount >= 2 
                    ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' 
                    : student.sessionCount === 1 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-zinc-50 text-zinc-400 border-zinc-100'
                }`}>
                  {student.sessionCount === 0 
                    ? 'Offline' 
                    : `${student.sessionCount} Active`
                  }
                </span>
              ) : (
                <span className="text-zinc-300">-</span>
              )}
            </td>

            {/* Last Login */}
            <td className="px-6 py-4 text-xs font-semibold text-zinc-600">
              {student.lastLogin ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>
                    {new Date(student.lastLogin).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-400 font-mono italic font-medium">Never</span>
              )}
            </td>

            {/* Date */}
            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
              {new Date(student.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </td>

            {/* Actions */}
            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudentId(student._id)
                  setDrawerOpen(true)
                }}
                className="text-[10px] font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 shrink-0 rounded-xl"
              >
                Manage Profile
              </Button>
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

      {/* Detail Slideover Drawer */}
      <StudentDetailDrawer
        studentId={selectedStudentId}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedStudentId(null)
        }}
        onStudentDeleted={() => {
          fetchStudents(1)
        }}
        onStudentUpdated={() => {
          fetchStudents(page)
        }}
      />
    </div>
  )
}
