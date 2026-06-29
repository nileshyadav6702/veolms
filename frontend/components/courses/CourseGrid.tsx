import CourseCard, { Course } from './CourseCard'

interface Props {
  courses: Course[]
  loading?: boolean
  cols?: 3 | 4 | 5
  hrefPrefix?: string
  purchasedCourseIds?: string[]
}

export default function CourseGrid({
  courses,
  loading = false,
  cols = 3,
  hrefPrefix = '/courses',
  purchasedCourseIds = [],
}: Props) {
  const colClass = {
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }[cols]

  if (loading) {
    return (
      <div className={`grid ${colClass} gap-5`}>
        {Array.from({ length: cols * 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-video bg-gray-100" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid ${colClass} gap-5`}>
      {courses.map((course, i) => (
        <CourseCard
          key={course._id}
          course={course}
          index={i}
          hrefPrefix={hrefPrefix}
          isPurchased={purchasedCourseIds.includes(course._id)}
        />
      ))}
    </div>
  )
}
