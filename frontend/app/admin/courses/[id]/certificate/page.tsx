'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Award,
  UploadCloud,
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  Settings,
  Paintbrush
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import ProtectedRoute from '@/components/ProtectedRoute'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'

interface CertificateTemplate {
  title: string
  subTitle: string
  bodyText: string
  instructorName: string
  instructorTitle: string
  logoUrl?: string
  signatureUrl?: string
  primaryColor: string
  accentColor: string
}

const PRESETS = [
  {
    name: 'Vercel Dark',
    primaryColor: '#000000',
    accentColor: '#ffffff',
    title: 'Certificate of Excellence',
    subTitle: 'This certifies that',
    bodyText: 'has successfully completed the course'
  },
  {
    name: 'Vercel Light',
    primaryColor: '#ffffff',
    accentColor: '#000000',
    title: 'Certificate of Completion',
    subTitle: 'This is to certify that',
    bodyText: 'has successfully completed all requirements for'
  },
  {
    name: 'Midnight Gold',
    primaryColor: '#0f172a', // Slate 900
    accentColor: '#f59e0b', // Amber 500
    title: 'Certificate of Mastery',
    subTitle: 'This is proudly presented to',
    bodyText: 'for outstanding performance and completion of'
  },
  {
    name: 'Cyberpunk Purple',
    primaryColor: '#030712', // Gray 950
    accentColor: '#a855f7', // Purple 500
    title: 'Developer Certificate',
    subTitle: 'Verification of course completion for',
    bodyText: 'who has successfully finished the curriculum of'
  }
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

export default function AdminCertificateEditor() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const toast = useToast()

  const [courseTitle, setCourseTitle] = useState('Course Title')
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)

  const [template, setTemplate] = useState<CertificateTemplate>({
    title: 'Certificate of Completion',
    subTitle: 'This is to certify that',
    bodyText: 'has successfully completed the course',
    instructorName: '',
    instructorTitle: '',
    logoUrl: '',
    signatureUrl: '',
    primaryColor: '#000000',
    accentColor: '#0070f3'
  })

  // Track absolute preview URLs for uploaded files
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [sigPreview, setSigPreview] = useState<string>('')

  // Load course details and certificate template
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const courseResp = await api.get(`/api/courses/${courseId}`)
      if (courseResp.success && courseResp.course) {
        setCourseTitle(courseResp.course.title)
        
        // Load certificate template if it exists
        const certResp = await api.get(`/api/certificates/course/${courseId}/template`)
        if (certResp.success && certResp.template) {
          const t = certResp.template
          setTemplate({
            title: t.title || 'Certificate of Completion',
            subTitle: t.subTitle || 'This is to certify that',
            bodyText: t.bodyText || 'has successfully completed the course',
            instructorName: t.instructorName || courseResp.course.instructor || '',
            instructorTitle: t.instructorTitle || 'Course Instructor',
            logoUrl: t.logoUrl || '',
            signatureUrl: t.signatureUrl || '',
            primaryColor: t.primaryColor || '#000000',
            accentColor: t.accentColor || '#0070f3'
          })

          // Save formatted URLs for display
          if (t.logoUrl) setLogoPreview(t.logoUrl)
          if (t.signatureUrl) setSigPreview(t.signatureUrl)
        } else {
          // Pre-fill instructor from course details
          setTemplate((prev) => ({
            ...prev,
            instructorName: courseResp.course.instructor || '',
            instructorTitle: 'Course Instructor'
          }))
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load course settings.')
      router.push(`/admin/courses/${courseId}`)
    } finally {
      setLoading(false)
    }
  }, [courseId, router, toast])

  useEffect(() => {
    if (courseId) {
      loadData()
    }
  }, [courseId, loadData])

  // Handle uploading logo or signature
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      toast.info(`Uploading ${type}...`)
      // Request presigned upload URL
      const response = await api.post('/api/upload/thumbnail', {
        fileName: file.name,
        contentType: file.type
      })

      const { uploadUrl, key } = response

      // PUT file directly to R2
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      })

      if (!uploadResp.ok) throw new Error('Upload failed')

      // Save key to state
      setTemplate((prev) => ({
        ...prev,
        [type === 'logo' ? 'logoUrl' : 'signatureUrl']: key
      }))

      // Set formatted preview URL
      const relativeUrl = `/api/upload/image?key=${encodeURIComponent(key)}`
      const fullUrl = `${API_BASE}${relativeUrl}`
      if (type === 'logo') {
        setLogoPreview(fullUrl)
      } else {
        setSigPreview(fullUrl)
      }

      toast.success(`${type === 'logo' ? 'Logo' : 'Signature'} uploaded successfully!`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to upload ${type}.`)
    }
  }

  // Apply Preset Theme
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTemplate((prev) => ({
      ...prev,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      title: preset.title,
      subTitle: preset.subTitle,
      bodyText: preset.bodyText
    }))
    toast.success(`Theme "${preset.name}" applied!`)
  }

  // Save template settings
  const handleSave = async () => {
    try {
      setSaveLoading(true)
      const res = await api.put(`/api/certificates/course/${courseId}/template`, template)
      if (res.success) {
        toast.success('Certificate template saved successfully.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to save certificate template.')
    } finally {
      setSaveLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-zinc-950 h-screen text-white">
        <Spinner className="w-8 h-8 text-white" />
      </div>
    )
  }

  // Dynamic layout styling
  const isDarkTheme = template.primaryColor === '#000000' || template.primaryColor === '#030712' || template.primaryColor === '#0f172a'
  const textColor = isDarkTheme ? '#ffffff' : '#0f172a'
  const descColor = isDarkTheme ? 'rgba(255, 255, 255, 0.65)' : '#4b5563'
  const metaColor = isDarkTheme ? 'rgba(255, 255, 255, 0.45)' : '#6b7280'
  const borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'

  return (
    <ProtectedRoute>
      <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
        
        {/* LEFT COLUMN: Editor Form Panel */}
        <div className="w-full lg:w-[450px] shrink-0 border-r border-zinc-800 flex flex-col justify-between bg-zinc-900 overflow-y-auto">
          <div>
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <Link
                href={`/admin/courses/${courseId}`}
                className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors uppercase tracking-wider font-mono mb-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to builder
              </Link>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" /> Certificate Template
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Customize the layout, colors, and content of the completion certificates issued to students.
              </p>
            </div>

            {/* Presets Row */}
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-3 flex items-center gap-1.5">
                <Paintbrush className="w-3.5 h-3.5" /> Quick Style Presets
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-left hover:bg-zinc-900 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">{preset.name}</div>
                    <div className="flex gap-1.5 mt-1.5">
                      <div className="w-3 h-3 rounded-full border border-zinc-700" style={{ backgroundColor: preset.primaryColor }} />
                      <div className="w-3 h-3 rounded-full border border-zinc-700" style={{ backgroundColor: preset.accentColor }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Fields */}
            <div className="p-6 space-y-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Content Settings
              </h2>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                  Certificate Title
                </label>
                <Input
                  value={template.title}
                  onChange={(e) => setTemplate((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Certificate of Completion"
                  className="bg-zinc-950 border-zinc-800 text-white text-xs placeholder-zinc-600 focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                  Presentation Subtitle
                </label>
                <Input
                  value={template.subTitle}
                  onChange={(e) => setTemplate((prev) => ({ ...prev, subTitle: e.target.value }))}
                  placeholder="e.g. This is to certify that"
                  className="bg-zinc-950 border-zinc-800 text-white text-xs placeholder-zinc-600 focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                  Completion Description Text
                </label>
                <textarea
                  value={template.bodyText}
                  onChange={(e) => setTemplate((prev) => ({ ...prev, bodyText: e.target.value }))}
                  placeholder="e.g. has successfully completed the course"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none min-h-[70px] resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.primaryColor}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-zinc-300">{template.primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.accentColor}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, accentColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-zinc-300">{template.accentColor}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-5 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                  Signatory Info
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1">
                      Instructor Name
                    </label>
                    <Input
                      value={template.instructorName}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, instructorName: e.target.value }))}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="bg-zinc-950 border-zinc-800 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1">
                      Instructor Title
                    </label>
                    <Input
                      value={template.instructorTitle}
                      onChange={(e) => setTemplate((prev) => ({ ...prev, instructorTitle: e.target.value }))}
                      placeholder="e.g. Lead Instructor"
                      className="bg-zinc-950 border-zinc-800 text-white text-xs"
                    />
                  </div>
                </div>

                {/* Upload Section */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                      Upload Logo
                    </label>
                    <label className="flex flex-col items-center justify-center border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 rounded-lg p-3 cursor-pointer text-center group transition-colors">
                      <UploadCloud className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400 mb-1" />
                      <span className="text-[9px] text-zinc-500 font-medium">Click to upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImage(e, 'logo')}
                        className="hidden"
                      />
                    </label>
                    {template.logoUrl && (
                      <div className="text-[8px] text-emerald-400 mt-1 font-semibold font-mono truncate">
                        ✓ Logo Uploaded
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono mb-1.5">
                      Upload Signature
                    </label>
                    <label className="flex flex-col items-center justify-center border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 rounded-lg p-3 cursor-pointer text-center group transition-colors">
                      <UploadCloud className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400 mb-1" />
                      <span className="text-[9px] text-zinc-500 font-medium">Click to upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImage(e, 'signature')}
                        className="hidden"
                      />
                    </label>
                    {template.signatureUrl && (
                      <div className="text-[8px] text-emerald-400 mt-1 font-semibold font-mono truncate">
                        ✓ Signature Uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end">
            <Button
              onClick={handleSave}
              disabled={saveLoading}
              className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold font-sans h-9 px-4 gap-1.5 flex items-center shadow-md cursor-pointer"
            >
              {saveLoading ? <Spinner className="w-3.5 h-3.5 text-zinc-950" /> : <Save className="w-3.5 h-3.5" />}
              Save Template
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Preview Section */}
        <div className="flex-1 flex flex-col bg-zinc-950 items-center justify-center p-6 sm:p-12 relative overflow-hidden">
          
          {/* Vercel Ambient Grid / Gradient Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
          
          <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
            <Badge variant="purple" className="text-[9px] font-bold font-mono tracking-widest uppercase border border-indigo-500/20 px-2 py-0.5 bg-indigo-500/5">
              <Eye className="w-3 h-3 inline mr-1" /> Live Preview (Landscape)
            </Badge>
          </div>

          {/* Certificate Board Wrapper */}
          <div className="w-full max-w-[760px] aspect-[1.414/1] bg-black border border-zinc-800 rounded-xl p-0.5 shadow-2xl relative z-10 flex items-center justify-center scale-90 sm:scale-100 origin-center transition-all duration-300">
            {/* Inner Glow and Border */}
            <div 
              className="w-full h-full rounded-[10px] p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: template.primaryColor,
                borderColor: borderColor,
                color: textColor,
                borderWidth: '1px'
              }}
            >
              
              {/* Corner decorative borders (Vercel-inspired subtle lines) */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2" style={{ borderColor: template.accentColor }} />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2" style={{ borderColor: template.accentColor }} />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2" style={{ borderColor: template.accentColor }} />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2" style={{ borderColor: template.accentColor }} />

              {/* Vercel subtle grid overlay within certificate */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

              {/* Top Banner Row */}
              <div className="flex justify-between items-start z-10 relative">
                <div>
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Certificate Logo" 
                      className="h-10 w-auto object-contain max-w-[140px]" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-zinc-800 rounded flex items-center justify-center" style={{ backgroundColor: template.accentColor + '20' }}>
                        <Award className="w-3.5 h-3.5" style={{ color: template.accentColor }} />
                      </div>
                      <span className="text-[10px] font-extrabold tracking-widest uppercase font-mono">VEOLMS</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold uppercase tracking-widest font-mono opacity-40">Verification Code</span>
                  <div className="text-[9px] font-mono font-bold" style={{ color: template.accentColor }}>
                    CERT-XXXX-XXXX
                  </div>
                </div>
              </div>

              {/* Middle Body Content */}
              <div className="text-center my-auto flex flex-col justify-center items-center z-10 relative">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="w-4 h-4" style={{ color: template.accentColor }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] font-mono opacity-50">
                    Official Certification
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 uppercase" style={{ color: textColor }}>
                  {template.title}
                </h2>

                <p className="text-[10px] italic font-medium max-w-sm mb-4" style={{ color: descColor }}>
                  {template.subTitle}
                </p>

                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tighter mb-4 italic" style={{ borderBottom: `2px solid ${template.accentColor}`, paddingBottom: '4px' }}>
                  John Doe
                </h3>

                <p className="text-[10px] max-w-md leading-relaxed" style={{ color: descColor }}>
                  {template.bodyText}{' '}
                  <span className="font-extrabold not-italic text-white" style={{ color: textColor }}>
                    {courseTitle}
                  </span>
                </p>
              </div>

              {/* Signatory & Date Block */}
              <div className="flex justify-between items-end border-t pt-4 z-10 relative" style={{ borderColor: borderColor }}>
                <div className="text-left">
                  <span className="text-[8px] font-bold uppercase tracking-widest font-mono block opacity-40 mb-1">
                    Issued Date
                  </span>
                  <span className="text-[10px] font-bold font-mono">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <div className="text-right">
                    {sigPreview ? (
                      <div className="h-10 flex items-center justify-end mb-1">
                        <img 
                          src={sigPreview} 
                          alt="Signature" 
                          className="max-h-8 w-auto object-contain" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-6 mb-1" />
                    )}
                    <span className="text-[10px] font-bold block" style={{ color: textColor }}>
                      {template.instructorName || 'Instructor Name'}
                    </span>
                    <span className="text-[8px] font-medium block" style={{ color: metaColor }}>
                      {template.instructorTitle || 'Instructor Title'}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 mt-6 max-w-sm text-center relative z-10">
            Preview is dynamically scaled to fit. The generated user certificates are high quality vector SVG/HTML and print-perfect A4 size.
          </div>
        </div>

      </div>
    </ProtectedRoute>
  )
}
