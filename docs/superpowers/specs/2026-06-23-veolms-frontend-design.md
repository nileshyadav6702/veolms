# VeoLMS Frontend Design Spec

**Date:** 2026-06-23
**Stack:** Next.js 16.2.9 · React 19 · Tailwind CSS 4 · TypeScript
**Backend:** Express REST API at `http://localhost:5000` (dev) / env var in prod
**Design:** Vercel-inspired — DESIGN.md token system, Geist font, light mode

---

## Architecture

Pure client-side SPA. All data fetched in Client Components via `useEffect` + `fetch`. No server-side data fetching. JWT stored in `localStorage`.

### File Structure

```
frontend/
├── app/
│   ├── layout.tsx                        # Root — AuthProvider wrapper, Geist fonts
│   ├── globals.css                       # Design tokens as CSS vars + Tailwind base
│   ├── page.tsx                          # Homepage
│   ├── courses/
│   │   ├── page.tsx                      # Course listing + search
│   │   └── [slug]/page.tsx              # Course detail + curriculum
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── dashboard/page.tsx               # Student dashboard (guarded)
│   ├── learn/
│   │   └── [courseId]/[lessonId]/page.tsx  # Video player (guarded + enrolled)
│   └── admin/
│       ├── page.tsx                      # Admin stats (guarded, role=admin)
│       ├── courses/page.tsx
│       ├── students/page.tsx
│       └── enrollments/page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx                   # Primary (black pill) + secondary variants
│   │   ├── Card.tsx                     # White card with stacked shadow + hairline
│   │   ├── Input.tsx                    # 40px, 6px radius, hairline border
│   │   ├── Badge.tsx                    # canvas-soft pill, caption text
│   │   └── Spinner.tsx
│   ├── layout/
│   │   ├── Navbar.tsx                   # 64px sticky, logo + nav + auth CTAs
│   │   └── Footer.tsx                   # 4-column, caption-mono eyebrows
│   ├── courses/
│   │   ├── CourseCard.tsx               # 16:9 thumb, title, instructor, price
│   │   ├── CourseGrid.tsx               # Responsive grid wrapper
│   │   └── CurriculumList.tsx           # Sections + lessons accordion
│   ├── video/
│   │   └── VideoPlayer.tsx              # HTML5 video + custom controls overlay
│   ├── admin/
│   │   ├── StatsCard.tsx
│   │   └── DataTable.tsx
│   └── ProtectedRoute.tsx               # Auth + role guard, redirects to /login
└── lib/
    ├── api.ts                            # fetch wrapper — Bearer token, base URL
    └── auth-context.tsx                 # AuthProvider + useAuth hook
```

---

## Auth Flow

1. `AuthProvider` reads `localStorage` on mount → sets `{ user, token }` in context
2. `login(token, user)` → writes to `localStorage` + updates context
3. `logout()` → clears `localStorage` + redirects to `/`
4. `<ProtectedRoute role?>` — checks `user` on mount; if null → redirect `/login`; if role mismatch → redirect `/`
5. All `api.*` calls attach `Authorization: Bearer <token>` from context

---

## Design System

Pulled from DESIGN.md — applied as Tailwind CSS custom properties.

### Colors
| Token | Value | Use |
|---|---|---|
| `--color-ink` | `#171717` | Headings, primary CTA background |
| `--color-body` | `#4d4d4d` | Secondary text, nav links |
| `--color-mute` | `#888888` | Placeholders, fine print |
| `--color-canvas` | `#ffffff` | Card surfaces |
| `--color-canvas-soft` | `#fafafa` | Page background |
| `--color-hairline` | `#ebebeb` | Borders, dividers |
| `--color-link` | `#0070f3` | Links |

### Typography
- Display XL: 48px / 600 / -0.05em — hero headline
- Display LG: 32px / 600 / -0.04em — section headlines
- Body: 16px / 400 — default
- Body SM: 14px / 400 / -0.01em — nav links, secondary
- Caption Mono: 12px / 400 / Geist Mono — section eyebrows

### Elevation
Cards use stacked shadow: `0px 1px 1px rgba(0,0,0,0.03), 0px 2px 2px rgba(0,0,0,0.06)` + `inset 0 0 0 1px #ebebeb`

### Buttons
- Primary (marketing): black `#171717`, white text, 100px pill radius
- Primary (nav/form): black, white text, 6px radius, 28px height
- Secondary: white, ink text, same radius as paired primary

---

## Pages

### Homepage (`/`)
- **Hero band**: mesh gradient backdrop (cyan→magenta), headline "Learn anything. Ship faster.", CTA row (Browse Courses + Sign Up)
- **Featured courses**: `GET /api/courses?limit=6` → `CourseGrid`
- **Stats strip**: "3 courses · 15+ lessons · 100% practical"
- **Footer**

### Course Listing (`/courses`)
- Search input → debounced `GET /api/courses?search=&page=`
- Paginated `CourseGrid`
- Loading skeleton cards

### Course Detail (`/courses/[slug]`)
- `GET /api/courses/:slug` + `GET /api/lessons/course/:courseId`
- Hero: thumbnail, title, instructor, price, enroll CTA
- Tabs: Overview | Curriculum
- Curriculum: sections accordion, lessons with lock icon (non-preview + not enrolled)
- Preview lessons playable inline
- Enroll button → Razorpay flow → redirect `/dashboard`

### Login / Signup (`/login`, `/signup`)
- Centered card (`ex-auth-form-card` pattern from DESIGN.md)
- Form → `POST /api/auth/login` or `/signup` → `login(token, user)` → redirect
- Error states inline below field

### Student Dashboard (`/dashboard`)
- `GET /api/enrollments` → enrolled course cards with progress bar
- `GET /api/progress/recent` → "Continue Learning" section (last 5 lessons)
- Empty state when no enrollments

### Learn Page (`/learn/[courseId]/[lessonId]`)
- Sidebar: lesson list (from enrollment context)
- Main: `VideoPlayer`
  - On mount: `GET /api/lessons/:id/stream` → signed URL → `<video src>`
  - Restore position from `GET /api/progress/course/:courseId`
  - `timeupdate` → debounced (10s) `POST /api/progress`
  - Custom controls: play/pause, seek bar, current/total time, speed (0.75×/1×/1.25×/1.5×/2×), fullscreen
- Next lesson auto-advance

### Admin Dashboard (`/admin`)
- `GET /api/admin/dashboard` → 4 stat cards (students, courses, enrollments, revenue)

### Admin Courses (`/admin/courses`)
- `GET /api/admin/courses` → table with publish/unpublish/delete actions
- "New Course" → inline form or modal → `POST /api/courses`

### Admin Students (`/admin/students`)
- `GET /api/admin/students` → paginated table

### Admin Enrollments (`/admin/enrollments`)
- `GET /api/admin/enrollments` → table with user, course, payment status, date

---

## Data Flow

### `lib/api.ts`
```ts
const BASE = process.env.NEXT_PUBLIC_API_URL // http://localhost:5000

function headers() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const api = {
  get: (path: string) => fetch(BASE + path, { headers: headers() }).then(throwIfError),
  post: (path: string, body: unknown) => fetch(BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(throwIfError),
  put: (path: string, body: unknown) => fetch(BASE + path, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(throwIfError),
  delete: (path: string) => fetch(BASE + path, { method: 'DELETE', headers: headers() }).then(throwIfError),
  patch: (path: string, body: unknown) => fetch(BASE + path, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }).then(throwIfError),
}
```

### Payment Flow (Razorpay)
1. User clicks "Enroll" → `POST /api/payments/create-order` → `{ order, key, course }`
2. Load Razorpay script → open `window.Razorpay({ key, order_id, ... })`
3. `handler` callback → `POST /api/payments/verify` with signature
4. On success → redirect `/dashboard`

### Progress Saving
- On learn page mount: fetch progress → set `video.currentTime`
- `timeupdate` listener → debounce 10s → `POST /api/progress { lessonId, courseId, watchedSeconds, duration }`
- `completed` auto-set by backend (≥90% watched)

---

## Error Handling

- API errors → `throwIfError` extracts `res.body.message` → thrown as `Error`
- Pages catch in `useEffect` → `setError(message)` → inline error banner (red, dismissible)
- 401 responses → `logout()` + redirect `/login`
- Network failures → "Unable to connect. Check your connection." toast

---

## Responsive

| Breakpoint | Key changes |
|---|---|
| Mobile `<640px` | Navbar → hamburger. CourseGrid → 1-col. Hero stacks. |
| Tablet `640–1024px` | CourseGrid → 2-col. Admin tables → scroll. |
| Desktop `>1024px` | CourseGrid → 3-col. Full nav. |
