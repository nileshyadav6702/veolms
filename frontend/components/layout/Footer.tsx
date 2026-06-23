import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-bold text-gray-900">VeoLMS</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              Learn from expert instructors. Build real skills. Advance your career.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 font-mono">
              Platform
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Browse Courses', href: '/courses' },
                { label: 'Sign Up Free', href: '/signup' },
                { label: 'Log In', href: '/login' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 font-mono">
              Topics
            </h4>
            <ul className="space-y-2">
              {['JavaScript', 'React', 'Node.js', 'TypeScript'].map((t) => (
                <li key={t}>
                  <Link
                    href={`/courses?search=${t}`}
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 font-mono">
              Company
            </h4>
            <ul className="space-y-2">
              {['About', 'Blog', 'Contact', 'Privacy Policy'].map((t) => (
                <li key={t}>
                  <span className="text-sm text-gray-400">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} VeoLMS. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">Built for learners everywhere.</p>
        </div>
      </div>
    </footer>
  )
}
