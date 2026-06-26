'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Award,
  Download,
  Share2,
  CheckCircle,
  Copy,
  ArrowLeft,
  Calendar,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'

interface CertificateData {
  certificateCode: string
  issuedAt: string
  userId: {
    _id: string
    name: string
  }
  courseId: {
    _id: string
    title: string
    certificateTemplate?: {
      title: string
      subTitle: string
      bodyText: string
      instructorName: string
      instructorTitle: string
      logoUrl?: string
      signatureUrl?: string
      primaryColor?: string
      accentColor?: string
    }
  }
}

export default function PublicCertificateView() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cert, setCert] = useState<CertificateData | null>(null)

  const loadCertificate = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get(`/api/certificates/verify/${code}`)
      if (data.success && data.certificate) {
        setCert(data.certificate)
      } else {
        setError('Certificate not found.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Invalid or expired certificate code.')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    if (code) {
      loadCertificate()
    }
  }, [code, loadCertificate])

  const copyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Certificate link copied to clipboard!')
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-zinc-950 min-h-screen text-white">
        <Spinner className="w-8 h-8 text-white" />
        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-4">
          Verifying Credential...
        </p>
      </div>
    )
  }

  if (error || !cert) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-950 min-h-screen text-white text-center">
        <div className="w-16 h-16 bg-red-950/30 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white mb-2">
          Invalid Credential
        </h1>
        <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
          {error || 'This certificate code is invalid or has been revoked by the system administrator.'}
        </p>
        <Link href="/dashboard">
          <Button size="sm" className="bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs h-9 px-4">
            Go to Student Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // Fallback defaults
  const template = cert.courseId.certificateTemplate || {
    title: 'Certificate of Completion',
    subTitle: 'This is to certify that',
    bodyText: 'has successfully completed the course',
    instructorName: 'Course Instructor',
    instructorTitle: 'Instructor',
    logoUrl: '',
    signatureUrl: '',
    primaryColor: '#000000',
    accentColor: '#3b82f6'
  }

  const primaryColor = template.primaryColor || '#000000'
  const accentColor = template.accentColor || '#3b82f6'
  const isDarkTheme = primaryColor === '#000000' || primaryColor === '#030712' || primaryColor === '#0f172a'
  const textColor = isDarkTheme ? '#ffffff' : '#0f172a'
  const descColor = isDarkTheme ? 'rgba(255, 255, 255, 0.65)' : '#4b5563'
  const metaColor = isDarkTheme ? 'rgba(255, 255, 255, 0.45)' : '#6b7280'
  const borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans relative">
      
      {/* Dynamic @media print styling so print is perfect landscape A4 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card-wrapper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important; /* A4 width */
            height: 210mm !important; /* A4 height */
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
          }
          .print-inner-card {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 25mm !important;
            box-sizing: border-box !important;
            background-color: ${primaryColor} !important;
            color: ${textColor} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}} />

      {/* Header Info (No Print) */}
      <header className="no-print border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                Verified Credential
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold font-sans h-9 px-3 gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold font-sans h-9 px-4 gap-1.5 flex items-center shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF / Print</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Vercel Ambient Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        {/* Certificate Landscape Card */}
        <div className="print-card-wrapper w-full max-w-[850px] aspect-[1.414/1] bg-black border border-zinc-800 rounded-2xl p-0.5 shadow-2xl relative z-10 flex items-center justify-center transition-all duration-300 overflow-hidden">
          <div
            className="print-inner-card w-full h-full rounded-[14px] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden transition-all duration-300 border border-zinc-900"
            style={{
              backgroundColor: primaryColor,
              color: textColor
            }}
          >
            {/* Corner Deco Borders */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: accentColor }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: accentColor }} />

            {/* Subtle grid pattern inside certificate */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none" />

            {/* Header row */}
            <div className="flex justify-between items-start z-10 relative">
              <div>
                {template.logoUrl ? (
                  <img
                    src={template.logoUrl}
                    alt="Institution Logo"
                    className="h-12 w-auto object-contain max-w-[160px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-zinc-800 rounded-md flex items-center justify-center" style={{ backgroundColor: accentColor + '20' }}>
                      <Award className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <span className="text-[12px] font-extrabold tracking-widest uppercase font-mono">VEOLMS</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[8px] font-bold uppercase tracking-widest font-mono opacity-40 block mb-0.5">Credential Id</span>
                <span className="text-xs font-mono font-bold uppercase" style={{ color: accentColor }}>
                  {cert.certificateCode}
                </span>
              </div>
            </div>

            {/* Certificate Middle Body */}
            <div className="text-center my-auto flex flex-col justify-center items-center z-10 relative">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <Award className="w-5 h-5" style={{ color: accentColor }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] font-mono opacity-50">
                  Official Certificate of completion
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 uppercase" style={{ color: textColor }}>
                {template.title}
              </h2>

              <p className="text-xs italic font-medium max-w-sm mb-5" style={{ color: descColor }}>
                {template.subTitle}
              </p>

              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mb-5 italic" style={{ borderBottom: `2.5px solid ${accentColor}`, paddingBottom: '6px' }}>
                {cert.userId.name}
              </h3>

              <p className="text-xs sm:text-sm max-w-lg leading-relaxed" style={{ color: descColor }}>
                {template.bodyText}{' '}
                <span className="font-extrabold not-italic" style={{ color: textColor }}>
                  {cert.courseId.title}
                </span>
              </p>
            </div>

            {/* Signature & Issue date */}
            <div className="flex justify-between items-end border-t pt-5 z-10 relative" style={{ borderColor: borderColor }}>
              <div className="text-left">
                <span className="text-[8px] font-bold uppercase tracking-widest font-mono block opacity-40 mb-1.5">
                  Completion Date
                </span>
                <span className="text-xs font-bold font-mono">
                  {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="text-right">
                {template.signatureUrl ? (
                  <div className="h-12 flex items-center justify-end mb-1">
                    <img
                      src={template.signatureUrl}
                      alt="Instructor Signature"
                      className="max-h-10 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-6 mb-1" />
                )}
                <span className="text-xs font-bold block" style={{ color: textColor }}>
                  {template.instructorName}
                </span>
                <span className="text-[9px] font-medium block" style={{ color: metaColor }}>
                  {template.instructorTitle}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Verification Info Block (No Print) */}
        <section className="no-print mt-10 max-w-[850px] w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md relative z-10">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-emerald-950/20 border border-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">
                Cryptographically Verified Credential
              </h4>
              <p className="text-xs text-zinc-400 leading-normal max-w-xl">
                This certificate has been issued by VEOLMS to confirm that{' '}
                <strong className="text-zinc-200">{cert.userId.name}</strong> has fully
                completed and passed all course curriculum guidelines for{' '}
                <strong className="text-zinc-200">{cert.courseId.title}</strong>.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="text-left font-mono md:text-right">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">
                Verification Date
              </span>
              <span className="text-xs text-zinc-300 font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {new Date(cert.issuedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (No Print) */}
      <footer className="no-print py-6 text-center border-t border-zinc-800 bg-zinc-900/10 text-xs text-zinc-500 relative z-10">
        <p className="font-mono text-[9px] uppercase tracking-widest">
          VEOLMS Verification Portal &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
