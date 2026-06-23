'use client'

import { useState } from 'react'
import { Play, Lock, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import Badge from '@/components/ui/Badge'

export interface Lesson {
  _id: string
  courseId: string
  sectionId: string
  title: string
  description?: string
  videoKey: string
  duration: number
  order: number
  isPreview: boolean
  status: 'processing' | 'ready' | 'error'
}

export interface Section {
  _id: string
  title: string
  order: number
}

interface Props {
  sections: Section[]
  lessons: Lesson[]
  isEnrolled: boolean
  onLessonClick?: (lesson: Lesson) => void
  onPreviewClick?: (lesson: Lesson) => void
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  if (mins === 0) return `${seconds}s`
  return `${mins} min`
}

export default function CurriculumList({
  sections = [],
  lessons = [],
  isEnrolled,
  onLessonClick,
  onPreviewClick,
}: Props) {
  // Sort sections and lessons by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const getLessonsForSection = (sectionId: string) => {
    return lessons
      .filter((l) => l.sectionId === sectionId)
      .sort((a, b) => a.order - b.order)
  }

  // Open the first section by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (sortedSections.length > 0) {
      return { [sortedSections[0]._id]: true }
    }
    return {}
  })

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  return (
    <div className="space-y-3">
      {sortedSections.map((section, idx) => {
        const sectionLessons = getLessonsForSection(section._id)
        const isOpen = openSections[section._id]

        return (
          <div
            key={section._id}
            className="border border-gray-100 rounded-lg overflow-hidden bg-white shadow-sm"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section._id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                <span className="font-mono text-[11px] text-indigo-600 font-semibold tracking-wider uppercase">
                  Section {idx + 1}
                </span>
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                  {section.title}
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-medium">
                  {sectionLessons.length} {sectionLessons.length === 1 ? 'lesson' : 'lessons'}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Lessons List */}
            {isOpen && (
              <div className="divide-y divide-gray-50 border-t border-gray-100">
                {sectionLessons.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center italic">
                    No lessons in this section yet.
                  </div>
                ) : (
                  sectionLessons.map((lesson) => {
                    const isPlayable = isEnrolled || lesson.isPreview

                    return (
                      <div
                        key={lesson._id}
                        onClick={() => {
                          if (isEnrolled && onLessonClick) {
                            onLessonClick(lesson)
                          } else if (lesson.isPreview && onPreviewClick) {
                            onPreviewClick(lesson)
                          }
                        }}
                        className={`flex items-center justify-between p-4 text-sm transition-colors ${
                          isPlayable
                            ? 'hover:bg-indigo-50/20 cursor-pointer text-gray-900'
                            : 'text-gray-400 bg-gray-50/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 pr-4 min-w-0">
                          {isPlayable ? (
                            <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                              <Play className="w-3.5 h-3.5 fill-indigo-600" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center shrink-0">
                              <Lock className="w-3 h-3" />
                            </div>
                          )}
                          <span className="font-medium truncate">{lesson.title}</span>
                          {lesson.isPreview && !isEnrolled && (
                            <Badge variant="purple" className="shrink-0 text-[10px]">
                              Free Preview
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatDuration(lesson.duration)}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
