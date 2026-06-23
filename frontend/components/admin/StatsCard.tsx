'use client'

import { ReactNode } from 'react'
import Card from '@/components/ui/Card'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: {
    value: string
    positive: boolean
  }
}

export default function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
}: StatsCardProps) {
  return (
    <Card className="flex flex-col justify-between" padding="md">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
            {title}
          </span>
          <h3 className="text-3xl font-semibold text-gray-900 mt-2 tracking-tight">
            {value}
          </h3>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(description || trend) && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          {trend && (
            <span
              className={`font-semibold rounded px-1.5 py-0.5 ${
                trend.positive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {trend.value}
            </span>
          )}
          {description && <span className="font-medium">{description}</span>}
        </div>
      )}
    </Card>
  )
}
