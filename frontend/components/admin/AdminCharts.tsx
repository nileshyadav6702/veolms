'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react'

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

interface AdminChartsProps {
  chartData: ChartData | null
}

export default function AdminCharts({ chartData }: AdminChartsProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '12m'>('7d')
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'enrollments'>('revenue')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Datasets
  const data7d: ChartDataPoint[] = chartData?.data7d ?? []
  const data30d: ChartDataPoint[] = chartData?.data30d ?? []
  const data12m: ChartDataPoint[] = chartData?.data12m ?? []

  const activeDataset = timeframe === '7d' ? data7d : timeframe === '30d' ? data30d : data12m

  // Course distribution dataset
  const courseData = chartData?.courseData ?? []
  const topCourse = chartData?.topCourseName ?? 'None'

  // Chart coordinate math calculations
  const width = 600
  const height = 220
  const paddingX = 40
  const paddingY = 20

  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const maxVal = Math.max(...activeDataset.map(d => activeMetric === 'revenue' ? d.revenue : d.enrollments)) || 1
  const pointsCount = activeDataset.length

  const getCoordinates = (index: number, val: number) => {
    const divisor = Math.max(1, pointsCount - 1)
    const x = paddingX + (index / divisor) * chartWidth
    // Invert Y coordinate since SVG (0,0) is top-left
    const y = height - paddingY - (val / maxVal) * chartHeight
    return { x, y }
  }

  // Generate SVG path for line and area fill
  let linePath = ''
  let areaPath = ''

  activeDataset.forEach((d, idx) => {
    const val = activeMetric === 'revenue' ? d.revenue : d.enrollments
    const { x, y } = getCoordinates(idx, val)

    if (idx === 0) {
      linePath = `M ${x} ${y}`
      areaPath = `M ${x} ${height - paddingY} L ${x} ${y}`
    } else {
      linePath += ` L ${x} ${y}`
      areaPath += ` L ${x} ${y}`
    }

    if (idx === pointsCount - 1) {
      areaPath += ` L ${x} ${height - paddingY} Z`
    }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Sales Trends Area Graph ─── */}
      <Card className="lg:col-span-2 flex flex-col justify-between" padding="md">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Performance metrics
              </span>
              <h3 className="font-bold text-primary text-base mt-1">Growth & Transaction Ledger.</h3>
            </div>

            {/* Controls Filters Row */}
            <div className="flex items-center gap-2">
              {/* Metric Toggle */}
              <div className="flex bg-canvas-soft-2 p-1 rounded-lg border border-hairline text-[11px] font-semibold">
                <button
                  onClick={() => setActiveMetric('revenue')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeMetric === 'revenue' ? 'bg-white shadow-sm font-bold text-primary' : 'text-mute hover:text-primary'
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setActiveMetric('enrollments')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeMetric === 'enrollments' ? 'bg-white shadow-sm font-bold text-primary' : 'text-mute hover:text-primary'
                  }`}
                >
                  Enrollments
                </button>
              </div>

              {/* Timeframe Select */}
              <div className="flex bg-canvas-soft-2 p-1 rounded-lg border border-hairline text-[11px] font-semibold">
                {(['7d', '30d', '12m'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf)
                      setHoveredIndex(null)
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all uppercase ${
                      timeframe === tf ? 'bg-white shadow-sm font-bold text-primary' : 'text-mute hover:text-primary'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive SVG Area Canvas */}
          <div className="relative w-full overflow-hidden select-none bg-canvas-soft border border-hairline rounded-lg py-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                {/* Curve Underglow Gradient fill */}
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#171717" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#171717" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {Array.from({ length: 4 }).map((_, i) => {
                const y = paddingY + (i / 3) * chartHeight
                return (
                  <line
                    key={i}
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="var(--color-hairline)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                )
              })}

              {/* Curve Fill Area */}
              {activeDataset.length > 0 && (
                <path d={areaPath} fill="url(#areaGradient)" />
              )}

              {/* Curve Outline Stroke */}
              {activeDataset.length > 0 && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                />
              )}

              {/* X Axis Labels */}
              {activeDataset.map((d, idx) => {
                const { x } = getCoordinates(idx, 0)
                const isHovered = hoveredIndex === idx
                return (
                  <text
                    key={idx}
                    x={x}
                    y={height - 4}
                    textAnchor="middle"
                    className={`font-mono text-[9px] font-bold tracking-tight fill-mute transition-colors ${
                      isHovered ? 'fill-primary font-black' : ''
                    }`}
                  >
                    {d.label}
                  </text>
                )
              })}

              {/* Y Axis Reference Labels (Min / Max) */}
              <text
                x={paddingX - 6}
                y={paddingY + 4}
                textAnchor="end"
                className="font-mono text-[9px] font-semibold fill-mute"
              >
                {activeMetric === 'revenue' ? `₹${Math.round(maxVal / 1000)}k` : maxVal}
              </text>
              <text
                x={paddingX - 6}
                y={height - paddingY + 3}
                textAnchor="end"
                className="font-mono text-[9px] font-semibold fill-mute"
              >
                0
              </text>

              {/* Interaction Hover Dot Indicator */}
              {hoveredIndex !== null && activeDataset[hoveredIndex] && (
                (() => {
                  const d = activeDataset[hoveredIndex]
                  const val = activeMetric === 'revenue' ? d.revenue : d.enrollments
                  const { x, y } = getCoordinates(hoveredIndex, val)
                  return (
                    <g>
                      {/* Vertical line rule */}
                      <line
                        x1={x}
                        y1={paddingY}
                        x2={x}
                        y2={height - paddingY}
                        stroke="var(--color-hairline-strong)"
                        strokeWidth={1}
                      />
                      {/* Interactive focus ring dot */}
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        fill="white"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={2}
                        fill="var(--color-primary)"
                      />
                    </g>
                  )
                })()
              )}

              {/* Transparent Column overlay triggers for responsive hover logic */}
              {activeDataset.map((_, idx) => {
                const w = chartWidth / (pointsCount - 1 || 1)
                const xPos = paddingX + (idx / (pointsCount - 1 || 1)) * chartWidth - w / 2

                return (
                  <rect
                    key={idx}
                    x={xPos}
                    y={paddingY}
                    width={w}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                )
              })}
            </svg>

            {/* Dynamic tooltips layer */}
            {hoveredIndex !== null && activeDataset[hoveredIndex] && (
              (() => {
                const d = activeDataset[hoveredIndex]
                const val = activeMetric === 'revenue' ? d.revenue : d.enrollments
                const { x, y } = getCoordinates(hoveredIndex, val)

                // Tooltip alignment adjustments
                const isFarRight = x > width - 130
                const tooltipLeft = isFarRight ? x - 120 : x + 15

                return (
                  <div
                    className="absolute bg-white border border-hairline rounded-lg p-2.5 shadow-lg pointer-events-none transition-all z-10 w-28 text-left"
                    style={{
                      left: `${(tooltipLeft / width) * 100}%`,
                      top: `${((y - 10) / height) * 100}%`,
                    }}
                  >
                    <p className="font-mono text-[9px] text-mute uppercase font-bold tracking-wider leading-none">
                      {d.label} Details
                    </p>
                    <p className="text-xs font-bold text-primary mt-1.5">
                      {activeMetric === 'revenue' ? `₹${d.revenue.toLocaleString()}` : `${d.enrollments} Enrolls`}
                    </p>
                    <p className="text-[9px] text-mute mt-0.5">
                      {activeMetric === 'revenue' ? `${d.enrollments} Enrolls` : `₹${d.revenue.toLocaleString()}`}
                    </p>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      </Card>

      {/* ─── Course Distribution Bar Graph ─── */}
      <Card className="flex flex-col justify-between" padding="md">
        <div>
          <div>
            <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Enrolled weights
            </span>
            <h3 className="font-bold text-primary text-base mt-1">Course Popularity.</h3>
            <p className="text-mute text-[11px] mt-0.5 leading-relaxed">
              Distribution of active users registered in each course.
            </p>
          </div>

          {courseData.length > 0 ? (
            <div className="space-y-4 mt-6">
              {courseData.map((course, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-primary truncate max-w-[200px]" title={course.name}>
                      {course.name}
                    </span>
                    <span className="font-mono text-mute shrink-0">
                      {course.count} ({course.percentage}%)
                    </span>
                  </div>
                  {/* Horizontal Progress weight line */}
                  <div className="h-2 bg-canvas-soft border border-hairline rounded-full overflow-hidden">
                    <div
                      className={`h-full ${course.color} rounded-full transition-all duration-700`}
                      style={{ width: `${course.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <Users className="w-8 h-8 text-zinc-300 mb-2" />
              <p className="text-xs">No active course enrollments yet.</p>
            </div>
          )}
        </div>

        <div className="border-t border-hairline bg-canvas-soft p-3 rounded-lg mt-6 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white border border-hairline rounded-full flex items-center justify-center shrink-0 shadow-sm text-primary">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-mute font-bold uppercase tracking-wider leading-none">
              Top performer
            </p>
            <p className="text-xs font-bold text-primary mt-1">
              {topCourse}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
