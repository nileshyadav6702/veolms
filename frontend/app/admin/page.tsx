'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Shield,
} from 'lucide-react'
import StatsCard from '@/components/admin/StatsCard'
import AdminCharts from '@/components/admin/AdminCharts'
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

interface ChartDataPoint {
  label: string
  revenue: number
  enrollments: number
}

interface CourseDataPoint {
  name: string
  count: number
  percentage: number
  color: string
}

interface ChartData {
  data7d: ChartDataPoint[]
  data30d: ChartDataPoint[]
  data12m: ChartDataPoint[]
  courseData: CourseDataPoint[]
  topCourseName: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/admin/dashboard')
      .then((data: { stats: DashboardStats; chartData: ChartData }) => {
        setStats(data.stats)
        setChartData(data.chartData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 flex-1 w-full">
      {/* Header Title */}
      <div>
        <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
          System Analytics
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-primary mt-1">Overview.</h2>
        <p className="text-body text-xs mt-1">
          A real-time display of student registrations, course catalogs, and sales ledgers.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={<Users className="w-4 h-4 text-zinc-500" />}
          description="Enrolled platform users"
          trend={{ value: '+12%', positive: true }}
        />
        <StatsCard
          title="Total Courses"
          value={stats?.totalCourses ?? 0}
          icon={<BookOpen className="w-4 h-4 text-zinc-500" />}
          description="Configured items"
        />
        <StatsCard
          title="Total Enrollments"
          value={stats?.totalEnrollments ?? 0}
          icon={<CreditCard className="w-4 h-4 text-zinc-500" />}
          description="Processed checkouts"
          trend={{ value: '+5%', positive: true }}
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${stats?.totalRevenue ?? 0}`}
          icon={<TrendingUp className="w-4 h-4 text-zinc-500" />}
          description="Net sales volume"
          trend={{ value: '+24%', positive: true }}
        />
      </div>

      {/* Analytics Charts & Distributions */}
      <AdminCharts chartData={chartData} />

      {/* Manage shortcuts cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
        <Card className="flex flex-col justify-between" padding="md">
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-1.5">Manage Courses</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6">
              Create new courses, edit lesson titles, section lists, upload video keys, and publish courses to the library.
            </p>
          </div>
          <Link href="/admin/courses">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Configure Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between" padding="md">
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-1.5">Student Registry</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6">
              View all registered students in the system, search profiles, check enrollment history, and track user emails.
            </p>
          </div>
          <Link href="/admin/students">
            <Button variant="outline" size="sm" className="w-full text-xs">
              View User Directory <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between" padding="md">
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-1.5">Sales & Orders</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6">
              Browse payment transaction records, review course purchase order IDs, transaction timestamps, and payment statuses.
            </p>
          </div>
          <Link href="/admin/enrollments">
            <Button variant="outline" size="sm" className="w-full text-xs">
              Audit Transactions <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
