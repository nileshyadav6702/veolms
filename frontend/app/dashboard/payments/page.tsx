'use client'

import { useEffect, useState, useCallback } from 'react'
import { CreditCard, Calendar, CheckCircle2, ChevronRight, RefreshCw, FileText } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

interface EnrolledCourse {
  _id: string
  title: string
  price: number
}

interface EnrollmentData {
  _id: string
  courseId: EnrolledCourse
  enrolledAt: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
}

export default function StudentPaymentsPage() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([])
  const [loading, setLoading] = useState(true)

  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/enrollments')
      setEnrollments(data.enrollments || [])
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadBillingData()
    }
  }, [user, loadBillingData])

  return (
    <div className="p-6 sm:p-8 w-full space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-hairline rounded-xl p-6 sm:p-8 vercel-card-shadow">
        <div>
          <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Billing & Payments
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mt-1">
            Transaction Receipts.
          </h1>
          <p className="text-body text-xs mt-1">
            Access invoice summaries, transaction keys, and registration dates for your purchased courses.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBillingData}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Records
        </Button>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center py-20 bg-white border border-hairline rounded-xl vercel-card-shadow">
          <Spinner className="w-8 h-8 text-indigo-600" />
        </Card>
      ) : enrollments.length > 0 ? (
        <Card className="p-6 bg-white border border-hairline rounded-xl vercel-card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft font-mono font-bold text-mute uppercase tracking-wider">
                  <th className="p-4">Purchased Course</th>
                  <th className="p-4">Billing Date</th>
                  <th className="p-4">Payment Reference ID</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {enrollments.map((enroll) => (
                  <tr key={enroll._id} className="hover:bg-canvas-soft/40 transition-colors">
                    <td className="p-4 font-semibold text-primary">
                      {enroll.courseId.title}
                    </td>
                    <td className="p-4 text-zinc-600 font-medium">
                      {new Date(enroll.enrolledAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-mute font-medium">
                      {enroll.razorpayPaymentId || enroll.razorpayOrderId || 'Completed Sandbox'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-emerald-600 font-bold uppercase text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                        Success
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-primary text-right">
                      ₹{enroll.courseId.price?.toLocaleString() || '999'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-16 bg-white border border-hairline rounded-xl p-8 vercel-card-shadow">
          <div className="w-12 h-12 bg-canvas-soft-2 rounded-full flex items-center justify-center mx-auto mb-4 text-primary border border-hairline">
            <FileText className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-bold text-primary mb-1">No transaction records found.</h3>
          <p className="text-mute text-xs max-w-sm mx-auto">
            Once you enroll or purchase any premium courses, your invoicing details will appear here.
          </p>
        </Card>
      )}
    </div>
  )
}
