'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, Calendar, ExternalLink, ShieldCheck, BookOpen } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/api'

interface Certificate {
  _id: string
  certificateCode: string
  issuedAt: string
  courseId: {
    _id: string
    title: string
    thumbnail: string
    instructor: string
    shortDescription: string
  }
}

export default function MyCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/certificates/my')
      .then((data) => {
        if (data.success) {
          setCerts(data.certificates || [])
        } else {
          setError('Failed to fetch certificates')
        }
      })
      .catch((err: any) => {
        console.error(err)
        setError(err.message || 'Unable to load certificates.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <main className="flex-1 py-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-8 bg-zinc-200 rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-zinc-200 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-100 rounded-xl border border-zinc-200 animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 py-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 flex items-center gap-2">
          <Award className="w-6 h-6 text-indigo-500" /> My Certificates
        </h1>
        <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed max-w-2xl font-sans">
          View, download, and verify your official course completion credentials. Share your achievements with the world.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {!error && certs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-zinc-200 rounded-2xl p-8 max-w-lg mx-auto shadow-sm">
          <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">No certificates claimed yet.</h3>
          <p className="text-zinc-500 text-xs max-w-xs mx-auto mb-6 leading-normal">
            Complete all curriculum modules in your enrolled courses to 100% to unlock your credential.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" className="bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs h-9 px-4 border-none shadow-sm cursor-pointer">
                Go to My Learning
              </Button>
            </Link>
            <Link href="/dashboard/courses">
              <Button size="sm" variant="outline" className="border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs h-9 px-4">
                Explore Catalog
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certs.map((cert) => {
            const course = cert.courseId
            return (
              <Card key={cert._id} padding="none" className="overflow-hidden border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div className="p-5 flex gap-4 items-start">
                  <div className="w-16 h-16 bg-zinc-50 rounded-lg overflow-hidden shrink-0 border border-zinc-100 flex items-center justify-center relative">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-zinc-300" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-zinc-950 text-sm truncate leading-tight group-hover:text-indigo-600 transition-colors" title={course.title}>
                      {course.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 truncate">
                      Instructor: {course.instructor}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded-md px-1.5 py-0.5 w-fit font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{cert.certificateCode}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 font-sans">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Claimed: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                  </div>
                  <Link href={`/certificates/${cert.certificateCode}`} target="_blank">
                    <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50 font-bold text-[11px] h-8 px-3 gap-1 shadow-none">
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
