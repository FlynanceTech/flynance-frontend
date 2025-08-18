import { useTransactionFilter } from '@/stores/useFilter'
import { Search } from 'lucide-react'

export default function SearchBar() {
  const searchTerm = useTransactionFilter((s) => s.searchTerm)
  const setSearchTerm = useTransactionFilter((s) => s.setSearchTerm)

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 lg:min-w-56 w-full  rounded-full border border-[#E2E8F0] bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50">
      <input
        type="text"
        placeholder="Search"
        className="outline-none w-full bg-transparent"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Search size={16} />
    </div>
  )
}
