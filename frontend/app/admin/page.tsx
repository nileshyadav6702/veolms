'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  LayoutDashboard,
  Shield,
  ArrowRight,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import StatsCard from '@/components/admin/StatsCard'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'

interface DashboardStats {
  totalStudents: number
  totalCourses: number
  totalEnrollments: number
  totalRevenue: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/admin/dashboard')
      .then((data: { stats: DashboardStats }) => {
        setStats(data.stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <ProtectedRoute role="admin">
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
                  System Console
                </span>
                <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Admin Panel</h1>
              </div>
            </div>

            {/* Quick Nav Links */}
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <Link href="/admin/courses">
                <Button variant="secondary" size="sm">
                  Courses
                </Button>
              </Link>
              <Link href="/admin/students">
                <Button variant="secondary" size="sm">
                  Students
                </Button>
              </Link>
              <Link href="/admin/enrollments">
                <Button variant="secondary" size="sm">
                  Enrollments
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Spinner className="w-8 h-8" />
            </div>
          ) : (
            <div className="space-y-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Students"
                  value={stats?.totalStudents ?? 0}
                  icon={<Users className="w-5 h-5 text-indigo-600" />}
                  description="Enrolled learners"
                  trend={{ value: '+12%', positive: true }}
                />
                <StatsCard
                  title="Total Courses"
                  value={stats?.totalCourses ?? 0}
                  icon={<BookOpen className="w-5 h-5 text-teal-600" />}
                  description="Curriculum catalog"
                />
                <StatsCard
                  title="Total Enrollments"
                  value={stats?.totalEnrollments ?? 0}
                  icon={<CreditCard className="w-5 h-5 text-amber-600" />}
                  description="Paid orders"
                  trend={{ value: '+5%', positive: true }}
                />
                <StatsCard
                  title="Total Revenue"
                  value={`₹${stats?.totalRevenue ?? 0}`}
                  icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                  description="Net course sales"
                  trend={{ value: '+24%', positive: true }}
                />
              </div>

              {/* Action Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex flex-col justify-between" padding="md">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Manage Courses</h3>
                    <p className="text-gray-500 text-xs leading-relaxed mb-6">
                      Create new courses, edit lesson titles, section lists, upload video keys, and publish courses to the library.
                    </p>
                  </div>
                  <Link href="/admin/courses">
                    <Button variant="outline" size="sm" className="w-full">
                      Configure Catalog <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </Card>

                <Card className="flex flex-col justify-between" padding="md">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Student Registry</h3>
                    <p className="text-gray-500 text-xs leading-relaxed mb-6">
                      View all registered students in the system, search profiles, check enrollment history, and track user emails.
                    </p>
                  </div>
                  <Link href="/admin/students">
                    <Button variant="outline" size="sm" className="w-full">
                      View User Directory <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </Card>

                <Card className="flex flex-col justify-between" padding="md">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Sales & Orders</h3>
                    <p className="text-gray-500 text-xs leading-relaxed mb-6">
                      Browse payment transaction records, review course purchase order IDs, transaction timestamps, and payment statuses.
                    </p>
                  </div>
                  <Link href="/admin/enrollments">
                    <Button variant="outline" size="sm" className="w-full">
                      Audit Transactions <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </Card>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}
