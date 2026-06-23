import React, { ReactNode } from 'react'
import Spinner from '@/components/ui/Spinner'

interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps {
  columns: Column[]
  loading?: boolean
  emptyMessage?: string
  children: ReactNode
  overflowVisible?: boolean
}

export default function DataTable({
  columns = [],
  loading = false,
  emptyMessage = 'No data records found.',
  children,
  overflowVisible = false,
}: DataTableProps) {
  return (
    <div className={`w-full bg-white border border-gray-100 rounded-xl shadow-sm ${overflowVisible ? 'overflow-visible z-10' : 'overflow-hidden'}`}>
      <div className={overflowVisible ? 'overflow-visible' : 'overflow-x-auto'}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3.5 font-mono text-[11px] font-bold text-gray-400 uppercase tracking-wider ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs text-gray-400 font-medium">
                      Loading data records...
                    </span>
                  </div>
                </td>
              </tr>
            ) : React.Children.count(children) > 0 ? (
              children
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-xs text-gray-400 font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
