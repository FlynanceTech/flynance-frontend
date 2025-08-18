import React from 'react'
import clsx from 'clsx'

interface SkeletonProps {
  type?: 'table' | 'box'
  rows?: number
  className?: string
}

export function Skeleton({ type = 'box', rows = 5, className = '' }: SkeletonProps) {
  if (type === 'table') {
    return (
      <div className="animate-pulse divide-y divide-gray-200">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center py-4 space-x-4">
            <div className="w-1/3 h-4 bg-gray-200 rounded" />
            <div className="w-1/5 h-4 bg-gray-200 rounded" />
            <div className="w-1/5 h-4 bg-gray-200 rounded" />
            <div className="w-1/6 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // skeleton genérico tipo box
  return (
    <div className={clsx('animate-pulse space-y-4', className)}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="w-full h-4 bg-gray-200 rounded" />
      ))}
    </div>
  )
}
