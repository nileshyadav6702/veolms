import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[var(--ds-canvas)] border-t border-[var(--ds-hairline)] mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[var(--ds-primary)] rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4 text-[var(--ds-on-primary)]" />
              </div>
              <span className="text-base font-bold tracking-tight text-[var(--ds-ink)]">VeoLMS</span>
            </Link>
            <p className="text-xs sm:text-sm text-[var(--ds-body)] leading-relaxed max-w-xs">
              Learn programming, system architecture, and engineering skills from top active professionals.
            </p>
          </div>

          {/* Links columns */}
          <div>
            <h4 className="text-[11px] font-bold font-mono text-[var(--ds-mute)] uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Browse Courses', href: '/courses' },
                { label: 'Create Account', href: '/signup' },
                { label: 'Log In', href: '/login' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs sm:text-sm text-[var(--ds-body)] hover:text-[var(--color-link)] transition-colors font-medium"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold font-mono text-[var(--ds-mute)] uppercase tracking-wider mb-4">
              Topics
            </h4>
            <ul className="space-y-2.5">
              {['JavaScript', 'React', 'Node.js', 'TypeScript'].map((t) => (
                <li key={t}>
                  <Link
                    href={`/courses?search=${t}`}
                    className="text-xs sm:text-sm text-[var(--ds-body)] hover:text-[var(--color-link)] transition-colors font-medium"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold font-mono text-[var(--ds-mute)] uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[var(--ds-body)] font-medium">
              {['About', 'Blog', 'Contact', 'Privacy Policy'].map((t) => (
                <li key={t}>
                  <span className="text-[var(--ds-mute)] cursor-not-allowed hover:text-[var(--ds-ink)] transition-colors">
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-[var(--ds-hairline)] mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[11px] font-mono text-[var(--ds-mute)]">
            © {new Date().getFullYear()} VeoLMS. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--ds-mute)]">
            <span>Made with ❤️ by</span>
            <strong className="text-[var(--ds-ink)] font-bold">Nilesh Yadav</strong>
          </div>
          <p className="text-[11px] font-mono text-[var(--ds-mute)]">
            Built for developers everywhere.
          </p>
        </div>

        {/* Big name watermark for aesthetics */}
        <div className="w-full mt-10 overflow-hidden select-none pointer-events-none">
          <span className="text-[9.5vw] font-bold text-[var(--ds-hairline)] uppercase tracking-[-0.06em] leading-none text-center block w-full transition-colors duration-200">
            NILESH YADAV
          </span>
        </div>
      </div>
    </footer>
  )
}
