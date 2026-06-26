'use client'

import { useState, useEffect, useRef } from 'react'
import { Flame, Zap, Calendar, Clock, BookOpen } from 'lucide-react'
import { api } from '@/lib/api'

interface StreakDay {
  date: string
  minutes: number
  lessonsWatched: number
}

interface StreakData {
  streak: StreakDay[]
  currentStreak: number
  longestStreak: number
  totalMinutes: number
  activeDays: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  date: string
  minutes: number
  lessonsWatched: number
}

function getIntensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0
  if (minutes < 15) return 1
  if (minutes < 30) return 2
  if (minutes < 60) return 3
  return 4
}

const INTENSITY_CLASSES = [
  'bg-zinc-100 border border-zinc-200',                          // 0 – empty
  'bg-indigo-200 border border-indigo-300',                     // 1 – light
  'bg-indigo-400 border border-indigo-500',                     // 2 – medium
  'bg-indigo-600 border border-indigo-700',                     // 3 – strong
  'bg-indigo-800 border border-indigo-900 shadow-[0_0_6px_rgba(79,70,229,0.4)]', // 4 – max
]

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildGrid(streak: StreakDay[]): (StreakDay | null)[][] {
  // Build a map for O(1) lookup
  const map: Record<string, StreakDay> = {}
  streak.forEach((d) => { map[d.date] = d })

  // End of grid = today, start = 52 weeks ago aligned to Sunday
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364) // ~52 weeks
  // Rewind to the nearest Sunday before startDate
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: (StreakDay | null)[][] = []
  const cursor = new Date(startDate)

  while (cursor <= today) {
    const week: (StreakDay | null)[] = []
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10)
      const isFuture = cursor > today
      week.push(isFuture ? null : (map[iso] ?? { date: iso, minutes: 0, lessonsWatched: 0 }))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

function buildMonthLabels(weeks: (StreakDay | null)[][]): { label: string; colIndex: number }[] {
  const labels: { label: string; colIndex: number }[] = []
  let lastMonth = -1

  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d !== null)
    if (!firstDay) return
    const dt = new Date(firstDay.date + 'T12:00:00Z')
    const m = dt.getUTCMonth()
    if (m !== lastMonth) {
      labels.push({
        label: dt.toLocaleString('default', { month: 'short' }),
        colIndex: wi,
      })
      lastMonth = m
    }
  })

  return labels
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

export default function LearningStreakChart() {
  const [data, setData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, date: '', minutes: 0, lessonsWatched: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/api/progress/streak')
      .then((res) => setData(res as StreakData))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const weeks = data ? buildGrid(data.streak) : []
  const monthLabels = buildMonthLabels(weeks)

  const handleCellEnter = (e: React.MouseEvent<HTMLDivElement>, day: StreakDay | null) => {
    if (!day || !containerRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    setTooltip({
      visible: true,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      date: day.date,
      minutes: day.minutes,
      lessonsWatched: day.lessonsWatched,
    })
  }

  const handleCellLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  const statsCards = [
    {
      icon: <Flame className="w-4 h-4" />,
      label: 'Current Streak',
      value: `${data?.currentStreak ?? 0}d`,
      color: 'text-orange-500 bg-orange-50 border-orange-100',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: 'Longest Streak',
      value: `${data?.longestStreak ?? 0}d`,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Total Study Time',
      value: formatMinutes(data?.totalMinutes ?? 0),
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Active Days',
      value: `${data?.activeDays ?? 0}`,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 leading-tight">Learning Activity</h2>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Past 52 weeks</p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400 font-semibold mr-1">Less</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${INTENSITY_CLASSES[level]}`}
            />
          ))}
          <span className="text-[10px] text-zinc-400 font-semibold ml-1">More</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-zinc-100">
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <span className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider leading-none mb-0.5">{stat.label}</span>
              <span className="text-base font-black text-zinc-900 leading-tight">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="px-6 py-5 overflow-x-auto">
        {loading ? (
          <div className="flex gap-1">
            {Array.from({ length: 53 }).map((_, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, di) => (
                  <div key={di} className="w-3 h-3 rounded-sm bg-zinc-100 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div ref={containerRef} className="relative select-none" style={{ minWidth: 'max-content' }}>
            {/* Month Labels */}
            <div className="flex mb-1" style={{ paddingLeft: '28px' }}>
              {weeks.map((_, wi) => {
                const label = monthLabels.find((m) => m.colIndex === wi)
                return (
                  <div key={wi} className="w-4 mr-[2px] flex-shrink-0">
                    {label && (
                      <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                        {label.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-[2px]">
              {/* Day of Week Labels */}
              <div className="flex flex-col gap-[2px] mr-1.5 shrink-0">
                {DAYS_OF_WEEK.map((day, i) => (
                  <div key={day} className="h-4 flex items-center">
                    {i % 2 === 1 && (
                      <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wide w-5 text-right">
                        {day.slice(0, 1)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Heatmap Grid */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map((day, di) => {
                    if (day === null) {
                      return <div key={di} className="w-4 h-4 rounded-sm opacity-0" />
                    }
                    const intensity = getIntensity(day.minutes)
                    const isToday = day.date === new Date().toISOString().slice(0, 10)
                    return (
                      <div
                        key={di}
                        className={`
                          w-4 h-4 rounded-sm cursor-pointer transition-all duration-100
                          hover:scale-125 hover:z-10 hover:shadow-md relative
                          ${INTENSITY_CLASSES[intensity]}
                          ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110' : ''}
                        `}
                        onMouseEnter={(e) => handleCellEnter(e, day)}
                        onMouseLeave={handleCellLeave}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Tooltip */}
            {tooltip.visible && (
              <div
                className="absolute z-50 pointer-events-none"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl border border-zinc-700 whitespace-nowrap">
                  <div className="font-bold mb-0.5">
                    {new Date(tooltip.date + 'T12:00:00Z').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                  {tooltip.minutes > 0 ? (
                    <div className="text-zinc-300 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>{formatMinutes(tooltip.minutes)} studied</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        <span>{tooltip.lessonsWatched} lesson{tooltip.lessonsWatched !== 1 ? 's' : ''} watched</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500">No study activity</div>
                  )}
                  {/* Arrow */}
                  <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motivational footer for empty states */}
        {!loading && data?.activeDays === 0 && (
          <div className="mt-3 text-center py-2">
            <p className="text-xs text-zinc-400">
              Start watching lessons to build your streak! 🚀
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
