'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  const renderPageNumbers = () => {
    const pages = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)

    if (start > 1) {
      pages.push(
        <button key={1} onClick={() => onChange(1)} className={btnClass(1)}>
          1
        </button>
      )
      if (start > 2) pages.push(<span key="start-ellipsis">...</span>)
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button key={i} onClick={() => onChange(i)} className={btnClass(i)}>
          {i}
        </button>
      )
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<span key="end-ellipsis">...</span>)
      pages.push(
        <button key={totalPages} onClick={() => onChange(totalPages)} className={btnClass(totalPages)}>
          {totalPages}
        </button>
      )
    }

    return pages
  }

  const btnClass = (page: number) =>
    clsx(
      'w-8 h-8 rounded-full text-sm font-medium transition cursor-pointer',
      page === currentPage
        ? 'bg-[#15B8A6] text-white'
        : 'text-gray-600 hover:text-[#15B8A6]'
    )

  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      <button
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        className="text-gray-500 hover:text-[#15B8A6] disabled:opacity-30 cursor-pointer"
        disabled={currentPage === 1}
      >
        <ChevronLeft size={18} />
      </button>

      {renderPageNumbers()}

      <button
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        className="text-gray-500 hover:text-[#15B8A6] disabled:opacity-30 cursor-pointer"
        disabled={currentPage === totalPages}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
