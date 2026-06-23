import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export default function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={[
        'bg-white rounded-xl border border-gray-100',
        hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : '',
        paddings[padding],
        className,
      ].join(' ')}
      style={{
        boxShadow:
          '0px 1px 2px rgba(0,0,0,0.04), 0px 2px 8px rgba(0,0,0,0.06)',
      }}
      {...props}
    >
      {children}
    </div>
  )
}
